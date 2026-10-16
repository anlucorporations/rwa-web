/**
 * Gate reproducible de validación de documentos (O1.4).
 *
 *   pnpm --filter @rwa/shared check:media
 *
 * Comprueba la detección por *magic bytes* y el saneado de `Content-Disposition`
 * sin necesidad de base de datos ni servidor.
 */

import { assertAllowedUpload, detectContentType } from '../src/media/magic-bytes';
import { attachmentDisposition, sanitizeFilename } from '../src/media/filename';

const PDF = Buffer.from('%PDF-1.7 contenido de prueba');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`✗ ${name}: ${(error as Error).message}`);
    failed += 1;
  }
}

function expectThrow(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✗ ${name} (no lanzó)`);
    failed += 1;
  } catch {
    console.log(`✓ ${name}`);
    passed += 1;
  }
}

check('PDF detectado', () => {
  if (detectContentType(PDF) !== 'application/pdf') throw new Error('no detectado');
});
check('PNG detectado', () => {
  if (detectContentType(PNG) !== 'image/png') throw new Error('no detectado');
});
check('DOCX detectado', () => {
  const expected = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (detectContentType(DOCX) !== expected) throw new Error('no detectado');
});
check('PDF declarado como PDF → permitido', () => {
  assertAllowedUpload(PDF, 'application/pdf');
});
check('image/jpg se normaliza a image/jpeg', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assertAllowedUpload(jpeg, 'image/jpg');
});
expectThrow('PNG declarado como PDF → rechazado', () => assertAllowedUpload(PNG, 'application/pdf'));
expectThrow('contenido no reconocido → rechazado', () => assertAllowedUpload(Buffer.from('hola'), 'application/pdf'));
check('Content-Disposition sin inyección de cabeceras', () => {
  const header = attachmentDisposition('a"b\r\nX-Evil: 1.pdf');
  if (header.includes('\r') || header.includes('\n')) throw new Error('CR/LF presente');
  if (header.split('"').length !== 3) throw new Error(`comillas inseguras: ${header}`);
  if (!header.startsWith('attachment; filename="')) throw new Error(header);
});
check('nombre vacío → respaldo', () => {
  if (sanitizeFilename('""') !== 'document') throw new Error('sin respaldo');
});

console.log(`\n${passed} pasan, ${failed} fallan`);
process.exit(failed === 0 ? 0 : 1);
