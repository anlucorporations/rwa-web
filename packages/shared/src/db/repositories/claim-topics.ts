/**
 * Repositorio de `rwa.claim_topics` — catálogo canónico de topics (H-13).
 *
 * Solo lectura para la aplicación. Es la fuente que resuelve el mapeo
 * `claimTopic` (string o número en la API heredada) → `claim_topic_id` (FK smallint).
 */

import { query } from '../pool.js';
import type { ClaimTopicRow } from '../types.js';

const COLUMNS = 'id, code, name, description, active, created_at';

export class ClaimTopicsRepository {
  /** Topics activos, ordenados por id (1 KYC · 7 Accreditation · 9 Jurisdiction). */
  async listActive(): Promise<ClaimTopicRow[]> {
    const { rows } = await query<ClaimTopicRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_topics WHERE active = true ORDER BY id`,
    );
    return rows;
  }

  /** Catálogo completo, incluidos los reservados (5/6 → `active = false`). */
  async list(): Promise<ClaimTopicRow[]> {
    const { rows } = await query<ClaimTopicRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_topics ORDER BY id`,
    );
    return rows;
  }

  async findById(id: number): Promise<ClaimTopicRow | null> {
    const { rows } = await query<ClaimTopicRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_topics WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByCode(code: string): Promise<ClaimTopicRow | null> {
    const { rows } = await query<ClaimTopicRow>(
      `SELECT ${COLUMNS} FROM rwa.claim_topics WHERE lower(code) = lower($1)`,
      [code],
    );
    return rows[0] ?? null;
  }

  /**
   * Resuelve un topic por id numérico o por `code` (case-insensitive).
   * Devuelve `null` si no existe; el llamador decide si es 400 o 404.
   */
  async resolve(idOrCode: number | string): Promise<ClaimTopicRow | null> {
    if (typeof idOrCode === 'number') return this.findById(idOrCode);
    if (/^\d+$/.test(idOrCode.trim())) return this.findById(Number(idOrCode.trim()));
    return this.findByCode(idOrCode.trim());
  }
}
