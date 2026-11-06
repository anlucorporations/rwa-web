/** GET/POST /api/listings — publicaciones a precio fijo (CU-18). */
import { requireSession, toErrorResponse } from "@rwa/shared";

import { recordAudit } from "@/lib/audit";
import { createListing, listActiveListings } from "@/lib/market";
import { checkWriteRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(): Promise<Response> {
  try {
    return json({ success: true, data: await listActiveListings() });
  } catch (error) {
    const { status, body } = toErrorResponse(error, new Request("http://localhost"));
    return json(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    checkWriteRateLimit(session.address);
    const body = (await request.json()) as { tokenId?: string; priceBrlt?: string; quantity?: number; onChainListingId?: string; escrowTxHash?: string };
    if (!body.tokenId) {
      return json({ success: false, error: { code: "validation_error", message: "Falta `tokenId`" } }, 400);
    }
    const listing = await createListing(session.address, body.tokenId, body.priceBrlt ?? "", Number(body.quantity ?? 1), { onChainListingId: body.onChainListingId, escrowTxHash: body.escrowTxHash });
    await recordAudit({ actor: session.address, action: "listing.created", resourceType: "listing", resourceId: listing.id, metadata: { tokenId: body.tokenId } });
    return json({ success: true, data: listing }, 201);
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}
