/**
 * Respuestas HTTP tipadas y traducción de errores (RF-W-13 / RNF-W-04).
 *
 * Las rutas de las 3 apps comparten este contrato:
 *   éxito  → `{ success: true, data, ... }`
 *   error  → `{ success: false, message, code }` con el código de estado correcto.
 *
 * Nunca se devuelve `error.message` de una librería: solo mensajes propios
 * (`AppError`) o un genérico para lo inesperado.
 */

import { AppError } from '../errors';
import { getRequestId, logger, type RequestWithHeaders } from '../logging/index';

export type ApiErrorBody = {
  success: false;
  message: string;
  code: string;
  /** Correlación con el log del servidor (RF-W-16 / RT-W-10). */
  requestId?: string;
};

export type ErrorResponse = { status: number; body: ApiErrorBody };

export function toErrorResponse(error: unknown, request?: RequestWithHeaders): ErrorResponse {
  const requestId = request ? getRequestId(request) : undefined;
  const withRequestId = requestId ? { requestId } : {};

  if (error instanceof AppError) {
    if (error.httpStatus >= 500) {
      logger.error({ code: error.code, err: error, requestId }, error.message);
    }
    return {
      status: error.httpStatus,
      body: { success: false, message: error.message, code: error.code, ...withRequestId },
    };
  }
  logger.error({ err: error, requestId }, 'error no controlado');
  return {
    status: 500,
    body: {
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      ...withRequestId,
    },
  };
}

/** Cuerpo de éxito homogéneo. */
export function ok<T>(data: T, extra: Record<string, unknown> = {}): { success: true; data: T } & Record<string, unknown> {
  return { success: true, data, ...extra };
}
