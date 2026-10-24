/**
 * Logger estructurado (RT-W-10 / RF-W-16).
 *
 * `pino` con nivel por `LOG_LEVEL`. Es el único punto del paquete compartido que
 * toca la salida; las apps deben usar `logger` en lugar de `console.log`.
 * Solo se importa desde código de servidor (Node), nunca desde componentes cliente.
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;

/** Cabecera de correlación de peticiones (RF-W-16 / RT-W-10). */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Interfaz mínima de una petición con cabeceras: la cumplen tanto el
 * `Request`/`NextRequest` del servidor como la `Request` estándar web.
 */
export type RequestWithHeaders = { headers: { get(name: string): string | null } };

/** Devuelve el `requestId` propagado por el middleware, si existe. */
export function getRequestId(request: RequestWithHeaders): string | undefined {
  return request.headers.get(REQUEST_ID_HEADER) ?? undefined;
}
