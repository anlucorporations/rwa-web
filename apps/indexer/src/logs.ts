/**
 * Lectura de logs on-chain vía `eth_getLogs` (H-12/H-21).
 *
 * Interfaz inyectable (`LogFetcher`) para poder testear la orquestación sin red.
 */

import { createPublicClient, http, type Log } from 'viem';

export interface LogFetcher {
  /** Altura actual de la cadena. */
  getBlockNumber(): Promise<bigint>;
  /** chainId del RPC (para validar la configuración). */
  getChainId(): Promise<bigint>;
  /** Logs en el rango [fromBlock, toBlock] (sin filtro de dirección: se decodifica por firma). */
  getLogs(fromBlock: bigint, toBlock: bigint): Promise<Log[]>;
}

export function createRpcLogFetcher(rpcUrl: string): LogFetcher {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return {
    getBlockNumber: () => client.getBlockNumber(),
    getChainId: async () => BigInt(await client.getChainId()),
    async getLogs(fromBlock, toBlock) {
      return client.getLogs({ fromBlock, toBlock });
    },
  };
}
