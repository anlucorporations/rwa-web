/** POST /api/services/{tokenId}/consume — consumo de servicio (CU-25). */
import { requireSession, toErrorResponse } from "@rwa/shared";

import { checkWriteRateLimit } from "@/lib/rate-limit";
import { consumeService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ tokenId: string }> }): Promise<Response> {
  try {
    const { tokenId } = await params;
    const session = await requireSession(request);
    checkWriteRateLimit(session.address);
    const result = await consumeService(tokenId, session.address);
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
