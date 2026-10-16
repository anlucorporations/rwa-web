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
