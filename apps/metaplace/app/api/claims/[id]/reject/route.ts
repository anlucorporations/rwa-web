/** POST /api/claims/{id}/reject — rechazo de una solicitud (Operador/Admin) (CU-13). */
import { query, toErrorResponse, ValidationError } from "@rwa/shared";

import { getClaim } from "@/lib/claims";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const { session } = await requireAnyRole(request, ["operator", "admin"]);
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason || body.reason.trim().length < 5) {
      throw new ValidationError("Indica el motivo del rechazo (mínimo 5 caracteres)", "reason");
    }
    const { rows } = await query<{ id: string }>(
      `UPDATE rwa.claim_requests
          SET status = 'rejected',
              reviewed_by_wallet = lower($2),
              reviewed_at = now(),
              metadata = metadata || jsonb_build_object('rejectReason', $3::text)
        WHERE id = $1 AND status IN ('pending', 'documents_verified')
        RETURNING id`,
      [id, session.address, body.reason],
    );
    if (!rows[0]) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "conflict", message: "La solicitud no se puede rechazar en su estado actual" } }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    const claim = await getClaim(id);
    return new Response(JSON.stringify({ success: true, data: claim }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
