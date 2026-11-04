/** Traduce errores de dominio de administración a respuestas HTTP tipadas. */
import { toErrorResponse } from "@rwa/shared";

const KNOWN: Record<string, { status: number; code: string }> = {
  INVALID_SLUG: { status: 400, code: "invalid_slug" },
  INVALID_NAME: { status: 400, code: "invalid_name" },
  NO_CREDENTIALS: { status: 400, code: "no_credentials" },
  INVALID_ROLE: { status: 400, code: "invalid_role" },
  INVALID_WALLET: { status: 400, code: "invalid_wallet" },
};

export function adminError(request: Request, error: unknown): Response {
  const message = error instanceof Error ? error.message : "Error inesperado";
  const known = KNOWN[message];
  const pgCode = (error as { code?: string }).code;
  if (known) {
    return new Response(
      JSON.stringify({ success: false, error: { code: known.code, message } }),
      { status: known.status, headers: { "Content-Type": "application/json" } },
    );
  }
  if (pgCode === "23505") {
    return new Response(
      JSON.stringify({ success: false, error: { code: "conflict", message: "Ya existe un registro con esos datos" } }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }
  const { status, body } = toErrorResponse(error, request);
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
