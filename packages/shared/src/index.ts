/**
 * `@rwa/shared` — base común de la etapa @web.
 *
 * - `@rwa/shared/config`  → configuración única de red y servidor (RF-W-08)
 * - `@rwa/shared/db`      → capa de datos PostgreSQL (RT-W-07)
 * - `@rwa/shared/errors`  → errores tipados (RF-W-13)
 * - `@rwa/shared/logging` → logger estructurado (RT-W-10)
 */

export * from './config/index';
export * from './config/deployment';
export * from './errors';
export * from './logging/index';
export * from './db/index';
export * from './api/serializers';
export * from './api/http';
export * from './api/health';
