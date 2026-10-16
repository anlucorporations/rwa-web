/**
 * Errores tipados de la capa compartida.
 *
 * Base para RF-W-13 / RNF-W-04: las rutas de API deben poder distinguir un fallo
 * de dependencia (503) de una validación (400), un conflicto (409) o un recurso
 * ausente (404) sin exponer `error.message` de librería al cliente.
 */

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Configuración ausente o inválida (fail-fast al arranque). */
export class ConfigError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('CONFIG_ERROR', message, 500, options);
  }
}

/** Entrada inválida (se traduce a 400/422 en la ruta). */
export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, 400);
    this.field = field;
  }
}

/** Recurso inexistente (404). */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} no encontrado: ${id}`, 404);
  }
}

/** Conflicto de unicidad o de estado (409). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

/** Falta de sesión válida (401, D-092/RF-W-01). */
export class UnauthorizedError extends AppError {
  constructor(message = 'Sesión requerida') {
    super('UNAUTHORIZED', message, 401);
  }
}

/** Sesión válida pero sin permiso sobre el recurso (403, RF-W-02). */
export class ForbiddenError extends AppError {
  constructor(message = 'No autorizado sobre este recurso') {
    super('FORBIDDEN', message, 403);
  }
}

/** Dependencia caída: PostgreSQL o el RPC (503, RNF-W-04). */
export class ServiceUnavailableError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('SERVICE_UNAVAILABLE', message, 503, options);
  }
}
