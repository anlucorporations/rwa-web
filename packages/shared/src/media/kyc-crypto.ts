/**
 * Cifrado de documentos KYC (O5.4, D-093/D-095/D-098).
 *
 * AES-256-GCM sobre el binario de `rwa.document_files.content`:
 * - clave de 32 bytes en `KYC_ENCRYPTION_KEY` (hex de 64 caracteres o base64),
 * - IV aleatorio de 12 bytes en `encryption_nonce`,
 * - ciphertext + authTag (16 bytes al final) en `content`,
 * - `sha256` y `size_bytes` siguen siendo del **texto plano** (integridad y
 *   `Content-Length` de la descarga).
 *
 * Compatibilidad: las filas antiguas con `encryption_algo = 'none'` se devuelven tal cual.
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

import { ConfigError } from '../errors';

export const KYC_ENCRYPTION_ALGO = 'AES-256-GCM' as const;
export const KYC_PLAINTEXT_ALGO = 'none' as const;

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64');
  if (key.length !== 32) {
    throw new ConfigError(
      'KYC_ENCRYPTION_KEY inválida: debe ser 32 bytes en hex (64 caracteres) o base64',
    );
  }
  return key;
}

/** Clave AES-256-GCM desde el entorno (fail-closed: sin clave no se cifra). */
export function getKycEncryptionKey(): Buffer {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (!raw) {
    throw new ConfigError(
      'KYC_ENCRYPTION_KEY no está configurada; no se pueden cifrar/descifrar documentos KYC.',
    );
  }
  return decodeKey(raw);
}

export type EncryptedDocument = {
  content: Buffer;
  nonce: Buffer;
  algo: typeof KYC_ENCRYPTION_ALGO;
};

/** Cifra el contenido de un documento KYC. */
export function encryptDocument(plain: Buffer, key: Buffer = getKycEncryptionKey()): EncryptedDocument {
  const nonce = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    content: Buffer.concat([ciphertext, authTag]),
    nonce,
    algo: KYC_ENCRYPTION_ALGO,
  };
}

/**
 * Descifra un documento KYC. Si la fila es anterior a O5.4 (`'none'`) devuelve el
 * contenido sin tocar; cualquier otro algoritmo se rechaza.
 */
export function decryptDocument(
  input: { content: Buffer; encryptionAlgo: string; encryptionNonce?: Buffer | null },
  key?: Buffer,
): Buffer {
  if (input.encryptionAlgo === KYC_PLAINTEXT_ALGO) {
    return input.content;
  }
  if (input.encryptionAlgo !== KYC_ENCRYPTION_ALGO) {
    throw new ConfigError(`Algoritmo de cifrado no soportado: ${input.encryptionAlgo}`);
  }
  if (!input.encryptionNonce || input.encryptionNonce.length !== IV_BYTES) {
    throw new ConfigError('Documento cifrado sin nonce válido');
  }
  if (input.content.length < AUTH_TAG_BYTES) {
    throw new ConfigError('Documento cifrado corrupto (sin authTag)');
  }

  const ciphertext = input.content.subarray(0, input.content.length - AUTH_TAG_BYTES);
  const authTag = input.content.subarray(input.content.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key ?? getKycEncryptionKey(), input.encryptionNonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** Comparación en tiempo constante para hashes (evita fugas por timing). */
export function hashesEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
