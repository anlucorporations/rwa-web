/**
 * Utilidades de dirección Ethereum.
 *
 * El esquema PostgreSQL `rwa` exige direcciones en minúsculas (`^0x[0-9a-f]{40}$`)
 * mediante CHECK. Normalizamos aquí para no repetirlo en cada repositorio.
 */

import { ValidationError } from '../errors';

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export function isAddress(value: unknown): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(value.toLowerCase());
}

/** Normaliza a minúsculas y valida; lanza `ValidationError` si no es una address. */
export function normalizeAddress(value: unknown, field = 'address'): string {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value.toLowerCase())) {
    throw new ValidationError(`Dirección inválida en "${field}"`, field);
  }
  return value.toLowerCase();
}

/** Normaliza sin lanzar (para filtros opcionales); devuelve `undefined` si es inválida o vacía. */
export function normalizeAddressOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value.toLowerCase())) return undefined;
  return value.toLowerCase();
}
