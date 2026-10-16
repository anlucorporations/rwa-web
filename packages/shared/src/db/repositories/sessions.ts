/**
 * Repositorio de `rwa.sessions` — base de la sesión SIWE (D-092, RF-W-01).
 *
 * Ninguna de las 16 rutas heredadas lo usa todavía: la autenticación es O1.
 * Se deja listo aquí para que O1 no tenga que tocar la capa de datos.
 */

import { normalizeAddress } from '../address';
import { query } from '../pool';
import { translatePgError } from '../pg-errors';
import type { SessionRole, SessionRow } from '../types';

const COLUMNS =
  'id, address, nonce, role, issued_at, expires_at, revoked_at, user_agent, ip';

export type CreateSessionInput = {
  address: string;
  nonce: string;
  role?: SessionRole;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export class SessionsRepository {
  async create(input: CreateSessionInput): Promise<SessionRow> {
    const address = normalizeAddress(input.address);
    try {
      const { rows } = await query<SessionRow>(
        `INSERT INTO rwa.sessions (address, nonce, role, expires_at, user_agent, ip)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUMNS}`,
        [
          address,
          input.nonce,
          input.role ?? 'investor',
          input.expiresAt,
          input.userAgent ?? null,
          input.ip ?? null,
        ],
      );
      return rows[0];
    } catch (error) {
      translatePgError(error, 'No se pudo crear la sesión');
    }
  }

  /** Nonce de un solo uso: la fila se busca antes de consumirla (O1). */
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

  /** Limpieza programada (O5.5). Devuelve cuántas filas se purgaron. */
  async deleteExpired(): Promise<number> {
    const { rowCount } = await query('DELETE FROM rwa.sessions WHERE expires_at < now()');
    return rowCount ?? 0;
  }
}
