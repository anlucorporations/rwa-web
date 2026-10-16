/**
 * Traducción de errores de PostgreSQL a errores tipados de la aplicación.
 *
 * Evita que una violación de restricción llegue a la ruta como un error crudo del
 * driver (RF-W-13) y permite responder 409/400 en vez de 500.
 */

import { ConflictError, ValidationError } from '../errors';

type PgErrorLike = { code?: string; detail?: string; constraint?: string };

function asPgError(error: unknown): PgErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as PgErrorLike) : null;
}

/** Lanza el error tipado correspondiente; si no lo reconoce, re-lanza el original. */
export function translatePgError(error: unknown, context?: string): never {
  const pg = asPgError(error);
  const prefix = context ? `${context}: ` : '';
  switch (pg?.code) {
    case '23505':
      throw new ConflictError(`${prefix}registro duplicado${pg.constraint ? ` (${pg.constraint})` : ''}`);
    case '23503':
      throw new ValidationError(`${prefix}referencia inexistente${pg.constraint ? ` (${pg.constraint})` : ''}`);
    case '23514':
      throw new ValidationError(`${prefix}restricción incumplida${pg.constraint ? ` (${pg.constraint})` : ''}`);
    case '22P02': // invalid_text_representation (uuid/numeric malformado)
      throw new ValidationError(`${prefix}formato inválido`);
    default:
      throw error;
  }
}
