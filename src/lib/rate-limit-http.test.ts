import { describe, test, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitOrNull, __resetRateLimitsForTests } from "./rate-limit-http";

function requestFrom(ip: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/query", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  __resetRateLimitsForTests();
});

describe("checkRateLimit", () => {
  test("allows requests under the limit", () => {
    const req = requestFrom("1.2.3.4");
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(req, "test-route", { limit: 5, windowMs: 60_000 });
      expect(result.limited).toBe(false);
    }
  });

  test("blocks the request that exceeds the limit", () => {
    const req = requestFrom("1.2.3.5");
    for (let i = 0; i < 3; i++) checkRateLimit(req, "test-route", { limit: 3, windowMs: 60_000 });
    const result = checkRateLimit(req, "test-route", { limit: 3, windowMs: 60_000 });
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("tracks different IPs independently", () => {
    const reqA = requestFrom("2.2.2.2");
    const reqB = requestFrom("3.3.3.3");
    for (let i = 0; i < 3; i++) checkRateLimit(reqA, "test-route", { limit: 3, windowMs: 60_000 });
    const resultA = checkRateLimit(reqA, "test-route", { limit: 3, windowMs: 60_000 });
    const resultB = checkRateLimit(reqB, "test-route", { limit: 3, windowMs: 60_000 });
    expect(resultA.limited).toBe(true);
    expect(resultB.limited).toBe(false);
  });

  test("tracks different route names independently for the same IP", () => {
    const req = requestFrom("4.4.4.4");
    for (let i = 0; i < 3; i++) checkRateLimit(req, "route-a", { limit: 3, windowMs: 60_000 });
    const resultA = checkRateLimit(req, "route-a", { limit: 3, windowMs: 60_000 });
    const resultB = checkRateLimit(req, "route-b", { limit: 3, windowMs: 60_000 });
    expect(resultA.limited).toBe(true);
    expect(resultB.limited).toBe(false);
  });
});

describe("rateLimitOrNull", () => {
  test("returns null while under the limit", () => {
    const req = requestFrom("5.5.5.5");
    expect(rateLimitOrNull(req, "test-route", { limit: 2, windowMs: 60_000 })).toBeNull();
  });

  test("returns a 429 response with Retry-After once over the limit", async () => {
    const req = requestFrom("6.6.6.6");
    rateLimitOrNull(req, "test-route", { limit: 1, windowMs: 60_000 });
    const res = rateLimitOrNull(req, "test-route", { limit: 1, windowMs: 60_000 });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBeTruthy();
    const body = await res!.json();
    expect(body.error).toBe("Too many requests");
  });
});
