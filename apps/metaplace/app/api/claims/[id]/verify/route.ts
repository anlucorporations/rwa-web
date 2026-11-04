/** POST /api/claims/{id}/verify — el Operador marca documentos verificados (CU-09). */
import { toErrorResponse } from "@rwa/shared";

import { verifyDocuments } from "@/lib/claims";
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
    const claim = await verifyDocuments(id, session.address);
    return new Response(JSON.stringify({ success: true, data: claim }), {
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
