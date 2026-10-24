/**
 * Orquestación del indexer (H-12/H-21): recorre bloques en chunks, decodifica los
 * eventos del catálogo y persiste el lote + el punto de control.
 *
 * `syncOnce` es determinista e inyectable (store y fetcher) para poder testearla
 * sin red ni base de datos.
 */

import { decodeChainLog, eventRisk, type DecodedChainEvent } from './catalog';
import type { LogFetcher } from './logs';
import type { BatchMeta, EventStore, PersistableEvent } from './store';

export interface SyncOptions {
  indexerId: string;
  chainId: bigint;
  /** Bloque inicial; si falta, se reanuda desde `indexer_state.last_block + 1` (o 0). */
  fromBlock?: bigint;
  /** Bloque final (inclusive); nunca supera `latest - confirmations`. */
  toBlock?: bigint;
  chunkSize: bigint;
  confirmations: bigint;
  dryRun: boolean;
}

export interface SyncStats {
  startBlock: bigint;
  endBlock: bigint;
  chunks: number;
  events: number;
  highRisk: number;
}

type StorePort = Pick<EventStore, 'getLastBlock' | 'saveBatch'>;

export interface SyncDeps {
  store: StorePort;
  fetcher: LogFetcher;
  log: (message: string) => void;
}

export function toPersistable(event: DecodedChainEvent, chainId: bigint): PersistableEvent {
  return {
    chainId,
    blockNumber: event.blockNumber,
    blockHash: event.blockHash,
    txHash: event.txHash,
    logIndex: event.logIndex,
    address: event.address,
    contractType: event.contractType,
    eventName: event.eventName,
    args: event.args,
    removed: event.removed,
  };
}

export async function syncOnce(deps: SyncDeps, options: SyncOptions): Promise<SyncStats> {
  const latest = await deps.fetcher.getBlockNumber();
  const safeLatest = latest > options.confirmations ? latest - options.confirmations : 0n;

  let start = options.fromBlock;
  if (start === undefined) {
    const last = await deps.store.getLastBlock(options.indexerId);
    start = last === null ? 0n : last + 1n;
  }
  const end =
    options.toBlock !== undefined && options.toBlock < safeLatest ? options.toBlock : safeLatest;

  const stats: SyncStats = { startBlock: start, endBlock: end, chunks: 0, events: 0, highRisk: 0 };
  if (start > end) {
    deps.log(`[indexer] sin bloques nuevos (start=${start}, end=${end})`);
    return stats;
  }

  for (let from = start; from <= end; from += options.chunkSize) {
    const candidate = from + options.chunkSize - 1n;
    const chunkEnd = candidate > end ? end : candidate;
    const logs = await deps.fetcher.getLogs(from, chunkEnd);
    const decoded = logs
      .map((log) => decodeChainLog(log))
      .filter((event): event is DecodedChainEvent => event !== null);

    for (const event of decoded) {
      if (eventRisk(event.eventName, event.args) === 'high') stats.highRisk += 1;
    }

    if (!options.dryRun) {
      const meta: BatchMeta = { indexerId: options.indexerId, chainId: options.chainId, lastBlock: chunkEnd };
      await deps.store.saveBatch(
        decoded.map((event) => toPersistable(event, options.chainId)),
        meta,
      );
    }
    stats.events += decoded.length;
    stats.chunks += 1;
    deps.log(
      `[indexer] bloques ${from}-${chunkEnd}: ${decoded.length} eventos${options.dryRun ? ' (dry-run)' : ''}`,
    );
  }

  return stats;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
