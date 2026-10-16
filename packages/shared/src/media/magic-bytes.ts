/**
 * Validación de documentos por *magic bytes* (RF-W-05).
 *
 * El tipo declarado por el cliente (`file.type`) no es fiable: se comprueba el
 * contenido real y se exige que coincida con la allowlist del esquema
 * (`document_files_mime_allowlist`).
 */

import { ValidationError } from '../errors';

export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const ZIP_MAGIC = Buffer.from([0x50, 0x4b]); // DOCX (contenedor ZIP)
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // DOC

/** Tipo MIME deducido del contenido, o `null` si no se reconoce. */
export function detectContentType(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= PNG_MAGIC.length && buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  if (buffer.length >= OLE_MAGIC.length && buffer.subarray(0, OLE_MAGIC.length).equals(OLE_MAGIC)) {
    return 'application/msword';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 2).equals(ZIP_MAGIC)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

/** Normaliza `image/jpg` (no estándar) a `image/jpeg`. */
export function normalizeContentType(declared: string): string {
  return declared === 'image/jpg' ? 'image/jpeg' : declared;
}

/**
 * Verifica que el contenido real es un tipo permitido y coincide con el declarado.
 * Devuelve el tipo normalizado; lanza `ValidationError` si no cuadra.
 */
export function assertAllowedUpload(buffer: Buffer, declaredType: string): string {
  const declared = normalizeContentType(declaredType);
  const detected = detectContentType(buffer);
  if (!detected) {
    throw new ValidationError('Tipo de fichero no reconocido (validación por magic bytes)', 'file');
  }
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(detected)) {
    throw new ValidationError(`Tipo de fichero no permitido: ${detected}`, 'file');
  }
  if (detected !== declared) {
    throw new ValidationError(
      `El contenido no coincide con el tipo declarado (declarado ${declared}, detectado ${detected})`,
      'file',
    );
  }
  return detected;
}
