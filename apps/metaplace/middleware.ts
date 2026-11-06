/**
 * Guardia de origen (AM-09): las mutaciones autenticadas deben venir del origen
 * permitido (ALLOWED_ORIGINS, lista separada por comas). Si la variable no está
 * definida (desarrollo/tests) no se bloquea; en despliegue es obligatoria.
 */
import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest): NextResponse {
  if (!MUTATING.has(request.method)) return NextResponse.next();

  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.length === 0) return NextResponse.next();

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const sameOrigin = origin !== null && (origin === `${proto}://${host}` || allowed.includes(origin));

  if (sameOrigin) return NextResponse.next();

  return NextResponse.json(
    { success: false, error: { code: "invalid_origin", message: "Origen de la petición no permitido" } },
    { status: 403 },
  );
}

export const config = { matcher: ["/api/:path*"] };
