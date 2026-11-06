/**
 * Borde web (AM-09/A03):
 *  - Guardia de `Origin` para mutaciones (ALLOWED_ORIGINS).
 *  - CSP con **nonce** por petición (script-src sin `unsafe-inline`); Next propaga
 *    el nonce a sus scripts al leer la cabecera de la petición.
 */
import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function buildCsp(nonce: string): string {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "";
  const connect = ["'self'", "https:", "wss:"];
  if (rpc) connect.push(rpc);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (isApi && MUTATING.has(request.method)) {
    const allowed = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (allowed.length > 0) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
      const sameOrigin = origin !== null && (origin === `${proto}://${host}` || allowed.includes(origin));
      if (!sameOrigin) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_origin", message: "Origen de la petición no permitido" } },
          { status: 403, headers: { "Content-Security-Policy": csp } },
        );
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
