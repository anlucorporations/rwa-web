/**
 * GET /api/review-queue?status=pending|documents_verified
 * Cola del Operador (pending) y del Emisor (documents_verified) (CU-09/10).
 */
import { ForbiddenError, toErrorResponse } from "@rwa/shared";

import { listReviewQueue, type ClaimStatus } from "@/lib/claims";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const status = new URL(request.url).searchParams.get("status") ?? "pending";
    if (status !== "pending" && status !== "documents_verified") {
      throw new ForbiddenError("Estado de cola no soportado");
    }
    const roles = status === "pending" ? (["operator", "admin"] as const) : (["issuer", "admin"] as const);
    const { assignments } = await requireAnyRole(request, roles);
    // AM-05: el Emisor solo ve la cola de los programas que cubre su rol.
    const isAdmin = assignments.some((a) => a.role === "admin");
    const programFilter = isAdmin ? null : (assignments[0]?.issuer_program_id ?? null);
    if (!isAdmin && !programFilter) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    const claims = await listReviewQueue([status as ClaimStatus], programFilter);
    return new Response(JSON.stringify({ success: true, data: claims }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
