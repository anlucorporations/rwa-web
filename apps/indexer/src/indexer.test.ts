import { describe, expect, it } from 'vitest';
import { encodeAbiParameters, encodeEventTopics, type Log } from 'viem';
import { TokenCloneableAbi } from '@rwa/shared/contracts';

import { syncOnce, type SyncOptions } from './indexer';
import type { LogFetcher } from './logs';
import type { BatchMeta, EventStore, PersistableEvent } from './store';

const TOKEN = '0x7d5dC0378b776A63D479869d22711df1b20672c9';
const ALICE = '0x1111111111111111111111111111111111111111';
const BOB = '0x2222222222222222222222222222222222222222';
const ZERO = '0x0000000000000000000000000000000000000000';

type StorePort = Pick<EventStore, 'getLastBlock' | 'saveBatch'>;

function fakeStore(lastBlock: bigint | null): { store: StorePort; batches: BatchMeta[] } {
  const batches: BatchMeta[] = [];
  return {
    store: {
      getLastBlock: async () => lastBlock,
      saveBatch: async (events: readonly PersistableEvent[], meta: BatchMeta) => {
        batches.push(meta);
        return events.length;
      },
    },
    batches,
  };
}

function fetcher(blockNumber: bigint, logsByChunk: Record<string, Log[]> = {}): LogFetcher {
  return {
    getBlockNumber: async () => blockNumber,
    getChainId: async () => 31337n,
    getLogs: async (from, to) => {
      const key = `${from}-${to}`;
      return logsByChunk[key] ?? [];
    },
  };
}

function baseOptions(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    indexerId: 'test',
    chainId: 31337n,
    chunkSize: 4n,
    confirmations: 0n,
    dryRun: false,
    ...overrides,
  };
}

function transferLog(from: string, to: string, value: bigint, blockNumber: bigint): Log {
  const topics = encodeEventTopics({
    abi: TokenCloneableAbi,
    eventName: 'Transfer',
    args: { from: from as `0x${string}`, to: to as `0x${string}` },
  } as never) as [`0x${string}`, ...`0x${string}`[]];
  return {
    address: TOKEN,
    topics,
    data: encodeAbiParameters([{ type: 'uint256' }], [value]),
    blockNumber,
    blockHash: `0x${'ab'.repeat(32)}`,
    transactionHash: `0x${'cd'.repeat(32)}`,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  } as unknown as Log;
}

const noopLog = () => {};

describe('syncOnce', () => {
  it('recorre por chunks y avanza el punto de control hasta el bloque seguro', async () => {
    const { store, batches } = fakeStore(null);
    const stats = await syncOnce(
      { store, fetcher: fetcher(10n), log: noopLog },
      baseOptions({ fromBlock: 0n }),
    );
    expect(stats.chunks).toBe(3); // 0-3, 4-7, 8-10
    expect(batches.map((meta) => meta.lastBlock)).toEqual([3n, 7n, 10n]);
    expect(stats.events).toBe(0);
  });

  it('reanuda desde indexer_state + 1', async () => {
    const { store, batches } = fakeStore(5n);
    const stats = await syncOnce({ store, fetcher: fetcher(9n), log: noopLog }, baseOptions({ chunkSize: 10n }));
    expect(stats.startBlock).toBe(6n);
    expect(batches.map((meta) => meta.lastBlock)).toEqual([9n]);
  });

  it('respeta las confirmaciones', async () => {
    const { store } = fakeStore(null);
    const stats = await syncOnce(
      { store, fetcher: fetcher(10n), log: noopLog },
      baseOptions({ fromBlock: 0n, chunkSize: 10n, confirmations: 3n }),
    );
    expect(stats.endBlock).toBe(7n);
  });

  it('respeta --to aunque haya bloques más nuevos', async () => {
    const { store } = fakeStore(null);
    const stats = await syncOnce(
      { store, fetcher: fetcher(100n), log: noopLog },
      baseOptions({ fromBlock: 0n, toBlock: 5n, chunkSize: 10n }),
    );
    expect(stats.endBlock).toBe(5n);
  });

  it('en dry-run no persiste nada', async () => {
    const { store, batches } = fakeStore(null);
    const stats = await syncOnce(
      { store, fetcher: fetcher(10n), log: noopLog },
      baseOptions({ fromBlock: 0n, dryRun: true }),
    );
    expect(stats.chunks).toBe(3);
    expect(batches).toHaveLength(0);
  });

  it('decodifica eventos reales y cuenta el riesgo alto', async () => {
    const { store, batches } = fakeStore(null);
    const logs = {
      '0-3': [
        transferLog(ALICE, BOB, 5n, 1n),
        transferLog(ZERO, BOB, 10n, 2n), // mint → riesgo alto
      ],
    };
    const stats = await syncOnce(
      { store, fetcher: fetcher(3n, logs), log: noopLog },
      baseOptions({ fromBlock: 0n }),
    );
    expect(stats.events).toBe(2);
    expect(stats.highRisk).toBe(1);
    expect(batches).toHaveLength(1);
  });

  it('no hace nada si no hay bloques nuevos', async () => {
    const { store, batches } = fakeStore(10n);
    const stats = await syncOnce({ store, fetcher: fetcher(10n), log: noopLog }, baseOptions());
    expect(stats.chunks).toBe(0);
    expect(batches).toHaveLength(0);
  });
});
