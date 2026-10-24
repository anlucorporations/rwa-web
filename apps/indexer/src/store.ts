/**
 * Persistencia del indexer en PostgreSQL (H-12/H-21, RNF-401).
 *
 * El DDL reproduce la SECCIÓN 4b de `base_datos.sql` (canónico en `rwa-sc/RepoTecnico`),
 * para poder crear el esquema en tests/drills (`--init`) sin depender de `psql`.
 * En producción las tablas ya existen (esquema `rwa`).
 */

import pg from 'pg';

export interface PersistableEvent {
  chainId: bigint;
  blockNumber: bigint;
  blockHash: string;
  txHash: string;
  logIndex: number;
  address: string;
  contractType: string | null;
  eventName: string;
  args: Record<string, unknown>;
  removed: boolean;
}

export interface BatchMeta {
  indexerId: string;
  chainId: bigint;
  lastBlock: bigint;
}

export interface EventStore {
  /** Crea el esquema y las tablas si no existen (idempotente). */
  init(): Promise<void>;
  /** Último bloque procesado o `null` si aún no hay estado. */
  getLastBlock(indexerId: string): Promise<bigint | null>;
  /** Persiste los eventos y avanza el punto de control en una transacción. */
  saveBatch(events: readonly PersistableEvent[], meta: BatchMeta): Promise<number>;
  close(): Promise<void>;
}

const SCHEMA_RE = /^[a-z_][a-z0-9_]*$/;

function assertSchema(schema: string): void {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Esquema PostgreSQL inválido: '${schema}'`);
}

function ddl(schema: string): string[] {
  return [
    `CREATE SCHEMA IF NOT EXISTS ${schema}`,
    `CREATE TABLE IF NOT EXISTS ${schema}.indexer_state (
        indexer_id  text        PRIMARY KEY,
        chain_id    bigint      NOT NULL,
        last_block  bigint      NOT NULL,
        updated_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT indexer_state_nonneg CHECK (last_block >= 0)
    )`,
    `CREATE TABLE IF NOT EXISTS ${schema}.chain_events (
        id            bigserial   PRIMARY KEY,
        chain_id      bigint      NOT NULL,
        block_number  bigint      NOT NULL,
        block_hash    text        NOT NULL,
        tx_hash       text        NOT NULL,
        log_index     integer     NOT NULL,
        address       text        NOT NULL,
        contract_type text,
        event_name    text        NOT NULL,
        args          jsonb       NOT NULL DEFAULT '{}'::jsonb,
        removed       boolean     NOT NULL DEFAULT false,
        indexed_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chain_events_address_lower_hex CHECK (address ~ '^0x[0-9a-f]{40}$'),
        CONSTRAINT chain_events_log_index_nonneg CHECK (log_index >= 0),
        CONSTRAINT chain_events_unique UNIQUE (chain_id, tx_hash, log_index)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chain_events_block   ON ${schema}.chain_events (chain_id, block_number, log_index)`,
    `CREATE INDEX IF NOT EXISTS idx_chain_events_event   ON ${schema}.chain_events (event_name, block_number DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_chain_events_address ON ${schema}.chain_events (address, block_number DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_chain_events_tx      ON ${schema}.chain_events (tx_hash)`,
  ];
}

const INSERT_EVENT = (schema: string) => `
  INSERT INTO ${schema}.chain_events
      (chain_id, block_number, block_hash, tx_hash, log_index, address, contract_type, event_name, args, removed)
  VALUES ($1::bigint, $2::bigint, $3, $4, $5::int, $6, $7, $8, $9::jsonb, $10)
  ON CONFLICT (chain_id, tx_hash, log_index) DO UPDATE SET
      block_hash    = EXCLUDED.block_hash,
      address       = EXCLUDED.address,
      contract_type = EXCLUDED.contract_type,
      event_name    = EXCLUDED.event_name,
      args          = EXCLUDED.args,
      removed       = EXCLUDED.removed,
      indexed_at    = now()`;

const UPSERT_STATE = (schema: string) => `
  INSERT INTO ${schema}.indexer_state (indexer_id, chain_id, last_block, updated_at)
  VALUES ($1, $2::bigint, $3::bigint, now())
  ON CONFLICT (indexer_id) DO UPDATE SET
      chain_id   = EXCLUDED.chain_id,
      last_block = EXCLUDED.last_block,
      updated_at = now()`;

export async function createPostgresStore(databaseUrl: string, schema: string): Promise<EventStore> {
  assertSchema(schema);
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'rwa-indexer',
  });
  pool.on('error', () => {
    /* el pool descarta la conexión rota; el siguiente query reconecta */
  });

  return {
    async init() {
      const client = await pool.connect();
      try {
        for (const statement of ddl(schema)) await client.query(statement);
      } finally {
        client.release();
      }
    },

    async getLastBlock(indexerId) {
      const result = await pool.query(
        `SELECT last_block FROM ${schema}.indexer_state WHERE indexer_id = $1`,
        [indexerId],
      );
      if (result.rowCount === 0) return null;
      return BigInt(result.rows[0].last_block as string);
    },

    async saveBatch(events, meta) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const event of events) {
          await client.query(INSERT_EVENT(schema), [
            event.chainId.toString(),
            event.blockNumber.toString(),
            event.blockHash,
            event.txHash,
            event.logIndex,
            event.address.toLowerCase(),
            event.contractType,
            event.eventName,
            JSON.stringify(event.args),
            event.removed,
          ]);
        }
        await client.query(UPSERT_STATE(schema), [
          meta.indexerId,
          meta.chainId.toString(),
          meta.lastBlock.toString(),
        ]);
        await client.query('COMMIT');
        return events.length;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
