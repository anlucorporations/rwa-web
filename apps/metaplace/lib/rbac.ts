/**
 * RBAC de servidor (B5, RF-V3-29): el rol se valida contra `role_assignments`
 * vigentes en cada petición (nunca contra la cookie).
 */
import { ForbiddenError, requireSession, query, type SessionIdentity } from "@rwa/shared";

export type RoleName = "operator" | "admin" | "issuer" | "auditor" | "arbiter" | "support";

export interface RoleAssignment {
  role: RoleName;
  issuer_program_id: string | null;
}

export async function roleAssignments(wallet: string, roles: readonly RoleName[]): Promise<RoleAssignment[]> {
  const { rows } = await query<RoleAssignment>(
    `SELECT role::text AS role, issuer_program_id
       FROM rwa.role_assignments
      WHERE lower(wallet_address) = lower($1)
        AND revoked_at IS NULL
        AND role::text = ANY($2::text[])`,
    [wallet, roles],
  );
  return rows;
}

export async function requireAnyRole(
  request: Request,
  roles: readonly RoleName[],
): Promise<{ session: SessionIdentity; assignments: RoleAssignment[] }> {
  const session = await requireSession(request);
  const assignments = await roleAssignments(session.address, roles);
  if (assignments.length === 0) {
    throw new ForbiddenError(`Requiere rol: ${roles.join(" o ")}`);
  }
  return { session, assignments };
}
