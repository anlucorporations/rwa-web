/** GET /api/claims/{id}/documents — metadatos de documentos (titular/Operador/Admin). */
import { query, requireSession, toErrorResponse } from "@rwa/shared";

import { getClaim } from "@/lib/claims";
import { roleAssignments } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const session = await requireSession(request);
    const claim = await getClaim(id);
    if (!claim) {
      return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Solicitud no encontrada" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const isOwner = claim.requester_wallet.toLowerCase() === session.address.toLowerCase();
    const staff = await roleAssignments(session.address, ["operator", "admin"]);
    if (!isOwner && staff.length === 0) {
      return new Response(JSON.stringify({ success: false, error: { code: "forbidden", message: "No autorizado" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { rows } = await query<{ id: string; label: string; mime_type: string; size_bytes: number; sha256: string; retention_delete_at: string | null }>(
      `SELECT id, label, mime_type, size_bytes, sha256, retention_delete_at
         FROM rwa.document_files WHERE claim_request_id = $1 AND deleted_at IS NULL
         ORDER BY created_at`,
      [id],
    );
    return new Response(JSON.stringify({ success: true, data: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
