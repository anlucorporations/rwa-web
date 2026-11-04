/**
 * Administración de ISSUER y RBAC (CU-08, CU-15) y snapshot del Sistema (CU-17).
 */
import { query, withTransaction } from "@rwa/shared";

export interface ProgramInput {
  slug: string;
  name: string;
  description?: string | null;
  activityKind?: "product" | "service" | "good" | null;
  credentials: string[];
  requirements: { kind: "document" | "credential"; label: string; credentialCode?: string; required?: boolean }[];
}

export interface ProgramRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  activity_kind: string | null;
  active: boolean;
  credentials: { code: string; name: string }[];
  requirements: { id: string; kind: string; label: string; credential_code: string | null; required: boolean }[];
}

export async function listPrograms(includeInactive = false): Promise<ProgramRow[]> {
  const { rows } = await query<ProgramRow>(
    `SELECT ip.id, ip.slug, ip.name, ip.description, ip.activity_kind::text AS activity_kind, ip.active,
            COALESCE((SELECT json_agg(json_build_object('code', ct.code, 'name', ct.name) ORDER BY ct.code)
                        FROM rwa.issuer_program_credentials ipc
                        JOIN rwa.credential_types ct ON ct.id = ipc.credential_type_id
                       WHERE ipc.issuer_program_id = ip.id), '[]') AS credentials,
            COALESCE((SELECT json_agg(json_build_object('id', r.id, 'kind', r.kind::text, 'label', r.label,
                                                        'credential_code', c.code, 'required', r.required)
                                      ORDER BY r.sort_order, r.created_at)
                        FROM rwa.issuer_program_requirements r
                        LEFT JOIN rwa.credential_types c ON c.id = r.credential_type_id
                       WHERE r.issuer_program_id = ip.id), '[]') AS requirements
       FROM rwa.issuer_programs ip
      WHERE ($1::boolean OR ip.active)
      ORDER BY ip.name`,
    [includeInactive],
  );
  return rows;
}

function assertProgram(input: ProgramInput): void {
  if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(input.slug)) throw new Error("INVALID_SLUG");
  if (!input.name || input.name.trim().length < 3) throw new Error("INVALID_NAME");
  if (!Array.isArray(input.credentials) || input.credentials.length === 0) throw new Error("NO_CREDENTIALS");
}

export async function createProgram(input: ProgramInput, adminWallet: string): Promise<ProgramRow> {
  assertProgram(input);
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO rwa.issuer_programs (slug, name, description, activity_kind, created_by)
       VALUES ($1, $2, $3, $4::rwa.asset_kind, lower($5)) RETURNING id`,
      [input.slug, input.name, input.description ?? null, input.activityKind ?? null, adminWallet],
    );
    const programId = rows[0].id;
    for (const code of input.credentials) {
      await client.query(
        `INSERT INTO rwa.issuer_program_credentials (issuer_program_id, credential_type_id)
         SELECT $1, id FROM rwa.credential_types WHERE code = $2`,
        [programId, code],
      );
    }
    let order = 0;
    for (const req of input.requirements) {
      order += 1;
      if (req.kind === "credential") {
        await client.query(
          `INSERT INTO rwa.issuer_program_requirements
             (issuer_program_id, kind, label, credential_type_id, required, sort_order)
           SELECT $1, 'credential', $2, id, $3, $4 FROM rwa.credential_types WHERE code = $5`,
          [programId, req.label, req.required ?? true, order, req.credentialCode ?? ""],
        );
      } else {
        await client.query(
          `INSERT INTO rwa.issuer_program_requirements
             (issuer_program_id, kind, label, required, sort_order)
           VALUES ($1, 'document', $2, $3, $4)`,
          [programId, req.label, req.required ?? true, order],
        );
      }
    }
    return programId;
  });
  const programs = await listPrograms(true);
  const created = programs.find((p) => p.id === id);
  if (!created) throw new Error("No se pudo leer el ISSUER creado");
  return created;
}

export async function setProgramActive(id: string, active: boolean): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE rwa.issuer_programs SET active = $2 WHERE id = $1`,
    [id, active],
  );
  return (rowCount ?? 0) > 0;
}

export interface GrantInput {
  wallet: string;
  role: string;
  scope: "platform" | "issuer_program";
  issuerProgramSlug?: string;
  reason?: string;
}

const ROLES = ["admin", "issuer", "operator", "auditor", "arbiter", "support"] as const;

export async function grantRole(input: GrantInput, adminWallet: string): Promise<{ id: string }> {
  if (!ROLES.includes(input.role as (typeof ROLES)[number])) throw new Error("INVALID_ROLE");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.wallet)) throw new Error("INVALID_WALLET");
  const { rows } = await query<{ id: string }>(
    `INSERT INTO rwa.role_assignments (wallet_address, role, scope, issuer_program_id, granted_by_wallet, reason)
     SELECT lower($1), $2::rwa.session_role, $3,
            (SELECT id FROM rwa.issuer_programs WHERE slug = $4),
            lower($5), $6
     RETURNING id`,
    [input.wallet, input.role, input.scope, input.issuerProgramSlug ?? null, adminWallet, input.reason ?? null],
  );
  return rows[0];
}

export async function listRoles() {
  const { rows } = await query(
    `SELECT ra.id, ra.wallet_address, ra.role::text AS role, ra.scope, ip.slug AS issuer_program_slug,
            ra.granted_by_wallet, ra.granted_at, ra.revoked_at, ra.reason
       FROM rwa.role_assignments ra
       LEFT JOIN rwa.issuer_programs ip ON ip.id = ra.issuer_program_id
      ORDER BY ra.revoked_at NULLS FIRST, ra.granted_at DESC`,
  );
  return rows;
}

export async function revokeRole(id: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE rwa.role_assignments SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

export async function systemSnapshot() {
  const [dbPing, counts, indexer, recentAudit] = await Promise.all([
    query<{ ok: number }>("SELECT 1 AS ok"),
    query<{
      claims_pending: string;
      claims_verified: string;
      claims_approved: string;
      orders_open: string;
      identities: string;
      roles_active: string;
    }>(
      `SELECT
         (SELECT count(*) FROM rwa.claim_requests WHERE status = 'pending') AS claims_pending,
         (SELECT count(*) FROM rwa.claim_requests WHERE status = 'documents_verified') AS claims_verified,
         (SELECT count(*) FROM rwa.claim_requests WHERE status = 'approved') AS claims_approved,
         (SELECT count(*) FROM rwa.orders WHERE status IN ('pending_payment','escrowed')) AS orders_open,
         (SELECT count(*) FROM rwa.identities) AS identities,
         (SELECT count(*) FROM rwa.role_assignments WHERE revoked_at IS NULL) AS roles_active`,
    ),
    query<{ last_block: string; updated_at: string | null }>(
      "SELECT last_block, updated_at FROM rwa.indexer_state WHERE id = 1",
    ),
    query("SELECT action, resource_type, created_at FROM rwa.audit_log ORDER BY created_at DESC LIMIT 10"),
  ]);
  return {
    database: dbPing.rows[0]?.ok === 1 ? "ok" : "down",
    counts: counts.rows[0],
    indexer: indexer.rows[0] ?? null,
    recentAudit: recentAudit.rows,
  };
}
