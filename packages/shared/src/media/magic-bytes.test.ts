import { describe, expect, it } from 'vitest';

import {
  assertAllowedUpload,
  detectContentType,
  normalizeContentType,
} from './magic-bytes';
import { attachmentDisposition, sanitizeFilename } from './filename';

const PDF = Buffer.from('%PDF-1.7 contenido');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const DOC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe('validación por magic bytes (RF-W-05)', () => {
  it('detecta los tipos permitidos', () => {
    expect(detectContentType(PDF)).toBe('application/pdf');
    expect(detectContentType(JPEG)).toBe('image/jpeg');
    expect(detectContentType(PNG)).toBe('image/png');
    expect(detectContentType(DOC)).toBe('application/msword');
    expect(detectContentType(DOCX)).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('acepta el tipo declarado cuando coincide con el contenido', () => {
    expect(assertAllowedUpload(PDF, 'application/pdf')).toBe('application/pdf');
  });

  it('normaliza image/jpg a image/jpeg', () => {
    expect(normalizeContentType('image/jpg')).toBe('image/jpeg');
    expect(assertAllowedUpload(JPEG, 'image/jpg')).toBe('image/jpeg');
  });

  it('rechaza contenido que no cuadra con el tipo declarado', () => {
    expect(() => assertAllowedUpload(PNG, 'application/pdf')).toThrow(/no coincide/i);
  });

  it('rechaza contenido no reconocido', () => {
    expect(() => assertAllowedUpload(Buffer.from('hola'), 'application/pdf')).toThrow(
      /no reconocido/i,
    );
  });
});

describe('saneado de nombres (RF-W-06, header injection)', () => {
  it('elimina comillas y saltos de línea', () => {
    const name = sanitizeFilename('a"b\r\nX-Evil: 1.pdf');
    expect(name).not.toContain('"');
    expect(name).not.toContain('\r');
    expect(name).not.toContain('\n');
  });

  it('usa respaldo si queda vacío', () => {
    expect(sanitizeFilename('""')).toBe('document');
  });

  it('construye una disposición attachment segura', () => {
    const header = attachmentDisposition('contrato.pdf');
    expect(header).toBe('attachment; filename="contrato.pdf"');
    expect(header.split('"').length).toBe(3);
  });
});
