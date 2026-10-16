/**
 * `@rwa/shared` — base común de la etapa @web.
 *
 * - `@rwa/shared/config`  → configuración única de red y servidor (RF-W-08)
 * - `@rwa/shared/db`      → capa de datos PostgreSQL (RT-W-07)
 * - `@rwa/shared/errors`  → errores tipados (RF-W-13)
 * - `@rwa/shared/logging` → logger estructurado (RT-W-10)
 */

export * from './config/index.js';
export * from './errors.js';
export * from './logging/index.js';
export * from './db/index.js';
export * from './api/serializers.js';
