/**
 * Pool único de PostgreSQL (RT-W-07).
 *
 * Sustituye las 3 copias de `lib/mongodb.ts` (una por app, cada una con su pool).
 * El pool es un singleton por proceso, cacheado en `globalThis` para sobrevivir al
 * recargado de módulos de `next dev`.
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import { getServerConfig } from '../config/index';
import { ServiceUnavailableError } from '../errors';

interface PgGlobal {
  __rwaPgPool?: Pool;
}

const globalForPg = globalThis as unknown as PgGlobal;

function createPool(): Pool {
  const { databaseUrl } = getServerConfig();
  const pool = new Pool({
    connectionString: databaseUrl,
    // Cloud SQL de desarrollo tiene un `max_connections` bajo (25): 5 por app
    // deja margen a las 3 apps + scripts. Ajustable con `PG_POOL_MAX`.
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'rwa-web',
  });
  // Sin manejador, un error de conexión ociosa tumba el proceso.
  pool.on('error', () => {
    /* registrado por el llamador; el pool descarta la conexión rota */
  });
  return pool;
}

/** Devuelve el pool compartido, creándolo en la primera llamada. */
export function getPool(): Pool {
  if (!globalForPg.__rwaPgPool) {
    globalForPg.__rwaPgPool = createPool();
  }
  return globalForPg.__rwaPgPool;
}

/**
 * Consulta parametrizada. Nunca se interpola SQL con datos de entrada.
 * Traduce un fallo de conexión a `ServiceUnavailableError` (503, RNF-W-04).
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params as unknown[]);
  } catch (error) {
    if (isConnectionError(error)) {
      throw new ServiceUnavailableError('PostgreSQL no disponible', { cause: error });
    }
    throw error;
  }
}

/** Igual que `query`, pero con un cliente ya reservado (dentro de una transacción). */
export async function queryWith<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, params as unknown[]);
}

/** Ejecuta `fn` dentro de `BEGIN/COMMIT`; revierte ante cualquier error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient;
  try {
    client = await getPool().connect();
  } catch (error) {
    throw new ServiceUnavailableError('No se pudo conectar a PostgreSQL', { cause: error });
  }
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* la conexión ya está rota; el error original es el relevante */
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Comprueba la conectividad (`SELECT 1`). Usado por la prueba de humo O0.7. */
export async function ping(): Promise<void> {
  await query('SELECT 1');
}

/** Cierra el pool (scripts y pruebas). */
export async function closePool(): Promise<void> {
  if (globalForPg.__rwaPgPool) {
    await globalForPg.__rwaPgPool.end();
    globalForPg.__rwaPgPool = undefined;
  }
}

function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'EHOSTUNREACH' ||
    code === '57P01' || // admin_shutdown
    code === '57P03' || // cannot_connect_now
    code === '08006' || // connection_failure
    code === '08001' // sqlclient_unable_to_establish_sqlconnection
  );
}
