/**
 * Sesión SIWE (EIP-4361) — D-092, RF-W-01.
 *
 * Diseño:
 *  1. `POST /api/auth/nonce` crea una fila `rwa.sessions` con un nonce de un solo
 *     uso (10 min) y devuelve el mensaje SIWE ya formateado.
 *  2. El cliente firma ese mensaje con su wallet (EIP-191).
 *  3. `POST /api/auth/verify` valida `domain`/`uri`/`chainId`/nonce, recupera la
 *     dirección con `recoverMessageAddress` y **consume el nonce** (rota el valor y
 *     extiende la caducidad a 24 h). Emite una cookie `httpOnly` firmada con HMAC.
 *
 * La cookie nunca transporta la dirección: solo el `id` de la sesión + HMAC.
 * Cada petición autorizada revalida la firma de la cookie y el estado en la BD.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import { getAddress, recoverMessageAddress, type Hex } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';

import { getNetworkConfig } from '../config/index';
import { repos } from '../db/index';
import type { SessionRole } from '../db/types';
import { normalizeAddress } from '../db/address';
import { ConfigError, ForbiddenError, UnauthorizedError, ValidationError } from '../errors';

export const SESSION_COOKIE = 'rwa_session';
/** Validez del nonce sin firmar (ventana para que el usuario firme). */
export const NONCE_TTL_MS = 10 * 60 * 1000;
/** Validez de la sesión ya autenticada. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type SessionIdentity = {
  id: string;
  address: string;
  role: SessionRole;
  expiresAt: Date;
};

/** Secreto de firma de la cookie. Nunca vive en el repositorio (D-092/RT-W-08). */
export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.SIWE_SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new ConfigError(
      'SIWE_SESSION_SECRET no está definida o es demasiado corta (mínimo 32 caracteres). ' +
        'Debe proceder de Secret Manager (o de .env.local en desarrollo).',
    );
  }
  return secret;
}

function signSessionId(sessionId: string, secret: string): string {
  return createHmac('sha256', secret).update(sessionId).digest('hex');
}

/** `Set-Cookie` de sesión: httpOnly + SameSite=Strict + Secure (si HTTPS). */
export function serializeSessionCookie(sessionId: string, secret: string, secure: boolean): string {
  const value = `${sessionId}.${signSessionId(sessionId, secret)}`;
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** `Set-Cookie` de borrado. */
export function serializeClearCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const chunk of header.split(';')) {
    const [name, ...rest] = chunk.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

/** Devuelve el id de sesión si el HMAC es válido; `null` si está manipulado. */
export function verifySessionCookie(value: string, secret: string): string | null {
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;
  const sessionId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = signSessionId(sessionId, secret);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return sessionId;
}

/** Exige sesión válida; lanza `UnauthorizedError` (401) en cualquier otro caso. */
export async function requireSession(request: Request): Promise<SessionIdentity> {
  const secret = getSessionSecret();
  const raw = readSessionCookie(request);
  if (!raw) throw new UnauthorizedError('Sesión requerida');
  const sessionId = verifySessionCookie(raw, secret);
  if (!sessionId) throw new UnauthorizedError('Cookie de sesión inválida');
  const session = await repos.sessions.findActiveById(sessionId);
  if (!session) throw new UnauthorizedError('Sesión caducada o revocada');
  return {
    id: session.id,
    address: session.address,
    role: session.role,
    expiresAt: session.expires_at,
  };
}

/** Exige que la sesión corresponda a `address` (propiedad del recurso). */
export function requireOwner(identity: SessionIdentity, address: string, resource: string): void {
  if (identity.address !== address.toLowerCase()) {
    throw new ForbiddenError(`No autorizado sobre ${resource}`);
  }
}

/** Datos de sesión que se pueden devolver al cliente (sin id ni HMAC). */
export function publicSession(identity: SessionIdentity): {
  address: string;
  role: SessionRole;
  expiresAt: Date;
} {
  return { address: identity.address, role: identity.role, expiresAt: identity.expiresAt };
}

/** Recupera el firmante de un mensaje EIP-191. Lanza `ValidationError` si la firma está mal formada. */
export async function recoverSigner(message: string, signature: string): Promise<string> {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    throw new ValidationError('Firma inválida: se espera una firma de 65 bytes', 'signature');
  }
  return (await recoverMessageAddress({ message, signature: signature as Hex })).toLowerCase();
}

