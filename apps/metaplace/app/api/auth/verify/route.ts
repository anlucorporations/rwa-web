/** POST /api/auth/verify — verificación SIWE con rate limiting por IP (AM-08). */
import { handleVerify } from "@rwa/shared";

import { checkAuthRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    checkAuthRateLimit(request);
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    throw error;
  }
  return handleVerify(request);
}
