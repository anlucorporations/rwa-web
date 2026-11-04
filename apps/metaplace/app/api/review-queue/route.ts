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
    await requireAnyRole(request, roles);
    const claims = await listReviewQueue([status as ClaimStatus]);
    return new Response(JSON.stringify({ success: true, data: claims }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
