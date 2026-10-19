/**
 * `@rwa/config` — configuración compartida del monorepo (O4.2).
 *
 * Contiene los presets de ESLint/TypeScript que consumen las 3 apps, para que
 * las reglas de calidad (no `console`, avisos del React Compiler, `any` como
 * aviso) y las opciones del compilador tengan una única fuente.
 */

export const APP_NAMES = ['identity', 'issuer', 'token'] as const;

export type AppName = (typeof APP_NAMES)[number];

/** Puertos de desarrollo por app (scripts raíz `dev:*`). */
export const APP_DEV_PORTS: Record<AppName, number> = {
  identity: 4001,
  issuer: 4002,
  token: 4003,
};
