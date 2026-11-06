import { afterEach, describe, expect, it } from "vitest";

import { checkAuthRateLimit, checkWriteRateLimit, resetRateLimits } from "./rate-limit";

const req = (ip: string) => new Request("http://localhost/api/auth/nonce", { headers: { "x-forwarded-for": ip } });

afterEach(() => resetRateLimits());

describe("rate limiting", () => {
  it("permite hasta el límite de auth y luego 429", () => {
    for (let i = 0; i < 10; i += 1) expect(() => checkAuthRateLimit(req("1.1.1.1"))).not.toThrow();
    expect(() => checkAuthRateLimit(req("1.1.1.1"))).toThrow(/Demasiados intentos/);
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
