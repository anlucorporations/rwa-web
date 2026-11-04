/**
 * GET/POST /api/identity — alta y consulta de la identidad seudónima (CU-03).
 */
import { requireSession, toErrorResponse } from "@rwa/shared";

import { createIdentity, findIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const identity = await findIdentity(session.address);
    if (!identity) {
      return json({ success: false, error: { code: "not_found", message: "Sin identidad" } }, 404);
    }
    return json({ success: true, data: identity });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const identity = await createIdentity(session.address);
    return json({ success: true, data: identity }, 201);
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}
