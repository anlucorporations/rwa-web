import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad (RNF-W-01). Se duplican en las 3 apps para no acoplar
 * `next.config.ts` al transpilado del monorepo; el gate de CI las verifica.
 * `unsafe-eval` solo en desarrollo: el build de producción no lo necesita.
 */
const SCRIPT_SRC =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

/**
 * Orígenes permitidos en `connect-src`: además de HTTPS/WSS, el RPC configurado
 * (`NEXT_PUBLIC_RPC_URL`), para que el flujo on-chain funcione con Anvil local
 * por HTTP (desarrollo y E2E). En desarrollo se permiten además los puertos
 * locales habituales (H-12).
 */
function rpcConnectSources(): string {
  const extra: string[] = [];
  const rpc = process.env.NEXT_PUBLIC_RPC_URL;
  if (rpc) {
    try {
      extra.push(new URL(rpc).origin);
    } catch {
      /* URL inválida: se ignora */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    extra.push("http://localhost:*", "http://127.0.0.1:*");
  }
  return ["'self'", "https:", "wss:", ...extra].join(" ");
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  SCRIPT_SRC,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${rpcConnectSources()}`,
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /* config options here */
 
  output: "standalone",

  // Paquete compartido del monorepo (TS fuente) y driver de PostgreSQL solo en servidor.
  transpilePackages: ["@rwa/shared", "@rwa/ui"],
  serverExternalPackages: ["pg"],

  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
