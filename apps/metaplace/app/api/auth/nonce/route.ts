/** POST /api/auth/nonce — reto SIWE con rate limiting por IP (RNF-V3-15). */
import { handleNonce } from "@rwa/shared";

import { checkAuthRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    checkAuthRateLimit(request);
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    const { toErrorResponse } = await import("@rwa/shared");
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
  return handleNonce(request);
}
