/** GET /api/assets/consent-message?name=… — texto legible que firma el Fiador (CU-07). */
import { ValidationError } from "@rwa/shared";

import { consentMessage } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  try {
    if (name.trim().length < 3) throw new ValidationError("Falta el nombre del activo", "name");
    return new Response(JSON.stringify({ success: true, data: { message: consentMessage(name) } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: { code: "validation_error", message: "Falta el nombre del activo" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
