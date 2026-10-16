/**
 * Saneado de nombres de fichero para cabeceras HTTP.
 *
 * `document_files.original_name` lo controla el usuario que sube: si contuviera
 * `"` o CR/LF podría inyectar cabeceras en una respuesta `Content-Disposition`
 * (header injection). Se elimina todo lo que no sea imprimible seguro y se
 * construye siempre una disposición `attachment` con nombre entrecomillado.
 */

const UNSAFE = /[\u0000-\u001f\u007f"\\]/g;

/** Nombre seguro: sin caracteres de control, comillas ni barras; con respaldo si queda vacío. */
export function sanitizeFilename(name: string, fallback = 'document'): string {
  const cleaned = name
    .replace(UNSAFE, '')
    .replace(/[/\\]/g, '_')
    .trim()
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : fallback;
}

/** Cabecera `Content-Disposition: attachment` segura (RF-W-06). */
export function attachmentDisposition(originalName: string): string {
  return `attachment; filename="${sanitizeFilename(originalName)}"`;
}
