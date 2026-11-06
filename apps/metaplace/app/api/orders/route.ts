/** GET/POST /api/orders — órdenes con escrow en BRLT (CU-19). */
import { requireSession, toErrorResponse, ValidationError } from "@rwa/shared";

import { createOrder, listOrdersFor } from "@/lib/market";
import { checkWriteRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    return json({ success: true, data: await listOrdersFor(session.address) });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    checkWriteRateLimit(session.address);
    const body = (await request.json()) as { listingId?: string; escrowTxHash?: string; escrowAssetTxHash?: string; intentMessage?: string; intentSignature?: string };
    if (!body.listingId) throw new ValidationError("Falta `listingId`", "listingId");
    const orderId = await createOrder(
      session.address,
      body.listingId,
      { escrowTxHash: body.escrowTxHash ?? "", escrowAssetTxHash: body.escrowAssetTxHash ?? "" },
      { signature: body.intentSignature ?? "" },
    );
    return json({ success: true, data: { id: orderId, status: "escrowed" } }, 201);
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}
