/**
 * Repositorio de `rwa.sessions` — base de la sesión SIWE (D-092, RF-V3-01).
 *
 * Esquema v3: `wallet_address`, `nonce`, `role`, `domain`, `issued_at`,
 * `expires_at`, `revoked_at` (el `domain` valida EIP-4361).
 */

import { normalizeAddress } from '../address';
import { query } from '../pool';
import { translatePgError } from '../pg-errors';
import type { SessionRole, SessionRow } from '../types';

const COLUMNS = 'id, wallet_address, nonce, role, domain, issued_at, expires_at, revoked_at';

export type CreateSessionInput = {
  walletAddress: string;
  nonce: string;
  domain: string;
  role?: SessionRole;
  expiresAt: Date;
};

export class SessionsRepository {
  async create(input: CreateSessionInput): Promise<SessionRow> {
    const walletAddress = normalizeAddress(input.walletAddress);
    try {
      const { rows } = await query<SessionRow>(
        `INSERT INTO rwa.sessions (wallet_address, nonce, role, domain, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [walletAddress, input.nonce, input.role ?? 'investor', input.domain, input.expiresAt],
      );
      return rows[0];
    } catch (error) {
      translatePgError(error, 'No se pudo crear la sesión');
    }
  }

  /**
   * Consume un nonce de un solo uso: rota el nonce y extiende la caducidad.
   * Devuelve `null` si el nonce no existe, ya se usó, está revocado o caducó.
   */
  async consumeNonce(
    nonce: string,
    options: { newNonce: string; expiresAt: Date; role?: SessionRole },
  ): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>(
      `UPDATE rwa.sessions
          SET nonce = $2,
              role = COALESCE($3, role),
              issued_at = now(),
              expires_at = $4
        WHERE nonce = $1
          AND revoked_at IS NULL
          AND expires_at > now()
        RETURNING ${COLUMNS}`,
      [nonce, options.newNonce, options.role ?? null, options.expiresAt],
    );
    return rows[0] ?? null;
  }

  /** Nonce de un solo uso: la fila se busca antes de consumirla. */
  async findByNonce(nonce: string): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>(
      `SELECT ${COLUMNS} FROM rwa.sessions WHERE nonce = $1`,
      [nonce],
    );
    return rows[0] ?? null;
  }

  async findActiveById(id: string): Promise<SessionRow | null> {
    const { rows } = await query<SessionRow>(
      `SELECT ${COLUMNS} FROM rwa.sessions
        WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [id],
    );
    return rows[0] ?? null;
  }

  async revoke(id: string): Promise<boolean> {
    const { rowCount } = await query(
      'UPDATE rwa.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  /** Limpieza programada (C1). Devuelve cuántas filas se purgaron. */
  async deleteExpired(): Promise<number> {
    const { rowCount } = await query('DELETE FROM rwa.sessions WHERE expires_at < now()');
    return rowCount ?? 0;
  }
}
