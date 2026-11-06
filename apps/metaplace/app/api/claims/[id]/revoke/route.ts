/** POST /api/claims/{id}/revoke — revocación de un claim (CU-05, RBAC por programa). */
import { toErrorResponse, ValidationError } from "@rwa/shared";

import { getClaim, revokeClaim } from "@/lib/claims";
import { assertProgramScope, requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const { session, assignments } = await requireAnyRole(request, ["issuer", "admin"]);
    const claim = await getClaim(id);
    if (!claim) {
      return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Solicitud no encontrada" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    assertProgramScope(assignments, claim.issuer_program_id);
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason || body.reason.trim().length < 5) {
      throw new ValidationError("Indica el motivo de la revocación (mín. 5)", "reason");
    }
    const revoked = await revokeClaim(id, session.address, body.reason);
    return new Response(JSON.stringify({ success: true, data: revoked }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "CONFLICT") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "conflict", message: (error as Error).message } }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