/**
 * Exige que `signature` sobre `message` corresponda a `expectedAddress` (RF-W-03/RF-W-04).
 * Es la verificación que faltaba en la aprobación de claims (HW-01).
 */
export async function requireSignature(
  message: string,
  signature: string,
  expectedAddress: string,
  resource: string,
): Promise<void> {
  const signer = await recoverSigner(message, signature);
  if (signer !== expectedAddress.toLowerCase()) {
    throw new ForbiddenError(`Firma no válida para ${resource}`);
  }
}

/** Rol provisional por wallet: `issuer` si está verificado en `rwa.issuers`; si no, `investor`. */
export async function resolveRole(address: string): Promise<SessionRole> {
  const issuer = await repos.issuers.findByAddress(address).catch(() => null);
  return issuer?.verified ? 'issuer' : 'investor';
}

export interface SiweChallenge {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export interface RequestOrigin {
  domain: string;
  uri: string;
  secure: boolean;
  ip: string | null;
}

/** Deriva dominio/uri/secure e IP a partir de la petición (soporta proxy de GCP). */
export function requestOrigin(request: Request): RequestOrigin {
  const url = new URL(request.url);
  const proto = (request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')).toLowerCase();
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? (forwardedFor.split(',')[0]?.trim() ?? null) : null;
  return { domain: host, uri: `${proto}://${host}`, secure: proto === 'https', ip };
}

/** Crea el nonce persistido y el mensaje EIP-4361 que debe firmar el usuario. */
export async function createChallenge(
  address: string,
  origin: RequestOrigin,
  userAgent: string | null,
): Promise<SiweChallenge> {
  const network = getNetworkConfig();
  const normalized = normalizeAddress(address, 'address');
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await repos.sessions.create({
    address: normalized,
    nonce,
    role: 'investor',
    expiresAt,
    userAgent,
    ip: origin.ip,
  });

  const message = createSiweMessage({
    address: getAddress(normalized),
    chainId: network.chainId,
    domain: origin.domain,
    nonce,
    uri: origin.uri,
    version: '1',
    statement: 'Autenticación en la plataforma RWA',
    issuedAt: new Date(),
    expirationTime: expiresAt,
  });

  return { nonce, message, expiresAt };
}

/**
 * Verifica el mensaje firmado y emite la sesión.
 * Lanza `UnauthorizedError`/`ValidationError` si algo no cuadra.
 */
export async function verifyChallenge(
  message: string,
  signature: string,
  origin: RequestOrigin,
): Promise<{ sessionId: string; address: string; role: SessionRole; expiresAt: Date }> {
  const parsed = parseSiweMessage(message);
  if (!parsed.address || !parsed.nonce) {
    throw new ValidationError('Mensaje SIWE inválido');
  }
  const network = getNetworkConfig();
  if (parsed.domain !== origin.domain) {
    throw new ValidationError('El dominio del mensaje no coincide con el de la aplicación');
  }
  if (parsed.uri !== origin.uri) {
    throw new ValidationError('El uri del mensaje no coincide con el de la aplicación');
  }
  if (parsed.chainId !== network.chainId) {
    throw new ValidationError(`El chainId del mensaje debe ser ${network.chainId}`);
  }

  const address = parsed.address.toLowerCase();
  const pending = await repos.sessions.findByNonce(parsed.nonce);
  if (!pending) throw new UnauthorizedError('Nonce desconocido o ya utilizado');
  if (pending.address !== address) throw new UnauthorizedError('El nonce no corresponde a esa dirección');
  if (pending.revoked_at) throw new UnauthorizedError('Nonce revocado');
  if (pending.expires_at.getTime() <= Date.now()) throw new UnauthorizedError('Nonce caducado');

  const recovered = await recoverSigner(message, signature);
  if (recovered !== address) throw new UnauthorizedError('Firma inválida');

  const role = await resolveRole(address);
  const session = await repos.sessions.consumeNonce(parsed.nonce, {
    newNonce: generateSiweNonce(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    role,
  });
  if (!session) throw new UnauthorizedError('Nonce ya consumido');

  return {
    sessionId: session.id,
    address: session.address,
    role: session.role,
    expiresAt: session.expires_at,
  };
}

export { generateSiweNonce };
