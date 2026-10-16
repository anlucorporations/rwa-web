/**
 * Repositorio de `rwa.tokens` y sus tablas puente
 * (`token_required_claims`, `token_compliance_modules`).
 *
 * Las operaciones que tocan más de una tabla van en transacción. Los tres registries
 * son obligatorios en el tipo de entrada: el CHECK `tokens_registries_required` y
 * RF-W-11 son *fail-closed* (un token sin `claim_topics_registry` no verifica a nadie).
 */

import { normalizeAddress, normalizeAddressOrUndefined } from '../address.js';
import { query, queryWith, withTransaction } from '../pool.js';
import { translatePgError } from '../pg-errors.js';
import type { PoolClient } from 'pg';
import type { TokenComplianceModuleRow, TokenRequiredClaimRow, TokenRow } from '../types.js';

const COLUMNS =
  'id, token_address, admin_address, name, symbol, decimals, max_total_supply, total_supply, ' +
  'identity_registry, trusted_issuers_registry, claim_topics_registry, compliance_address, ' +
  'price, description, transaction_hash, block_number, created_at, updated_at';

export type CreateTokenInput = {
  tokenAddress: string;
  adminAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Los tres registries son NOT NULL en el esquema (RF-W-11). */
  identityRegistry: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
  maxTotalSupply?: string | null;
  totalSupply?: string | null;
  complianceAddress?: string | null;
  price?: string | null;
  description?: string | null;
  transactionHash?: string | null;
  blockNumber?: string | number | null;
  requiredClaims?: readonly number[];
  complianceModules?: readonly string[];
};

export type TokenStats = { tables: number; sizeBytes: string };

export class TokensRepository {
  /** Listado off-chain del marketplace (`GET /api/tokens`); `adminAddress` opcional. */
  async list(filter: { adminAddress?: string } = {}): Promise<TokenRow[]> {
    const admin = normalizeAddressOrUndefined(filter.adminAddress);
    if (admin) {
      const { rows } = await query<TokenRow>(
        `SELECT ${COLUMNS} FROM rwa.tokens WHERE admin_address = $1 ORDER BY created_at DESC`,
        [admin],
      );
      return rows;
    }
    const { rows } = await query<TokenRow>(
      `SELECT ${COLUMNS} FROM rwa.tokens ORDER BY created_at DESC`,
    );
    return rows;
  }

