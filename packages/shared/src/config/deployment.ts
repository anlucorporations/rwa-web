/**
 * Carga del artefacto de despliegue de `rwa-sc` (RF-W-09).
 *
 * Las direcciones de los contratos **no** se escriben a mano en el código: proceden
 * de `sc/deployments/<chainId>-<timestamp>.json`, referenciado por
 * `NEXT_PUBLIC_DEPLOYMENT_JSON`. La ruta se resuelve primero contra el cwd de la app
 * y, si no existe, contra la raíz del workspace (donde vive `pnpm-workspace.yaml`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { ConfigError } from '../errors';
import { CANONICAL_CHAIN_ID } from './index';

export type DeploymentArtifact = {
  chainId: number;
  block?: number;
  timestamp?: string;
  contracts: Record<string, string>;
};

let cachedRoot: string | null = null;
let cachedDeployment: DeploymentArtifact | null = null;

/** Raíz del monorepo: primer directorio ascendente con `pnpm-workspace.yaml`. */
export function findWorkspaceRoot(start: string = process.cwd()): string {
  if (cachedRoot) return cachedRoot;
  let dir = resolve(start);
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      cachedRoot = dir;
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  cachedRoot = resolve(start);
  return cachedRoot;
}

export function loadDeployment(env: NodeJS.ProcessEnv = process.env): DeploymentArtifact {
  if (cachedDeployment) return cachedDeployment;

  const reference = env.NEXT_PUBLIC_DEPLOYMENT_JSON;
  if (!reference) {
    throw new ConfigError('NEXT_PUBLIC_DEPLOYMENT_JSON no está definida (artefacto de despliegue de rwa-sc)');
  }

  const candidates = isAbsolute(reference)
    ? [reference]
    : [resolve(process.cwd(), reference), resolve(findWorkspaceRoot(), reference)];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new ConfigError(`No se encontró el artefacto de despliegue "${reference}" (probado en ${candidates.join(', ')})`);
  }

  let parsed: DeploymentArtifact;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as DeploymentArtifact;
  } catch (error) {
    throw new ConfigError(`Artefacto de despliegue ilegible: ${path}`, { cause: error });
  }
  if (parsed.chainId !== CANONICAL_CHAIN_ID) {
    throw new ConfigError(
      `El artefacto ${path} declara chainId ${parsed.chainId}; se esperaba ${CANONICAL_CHAIN_ID} (D-096)`,
    );
  }
  if (!parsed.contracts || typeof parsed.contracts !== 'object') {
    throw new ConfigError(`El artefacto ${path} no contiene el mapa "contracts"`);
  }

  cachedDeployment = parsed;
  return parsed;
}

/** Dirección de un contrato por nombre (p. ej. `TrustedIssuersRegistry`). */
export function getContractAddress(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const address = loadDeployment(env).contracts[name];
  if (!address) {
    throw new ConfigError(`El contrato "${name}" no está en el artefacto de despliegue`);
  }
  return address;
}

/** Solo para pruebas: limpia las cachés de módulo. */
export function resetDeploymentCache(): void {
  cachedRoot = null;
  cachedDeployment = null;
}
