/**
 * Repositorio de `rwa.audit_log` — auditoría de accesos y mutaciones (RNF-W-02).
 *
 * `record()` está pensado para llamarse en las rutas críticas (subida, descarga y
 * mutación de claims) sin interrumpir la operación principal si la auditoría falla.
 */

import { query } from '../pool.js';
import { normalizeAddressOrUndefined } from '../address.js';
import type { AuditLogRow } from '../types.js';

const COLUMNS = 'id, actor_address, action, resource_type, resource_id, request_id, detail, at';

export type RecordAuditInput = {
  actorAddress?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  detail?: unknown;
};

export class AuditLogRepository {
  async record(input: RecordAuditInput): Promise<void> {
    await query(
      `INSERT INTO rwa.audit_log (actor_address, action, resource_type, resource_id, request_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        normalizeAddressOrUndefined(input.actorAddress ?? undefined) ?? null,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        input.requestId ?? null,
        input.detail === undefined ? null : JSON.stringify(input.detail),
      ],
    );
  }

  async listByResource(resourceType: string, resourceId: string, limit = 100): Promise<AuditLogRow[]> {
    const { rows } = await query<AuditLogRow>(
      `SELECT ${COLUMNS} FROM rwa.audit_log
        WHERE resource_type = $1 AND resource_id = $2
        ORDER BY at DESC LIMIT $3`,
      [resourceType, resourceId, Math.min(Math.max(limit, 1), 500)],
    );
    return rows;
  }

  async list(filter: { actorAddress?: string; limit?: number; offset?: number } = {}): Promise<AuditLogRow[]> {
    const actor = normalizeAddressOrUndefined(filter.actorAddress);
    const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
    const offset = Math.max(filter.offset ?? 0, 0);
    if (actor) {
      const { rows } = await query<AuditLogRow>(
        `SELECT ${COLUMNS} FROM rwa.audit_log WHERE actor_address = $1 ORDER BY at DESC LIMIT $2 OFFSET $3`,
        [actor, limit, offset],
      );
      return rows;
    }
    const { rows } = await query<AuditLogRow>(
      `SELECT ${COLUMNS} FROM rwa.audit_log ORDER BY at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  }
}
