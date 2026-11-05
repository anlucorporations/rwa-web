/** POST /api/orders/{id}/dispute — el comprador abre una disputa (CU-20). */
import { requireSession, toErrorResponse, ValidationError } from "@rwa/shared";

import { openDispute } from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const session = await requireSession(request);
    const body = (await request.json()) as { reason?: string };
    if (!body.reason) throw new ValidationError("Falta el motivo", "reason");
    const order = await openDispute(id, session.address, body.reason);
    return new Response(JSON.stringify({ success: true, data: order }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
