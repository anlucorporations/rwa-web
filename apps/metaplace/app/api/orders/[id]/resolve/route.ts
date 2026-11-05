/** POST /api/orders/{id}/resolve — arbitraje de la disputa (CU-21, rol arbiter). */
import { toErrorResponse, ValidationError } from "@rwa/shared";

import { resolveDispute } from "@/lib/market";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const { session } = await requireAnyRole(request, ["arbiter", "admin"]);
    const body = (await request.json()) as { resolution?: "buyer" | "seller"; note?: string };
    if (body.resolution !== "buyer" && body.resolution !== "seller") {
      throw new ValidationError("resolution debe ser 'buyer' o 'seller'", "resolution");
    }
    const order = await resolveDispute(id, session.address, body.resolution, body.note ?? "");
    return new Response(JSON.stringify({ success: true, data: order }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
