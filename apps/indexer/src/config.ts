/**
 * Configuración del indexer (H-12/H-21). Todo por entorno; sin literales de red.
 *
 * Entorno:
 *   RPC_URL (o NEXT_PUBLIC_RPC_URL)  red a indexar (obligatoria)
 *   DATABASE_URL                      PostgreSQL (obligatoria salvo --dry-run)
 *   INDEXER_ID                        identificador del indexer (default "default")
 *   INDEXER_SCHEMA                    esquema PostgreSQL (default "rwa")
 *   INDEXER_FROM_BLOCK                bloque inicial de backfill (default: reanudar)
 *   INDEXER_CHAIN_ID                  chainId esperado (validación; default: el del RPC)
 *   INDEXER_CHUNK_SIZE                bloques por petición getLogs (default 2000)
 *   INDEXER_CONFIRMATIONS             confirmaciones antes de indexar (default 0)
 *   INDEXER_POLL_INTERVAL_MS          intervalo del modo --loop (default 5000)
 */

export interface IndexerConfig {
  rpcUrl: string;
  databaseUrl?: string;
  indexerId: string;
  schema: string;
  chainId?: bigint;
  fromBlock?: bigint;
  chunkSize: bigint;
  confirmations: bigint;
  pollIntervalMs: number;
  dryRun: boolean;
}

const SCHEMA_RE = /^[a-z_][a-z0-9_]*$/;

function parseBigInt(value: string | undefined, name: string): bigint | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  try {
    const parsed = BigInt(value);
    if (parsed < 0n) throw new Error('negativo');
    return parsed;
  } catch {
    throw new Error(`${name} debe ser un entero >= 0 (recibido: '${value}')`);
  }
}

function parseNumber(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} debe ser un entero >= 0 (recibido: '${value}')`);
  }
  return parsed;
}

export function loadConfig(overrides: Partial<IndexerConfig> = {}): IndexerConfig {
  const rpcUrl = overrides.rpcUrl ?? process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? '';
  if (!rpcUrl) throw new Error('RPC_URL (o NEXT_PUBLIC_RPC_URL) no está definida');

  const schema = overrides.schema ?? process.env.INDEXER_SCHEMA ?? 'rwa';
  if (!SCHEMA_RE.test(schema)) {
    throw new Error(`INDEXER_SCHEMA inválido: '${schema}' (debe cumplir ${SCHEMA_RE})`);
  }

  const databaseUrl = overrides.databaseUrl ?? process.env.DATABASE_URL;
  const dryRun = overrides.dryRun ?? process.env.INDEXER_DRY_RUN === '1';
  if (!dryRun && !databaseUrl) {
    throw new Error('DATABASE_URL no está definida (usa --dry-run para no persistir)');
  }

  return {
    rpcUrl,
    databaseUrl,
    dryRun,
    indexerId: overrides.indexerId ?? process.env.INDEXER_ID ?? 'default',
    schema,
    chainId: overrides.chainId ?? parseBigInt(process.env.INDEXER_CHAIN_ID, 'INDEXER_CHAIN_ID'),
    fromBlock: overrides.fromBlock ?? parseBigInt(process.env.INDEXER_FROM_BLOCK, 'INDEXER_FROM_BLOCK'),
    chunkSize: overrides.chunkSize ?? parseBigInt(process.env.INDEXER_CHUNK_SIZE, 'INDEXER_CHUNK_SIZE') ?? 2000n,
    confirmations:
      overrides.confirmations ?? parseBigInt(process.env.INDEXER_CONFIRMATIONS, 'INDEXER_CONFIRMATIONS') ?? 0n,
    pollIntervalMs:
      overrides.pollIntervalMs ?? parseNumber(process.env.INDEXER_POLL_INTERVAL_MS, 'INDEXER_POLL_INTERVAL_MS', 5000),
  };
}