  async findById(id: string): Promise<TokenRow | null> {
    const { rows } = await query<TokenRow>(
      `SELECT ${COLUMNS} FROM rwa.tokens WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByAddress(tokenAddress: string): Promise<TokenRow | null> {
    const addr = normalizeAddress(tokenAddress, 'tokenAddress');
    const { rows } = await query<TokenRow>(
      `SELECT ${COLUMNS} FROM rwa.tokens WHERE token_address = $1`,
      [addr],
    );
    return rows[0] ?? null;
  }

  async getRequiredClaims(tokenId: string): Promise<TokenRequiredClaimRow[]> {
    const { rows } = await query<TokenRequiredClaimRow>(
      'SELECT token_id, claim_topic_id, created_at FROM rwa.token_required_claims WHERE token_id = $1 ORDER BY claim_topic_id',
      [tokenId],
    );
    return rows;
  }

  async getComplianceModules(tokenId: string): Promise<TokenComplianceModuleRow[]> {
    const { rows } = await query<TokenComplianceModuleRow>(
      'SELECT token_id, module_address, is_primary, created_at FROM rwa.token_compliance_modules WHERE token_id = $1 ORDER BY is_primary DESC, module_address',
      [tokenId],
    );
    return rows;
  }

  /** Alta del token + topics exigidos + módulos de compliance, en una sola transacción. */
  async create(input: CreateTokenInput): Promise<TokenRow> {
    const tokenAddress = normalizeAddress(input.tokenAddress, 'tokenAddress');
    const adminAddress = normalizeAddress(input.adminAddress, 'adminAddress');
    const identityRegistry = normalizeAddress(input.identityRegistry, 'identityRegistry');
    const trustedIssuersRegistry = normalizeAddress(input.trustedIssuersRegistry, 'trustedIssuersRegistry');
    const claimTopicsRegistry = normalizeAddress(input.claimTopicsRegistry, 'claimTopicsRegistry');
    const modules = (input.complianceModules ?? []).map((m) => normalizeAddress(m, 'complianceModules'));
    const primary = input.complianceAddress
      ? normalizeAddress(input.complianceAddress, 'complianceAddress')
      : (modules[0] ?? null);

    try {
      return await withTransaction(async (client) => {
        const inserted = await queryWith<TokenRow>(
          client,
          `INSERT INTO rwa.tokens
             (token_address, admin_address, name, symbol, decimals, max_total_supply, total_supply,
              identity_registry, trusted_issuers_registry, claim_topics_registry, compliance_address,
              price, description, transaction_hash, block_number)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING ${COLUMNS}`,
          [
            tokenAddress,
            adminAddress,
            input.name,
            input.symbol,
            input.decimals,
            input.maxTotalSupply ?? null,
            input.totalSupply ?? null,
            identityRegistry,
            trustedIssuersRegistry,
            claimTopicsRegistry,
            primary,
            input.price ?? null,
            input.description ?? null,
            input.transactionHash ?? null,
            input.blockNumber === undefined || input.blockNumber === null ? null : String(input.blockNumber),
          ],
        );
        const token = inserted.rows[0];

        await replaceRequiredClaims(client, token.id, input.requiredClaims ?? []);
        await replaceComplianceModules(client, token.id, modules, primary);

        return token;
      });
    } catch (error) {
      translatePgError(error, 'No se pudo registrar el token');
    }
  }

  /** Reemplazo transaccional de los topics exigidos (`POST .../claims`). */
  async setRequiredClaims(tokenId: string, topicIds: readonly number[]): Promise<TokenRow | null> {
    try {
      return await withTransaction(async (client) => {
        const exists = await queryWith<TokenRow>(client, `SELECT ${COLUMNS} FROM rwa.tokens WHERE id = $1`, [tokenId]);
        if (!exists.rows[0]) return null;
        await replaceRequiredClaims(client, tokenId, topicIds);
        return exists.rows[0];
      });
    } catch (error) {
      translatePgError(error, 'No se pudieron actualizar los topics exigidos');
    }
  }

  /** Reemplazo transaccional de los módulos de compliance (`POST .../modules`). */
  async setComplianceModules(
    tokenId: string,
    modules: readonly string[],
    primaryIndex = 0,
  ): Promise<TokenRow | null> {
    const normalized = modules.map((m) => normalizeAddress(m, 'modules'));
    try {
      return await withTransaction(async (client) => {
        const exists = await queryWith<TokenRow>(client, `SELECT ${COLUMNS} FROM rwa.tokens WHERE id = $1`, [tokenId]);
        if (!exists.rows[0]) return null;
        const primary = normalized.length === 0 ? null : (normalized[primaryIndex] ?? normalized[0]);
        await replaceComplianceModules(client, tokenId, normalized, primary);
        const updated = await queryWith<TokenRow>(
          client,
          `UPDATE rwa.tokens SET compliance_address = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
          [tokenId, primary],
        );
        return updated.rows[0] ?? null;
      });
    } catch (error) {
      translatePgError(error, 'No se pudieron actualizar los módulos');
    }
  }

  /** Puntero principal de compliance (`POST .../compliance`). */
  async setComplianceAddress(tokenId: string, complianceAddress: string): Promise<TokenRow | null> {
    const addr = normalizeAddress(complianceAddress, 'complianceAddress');
    const { rows } = await query<TokenRow>(
      `UPDATE rwa.tokens SET compliance_address = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
      [tokenId, addr],
    );
    return rows[0] ?? null;
  }

  /** Precio como `string` para `numeric(38,18)` (nunca `parseFloat`). */
  async setPrice(tokenId: string, price: string): Promise<TokenRow | null> {
    const { rows } = await query<TokenRow>(
      `UPDATE rwa.tokens SET price = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
      [tokenId, price],
    );
    return rows[0] ?? null;
  }

  /** Métricas del esquema (sustituye `db.stats()` del endpoint de diagnóstico). */
  async stats(): Promise<TokenStats> {
    const { rows } = await query<{ tables: string; size_bytes: string }>(
      `SELECT
         (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'rwa')::text AS tables,
         COALESCE((
           SELECT sum(pg_total_relation_size(c.oid))
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'rwa' AND c.relkind IN ('r', 'm')
         ), 0)::text AS size_bytes`,
    );
    return { tables: Number(rows[0]?.tables ?? 0), sizeBytes: rows[0]?.size_bytes ?? '0' };
  }
}

async function replaceRequiredClaims(
  client: PoolClient,
  tokenId: string,
  topicIds: readonly number[],
): Promise<void> {
  await queryWith(client, 'DELETE FROM rwa.token_required_claims WHERE token_id = $1', [tokenId]);
  if (topicIds.length === 0) return;
  await queryWith(
    client,
    `INSERT INTO rwa.token_required_claims (token_id, claim_topic_id)
     SELECT $1, topic_id FROM unnest($2::smallint[]) AS topic_id
     ON CONFLICT DO NOTHING`,
    [tokenId, [...topicIds]],
  );
}

async function replaceComplianceModules(
  client: PoolClient,
  tokenId: string,
  modules: readonly string[],
  primary: string | null,
): Promise<void> {
  await queryWith(client, 'DELETE FROM rwa.token_compliance_modules WHERE token_id = $1', [tokenId]);
  if (modules.length === 0) return;
  await queryWith(
    client,
    `INSERT INTO rwa.token_compliance_modules (token_id, module_address, is_primary)
     SELECT $1, module_address, (module_address = $3)
       FROM unnest($2::text[]) AS module_address
     ON CONFLICT DO NOTHING`,
    [tokenId, [...modules], primary],
  );
}
