/**
 * Registro de auditoría append-only (RNF-V3-14). Best-effort: nunca bloquea la
 * operación principal, pero deja traza de toda mutación sensible.
 */
import { query } from "@rwa/shared";

export interface AuditInput {
  actor?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO rwa.audit_log (actor_wallet, action, resource_type, resource_id, metadata)
       VALUES (lower($1), $2, $3, $4, $5::jsonb)`,
      [input.actor ?? null, input.action, input.resourceType, input.resourceId ?? null, JSON.stringify(input.metadata ?? {})],
    );
  } catch (error) {
    console.error("[audit] no se pudo registrar el evento", input.action, error);
  }
}
