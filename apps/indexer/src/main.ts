#!/usr/bin/env node
/**
 * CLI del indexer off-chain (H-12/H-21).
 *
 * Uso:
 *   pnpm --filter @rwa/indexer start -- --once
 *   pnpm --filter @rwa/indexer start -- --loop
 *   pnpm --filter @rwa/indexer start -- --once --init --from 0   # crea esquema y hace backfill
 *   pnpm --filter @rwa/indexer start -- --once --dry-run --from 0 # sin persistir
 *
 * Requiere `DATABASE_URL` salvo `--dry-run`, y `RPC_URL`/`NEXT_PUBLIC_RPC_URL`.
 * Variables: INDEXER_ID, INDEXER_SCHEMA, INDEXER_FROM_BLOCK, INDEXER_CHAIN_ID,
 * INDEXER_CHUNK_SIZE, INDEXER_CONFIRMATIONS, INDEXER_POLL_INTERVAL_MS.
 */

import { loadConfig } from './config';
import { createRpcLogFetcher } from './logs';
import { createPostgresStore, type EventStore } from './store';
import { sleep, syncOnce } from './indexer';

interface CliArgs {
  once: boolean;
  loop: boolean;
  init: boolean;
  dryRun: boolean;
  fromBlock?: bigint;
  toBlock?: bigint;
  help: boolean;
}

function usage(): void {
  console.log(`Indexer off-chain RWA (H-12/H-21)

Uso: pnpm --filter @rwa/indexer start -- [opciones]

  --once              Procesa una vez (por defecto)
  --loop              Procesa en bucle (INDEXER_POLL_INTERVAL_MS)
  --init              Crea el esquema y las tablas si no existen (idempotente)
  --dry-run           No persiste en PostgreSQL (solo decodifica y cuenta)
  --from <bloque>     Bloque inicial (por defecto: reanudar desde indexer_state)
  --to <bloque>       Bloque final (por defecto: latest - confirmaciones)
  -h, --help          Esta ayuda`);
}

function parseBigIntArg(value: string, name: string): bigint {
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) throw new Error('negativo');
    return parsed;
  } catch {
    throw new Error(`${name} debe ser un entero >= 0 (recibido: '${value}')`);
  }
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { once: false, loop: false, init: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--':
        break; // separador que pnpm puede reenviar al script
      case '--once':
        args.once = true;
        break;
      case '--loop':
        args.loop = true;
        break;
      case '--init':
        args.init = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--from':
        i += 1;
        args.fromBlock = parseBigIntArg(argv[i] ?? '', '--from');
        break;
      case '--to':
        i += 1;
        args.toBlock = parseBigIntArg(argv[i] ?? '', '--to');
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`Opción desconocida: '${arg}' (usa --help)`);
    }
  }
  if (!args.once && !args.loop && !args.init && !args.help) args.once = true;
  return args;
}

function createDryRunStore(): Pick<EventStore, 'getLastBlock' | 'saveBatch'> {
  return {
    getLastBlock: async () => null,
    saveBatch: async () => 0,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const config = loadConfig({
    dryRun: args.dryRun,
    fromBlock: args.fromBlock,
  });
  if (args.init && !config.databaseUrl) {
    throw new Error('--init requiere DATABASE_URL');
  }

  const fetcher = createRpcLogFetcher(config.rpcUrl);
  const rpcChainId = await fetcher.getChainId();
  if (config.chainId !== undefined && config.chainId !== rpcChainId) {
    throw new Error(`INDEXER_CHAIN_ID=${config.chainId} != chainId del RPC (${rpcChainId})`);
  }
  const chainId = config.chainId ?? rpcChainId;

  let store: EventStore | null = null;
  if (!config.dryRun) {
    if (!config.databaseUrl) throw new Error('DATABASE_URL no definida');
    store = await createPostgresStore(config.databaseUrl, config.schema);
  }
  if (args.init) {
    if (!store) throw new Error('--init requiere acceso a PostgreSQL (no usar con --dry-run)');
    await store.init();
    console.log(`[indexer] esquema '${config.schema}' inicializado`);
    if (!args.once && !args.loop) {
      await store.close();
      return;
    }
  }

  const deps = {
    store: store ?? createDryRunStore(),
    fetcher,
    log: (message: string) => console.log(message),
  };
  const options = {
    indexerId: config.indexerId,
    chainId,
    fromBlock: config.fromBlock,
    toBlock: args.toBlock,
    chunkSize: config.chunkSize,
    confirmations: config.confirmations,
    dryRun: config.dryRun,
  };

  const runOnce = async (): Promise<void> => {
    const stats = await syncOnce(deps, options);
    console.log(
      `[indexer] OK indexer_id='${config.indexerId}' chain=${chainId} bloques ` +
        `${stats.startBlock}-${stats.endBlock}: ${stats.events} eventos ` +
        `(${stats.highRisk} de riesgo alto) en ${stats.chunks} chunks${config.dryRun ? ' [dry-run]' : ''}`,
    );
  };

  try {
    if (args.loop) {
      console.log(`[indexer] modo loop (cada ${config.pollIntervalMs} ms); Ctrl-C para salir`);
      for (;;) {
        try {
          await runOnce();
        } catch (error) {
          console.error('[indexer] error en la ronda:', error instanceof Error ? error.message : error);
        }
        await sleep(config.pollIntervalMs);
      }
    } else {
      await runOnce();
    }
  } finally {
    if (store) await store.close();
  }
}

main().catch((error: unknown) => {
  console.error('[indexer] fallo:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
