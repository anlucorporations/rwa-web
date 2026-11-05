/** POST /api/orders/{id}/confirm — el comprador confirma y se libera el pago (CU-19). */
import { requireSession, toErrorResponse } from "@rwa/shared";

import { confirmOrder } from "@/lib/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const session = await requireSession(request);
    const order = await confirmOrder(id, session.address);
    return new Response(JSON.stringify({ success: true, data: order }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
