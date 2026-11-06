/**
 * Rate limiting en memoria (RNF-V3-15, C5): ventana deslizante por clave.
 *
 * Límites configurables por env:
 *   RATE_LIMIT_AUTH_PER_MIN   (default 10)  → /api/auth/nonce
 *   RATE_LIMIT_WRITE_PER_MIN  (default 30)  → escrituras autenticadas
 *   RATE_LIMIT_WINDOW_MS      (default 60000)
 *
 * En Cloud Run cada instancia tiene su propio contador; el límite de borde (WAF)
 * queda como tarea de C6.
 */
import { RateLimitError } from "@rwa/shared";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const AUTH_LIMIT = Number(process.env.RATE_LIMIT_AUTH_PER_MIN ?? 10);
const WRITE_LIMIT = Number(process.env.RATE_LIMIT_WRITE_PER_MIN ?? 30);

type Bucket = number[];
const buckets = new Map<string, Bucket>();

function hit(key: string, limit: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const windowStart = now - WINDOW_MS;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  return { ok: true, retryAfterSec: 0 };
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

/** Limita por IP (endpoints públicos como el nonce SIWE). */
export function checkAuthRateLimit(request: Request): void {
  const { ok, retryAfterSec } = hit(`auth:${clientIp(request)}`, AUTH_LIMIT);
  if (!ok) throw new RateLimitError(`Demasiados intentos de acceso. Reintenta en ${retryAfterSec}s`, retryAfterSec);
}

/** Limita por wallet autenticada (escrituras). */
export function checkWriteRateLimit(wallet: string): void {
  const { ok, retryAfterSec } = hit(`write:${wallet.toLowerCase()}`, WRITE_LIMIT);
  if (!ok) throw new RateLimitError(`Demasiadas operaciones. Reintenta en ${retryAfterSec}s`, retryAfterSec);
}

/** Respuesta 429 con `Retry-After` (AM-08). */
export function rateLimitResponse(error: unknown): Response | null {
  if (!(error instanceof RateLimitError)) return null;
  return new Response(
    JSON.stringify({ success: false, error: { code: "rate_limited", message: error.message }, retryAfterSec: error.retryAfterSec }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(error.retryAfterSec) } },
  );
}

/** Solo para tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
