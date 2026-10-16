/**
 * Informe de salud de una app (O0.5 / RT-W-09).
 *
 * Consume y **valida** la configuración de red al atreverse a usarla (`getNetworkConfig`
 * exige el chainId canónico 31337) y comprueba el pool de PostgreSQL (`SELECT 1`).
 * Sirve como healthcheck HTTP para O5 y como evidencia de que la app lee la
 * configuración compartida en tiempo de ejecución.
 */

import { getNetworkConfig } from '../config/index';
import { ServiceUnavailableError } from '../errors';
import { ping } from '../db/pool';

export type HealthReport = {
  status: 'ok';
  chainId: number;
  rpcUrl: string;
  database: 'ok';
};

export async function buildHealthReport(): Promise<HealthReport> {
  const network = getNetworkConfig();
  try {
    await ping();
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error;
    throw new ServiceUnavailableError('PostgreSQL no responde al healthcheck', { cause: error });
  }
  return {
    status: 'ok',
    chainId: network.chainId,
    rpcUrl: network.rpcUrl,
    database: 'ok',
  };
}
