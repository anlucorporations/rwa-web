/**
 * Repositorio de `rwa.issuers` — nombre visible del emisor (RF-W-12).
 *
 * La autoridad por topic es on-chain; esta tabla **no concede permisos**.
 */

import { normalizeAddress } from '../address.js';
import { query } from '../pool.js';
import type { IssuerRow } from '../types.js';

const COLUMNS = 'id, address, name, verified, verified_at, created_at, updated_at';

export type UpsertIssuerResult = { issuer: IssuerRow; created: boolean };

export class IssuersRepository {
  /**
   * Alta/actualización del nombre visible (`POST /api/issuers` heredado).
   * `created` se deriva de `xmax = 0` (fila recién insertada, no actualizada).
   */
  async upsertName(address: string, name: string): Promise<UpsertIssuerResult> {
    const addr = normalizeAddress(address);
    const { rows } = await query<IssuerRow & { created: boolean }>(
      `INSERT INTO rwa.issuers (address, name)
       VALUES ($1, $2)
       ON CONFLICT (address) DO UPDATE SET name = EXCLUDED.name
       RETURNING ${COLUMNS}, (xmax = 0) AS created`,
      [addr, name],
    );
    const { created, ...issuer } = rows[0];
    return { issuer, created };
  }

  async findByAddress(address: string): Promise<IssuerRow | null> {
    const addr = normalizeAddress(address);
    const { rows } = await query<IssuerRow>(
      `SELECT ${COLUMNS} FROM rwa.issuers WHERE address = $1`,
      [addr],
    );
    return rows[0] ?? null;
  }

  /** Resolución por lotes (`POST /api/issuers/batch`). */
  async findByAddresses(addresses: readonly string[]): Promise<IssuerRow[]> {
    const normalized = [...new Set(addresses.map((a) => normalizeAddress(a)))];
    if (normalized.length === 0) return [];
    const { rows } = await query<IssuerRow>(
      `SELECT ${COLUMNS} FROM rwa.issuers WHERE address = ANY($1::text[])`,
      [normalized],
    );
    return rows;
  }
}
