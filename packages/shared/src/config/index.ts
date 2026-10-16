/**
 * Configuración única de red y de servicios (RF-W-08, D-091/D-096, D-101).
 *
 * REGLA: ninguna app debe contener literales de red (`0x…`, `localhost:`,
 * `http://`). Todo se lee de aquí, y aquí se valida al arranque.
 *
 * Red canónica: **Anvil de GCP, chain 31337** (D-096). Un `chainId` distinto es
 * un error de configuración, no una advertencia.
 */

import { ConfigError } from '../errors';

/** Chain canónico del frontend (Anvil de GCP). */
export const CANONICAL_CHAIN_ID = 31337;

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  /** Ruta al artefacto de despliegue de `rwa-sc` (fuente de direcciones, RF-W-09). */
  deploymentJson?: string;
}

export interface ServerConfig {
  databaseUrl: string;
  logLevel: string;
  /** 1 solo en entorno local: habilita las rutas `/api/test-*` (RF-W-07). */
  allowDebugEndpoints: boolean;
}

function readNetworkConfig(env: NodeJS.ProcessEnv): NetworkConfig {
  const chainIdRaw = env.NEXT_PUBLIC_CHAIN_ID;
  const rpcUrl = env.NEXT_PUBLIC_RPC_URL;

  const chainId = chainIdRaw === undefined ? CANONICAL_CHAIN_ID : Number(chainIdRaw);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new ConfigError(`NEXT_PUBLIC_CHAIN_ID inválido: "${chainIdRaw}"`);
  }
  if (chainId !== CANONICAL_CHAIN_ID) {
    throw new ConfigError(
      `chainId ${chainId} no es la red canónica (${CANONICAL_CHAIN_ID}). ` +
        'Ajusta NEXT_PUBLIC_CHAIN_ID o la configuración de la wallet (D-096).',
    );
  }
  if (!rpcUrl) {
    throw new ConfigError('NEXT_PUBLIC_RPC_URL no está definida (ver .env.example / scripts/gcp-env.sh)');
  }
  try {
    new URL(rpcUrl);
  } catch {
    throw new ConfigError(`NEXT_PUBLIC_RPC_URL no es una URL válida: "${rpcUrl}"`);
  }

  return {
    chainId,
    rpcUrl,
    deploymentJson: env.NEXT_PUBLIC_DEPLOYMENT_JSON,
  };
}

/** Valida y devuelve la configuración de red. Lanza `ConfigError` si no es la canónica. */
export function getNetworkConfig(env: NodeJS.ProcessEnv = process.env): NetworkConfig {
  return readNetworkConfig(env);
}

/** ¿Están habilitadas las rutas de depuración `/api/test-*`? (RF-W-07: solo local). */
export function debugEndpointsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_DEBUG_ENDPOINTS === '1';
}

/** Valida y devuelve la configuración de servidor (BD + logging). */
export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ConfigError(
      'DATABASE_URL no está definida. Usa `source scripts/gcp-env.sh --tcp` o copia .env.example a .env.local.',
    );
  }
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new ConfigError('DATABASE_URL debe ser una cadena de conexión PostgreSQL');
  }
  return {
    databaseUrl,
    logLevel: env.LOG_LEVEL ?? 'info',
    allowDebugEndpoints: env.ALLOW_DEBUG_ENDPOINTS === '1',
  };
}
