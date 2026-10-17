import { describe, expect, it } from 'vitest';

import { ConfigError } from '../errors';
import {
  getSessionSecret,
  readSessionCookie,
  serializeClearCookie,
  serializeSessionCookie,
  verifySessionCookie,
} from './index';

const SECRET = 's'.repeat(40);
const SESSION_ID = '11111111-2222-3333-4444-555555555555';

function cookieValue(setCookie: string): string {
  const pair = setCookie.split(';')[0];
  return pair.slice(pair.indexOf('=') + 1);
}

describe('cookie de sesión SIWE (D-092, RF-W-01)', () => {
  it('firma la cookie con HMAC y la marca httpOnly/SameSite=Strict', () => {
    const setCookie = serializeSessionCookie(SESSION_ID, SECRET, false);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).not.toContain('Secure');
    expect(setCookie.startsWith(`rwa_session=${SESSION_ID}.`)).toBe(true);
    expect(cookieValue(setCookie).split('.')[1]).toHaveLength(64);
  });

  it('añade Secure en HTTPS', () => {
    expect(serializeSessionCookie(SESSION_ID, SECRET, true)).toContain('Secure');
  });

  it('verifica la cookie y devuelve el id de sesión', () => {
    const value = cookieValue(serializeSessionCookie(SESSION_ID, SECRET, false));
    expect(verifySessionCookie(value, SECRET)).toBe(SESSION_ID);
  });

  it('rechaza una cookie manipulada', () => {
    const value = cookieValue(serializeSessionCookie(SESSION_ID, SECRET, false));
    const tampered = `${SESSION_ID}.${'0'.repeat(64)}`;
    expect(verifySessionCookie(tampered, SECRET)).toBeNull();
    expect(verifySessionCookie(value, `${SECRET}x`)).toBeNull();
    expect(verifySessionCookie('sin-separador', SECRET)).toBeNull();
  });

  it('genera una cookie de borrado', () => {
    const clear = serializeClearCookie(false);
    expect(clear).toContain('rwa_session=');
    expect(clear).toContain('Max-Age=0');
  });

  it('lee la cookie de la cabecera sin confundirla con otras', () => {
    const request = new Request('http://localhost/api/auth/session', {
      headers: { cookie: `otra=1; rwa_session=${SESSION_ID}.firma; otra2=2` },
    });
    expect(readSessionCookie(request)).toBe(`${SESSION_ID}.firma`);
    expect(readSessionCookie(new Request('http://localhost/'))).toBeNull();
  });
});

describe('secreto de sesión', () => {
  it('exige SIWE_SESSION_SECRET de al menos 32 caracteres (fail-closed)', () => {
    expect(() => getSessionSecret({})).toThrow(ConfigError);
    expect(() => getSessionSecret({ SIWE_SESSION_SECRET: 'corta' })).toThrow(ConfigError);
    expect(getSessionSecret({ SIWE_SESSION_SECRET: SECRET })).toBe(SECRET);
  });
});
