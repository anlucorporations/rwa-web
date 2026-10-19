import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  KYC_ENCRYPTION_ALGO,
  decryptDocument,
  encryptDocument,
  getKycEncryptionKey,
  hashesEqual,
} from './kyc-crypto';
import { ConfigError } from '../errors';

const HEX_KEY = 'a'.repeat(64);

describe('cifrado KYC AES-256-GCM (O5.4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cifra y descifra un documento manteniendo el contenido original', () => {
    const key = Buffer.from(HEX_KEY, 'hex');
    const plain = Buffer.from('documento KYC de prueba — ñandú', 'utf8');

    const encrypted = encryptDocument(plain, key);
    expect(encrypted.algo).toBe(KYC_ENCRYPTION_ALGO);
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.content.length).toBeGreaterThan(plain.length);

    const decrypted = decryptDocument(
      {
        content: encrypted.content,
        encryptionAlgo: encrypted.algo,
        encryptionNonce: encrypted.nonce,
      },
      key,
    );
    expect(decrypted.equals(plain)).toBe(true);
  });

  it('usa un nonce distinto en cada cifrado', () => {
    const key = Buffer.from(HEX_KEY, 'hex');
    const plain = Buffer.from('mismo contenido', 'utf8');
    const a = encryptDocument(plain, key);
    const b = encryptDocument(plain, key);
    expect(a.nonce.equals(b.nonce)).toBe(false);
    expect(a.content.equals(b.content)).toBe(false);
  });

  it('falla al descifrar con otra clave (authTag de GCM)', () => {
    const key = Buffer.from(HEX_KEY, 'hex');
    const otherKey = Buffer.from('b'.repeat(64), 'hex');
    const encrypted = encryptDocument(Buffer.from('secreto'), key);

    expect(() =>
      decryptDocument(
        {
          content: encrypted.content,
          encryptionAlgo: encrypted.algo,
          encryptionNonce: encrypted.nonce,
        },
        otherKey,
      ),
    ).toThrow();
  });

  it('mantiene compatibilidad con filas antiguas sin cifrar', () => {
    const plain = Buffer.from('legacy');
    expect(decryptDocument({ content: plain, encryptionAlgo: 'none' })).toBe(plain);
  });

  it('rechaza algoritmos desconocidos y nonces inválidos', () => {
    expect(() => decryptDocument({ content: Buffer.from('x'), encryptionAlgo: 'ROT13' })).toThrow(
      ConfigError,
    );
    expect(() =>
      decryptDocument({ content: Buffer.from('x'), encryptionAlgo: KYC_ENCRYPTION_ALGO }),
    ).toThrow(ConfigError);
  });

  it('lee la clave del entorno en hex o base64 y falla si no está', () => {
    vi.stubEnv('KYC_ENCRYPTION_KEY', HEX_KEY);
    expect(getKycEncryptionKey().equals(Buffer.from(HEX_KEY, 'hex'))).toBe(true);

    const base64Key = Buffer.alloc(32, 7).toString('base64');
    vi.stubEnv('KYC_ENCRYPTION_KEY', base64Key);
    expect(getKycEncryptionKey()).toHaveLength(32);

    vi.stubEnv('KYC_ENCRYPTION_KEY', 'corta');
    expect(() => getKycEncryptionKey()).toThrow(ConfigError);

    vi.stubEnv('KYC_ENCRYPTION_KEY', '');
    expect(() => getKycEncryptionKey()).toThrow(ConfigError);
  });

  it('compara hashes en tiempo constante', () => {
    const a = Buffer.from('abc');
    expect(hashesEqual(a, Buffer.from('abc'))).toBe(true);
    expect(hashesEqual(a, Buffer.from('abd'))).toBe(false);
    expect(hashesEqual(a, Buffer.from('abcd'))).toBe(false);
  });
});
