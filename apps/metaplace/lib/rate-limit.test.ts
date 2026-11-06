import { afterEach, describe, expect, it } from "vitest";

import { RateLimitError } from "@rwa/shared";

import { checkAuthRateLimit, checkWriteRateLimit, rateLimitResponse, resetRateLimits } from "./rate-limit";

const req = (ip: string) => new Request("http://localhost/api/auth/nonce", { headers: { "x-forwarded-for": ip } });

afterEach(() => resetRateLimits());

describe("rate limiting", () => {
  it("permite hasta el límite de auth y luego 429", () => {
    for (let i = 0; i < 10; i += 1) expect(() => checkAuthRateLimit(req("1.1.1.1"))).not.toThrow();
    expect(() => checkAuthRateLimit(req("1.1.1.1"))).toThrow(/Demasiados intentos/);
  });

  it("expone retryAfterSec y cabecera Retry-After", async () => {
    for (let i = 0; i < 10; i += 1) checkAuthRateLimit(req("9.9.9.9"));
    try {
      checkAuthRateLimit(req("9.9.9.9"));
      throw new Error("debería haber lanzado");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      const response = rateLimitResponse(error);
      expect(response?.status).toBe(429);
      expect(Number(response?.headers.get("retry-after"))).toBeGreaterThan(0);
    }
  });

  it("aísla por IP", () => {
    for (let i = 0; i < 10; i += 1) checkAuthRateLimit(req("2.2.2.2"));
    expect(() => checkAuthRateLimit(req("3.3.3.3"))).not.toThrow();
  });

  it("limita escrituras por wallet", () => {
    for (let i = 0; i < 30; i += 1) expect(() => checkWriteRateLimit("0xabc")).not.toThrow();
    expect(() => checkWriteRateLimit("0xabc")).toThrow(/Demasiadas operaciones/);
    expect(() => checkWriteRateLimit("0xdef")).not.toThrow();
  });
});
