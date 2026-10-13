import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitOrNull,
  __resetRateLimitsForTests,
  __trackedRateLimitKeysForTests,
} from "./rate-limit-http";

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

describe("memory bound", () => {
  afterEach(() => vi.useRealTimers());

  test("thousands of distinct clients inside one window cannot grow the table without bound", () => {
    for (let i = 0; i < 6000; i++) {
      checkRateLimit(requestFrom(`10.0.${Math.floor(i / 250)}.${i % 250}`), "flood", { limit: 5, windowMs: 60_000 });
    }
    expect(__trackedRateLimitKeysForTests()).toBeLessThanOrEqual(5000);
  });

  test("a client that keeps hitting during a flood stays limited", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const abuser = requestFrom("5.5.5.5");
    checkRateLimit(abuser, "flood", opts);
    for (let i = 0; i < 6000; i++) {
      checkRateLimit(requestFrom(`10.3.${Math.floor(i / 250)}.${i % 250}`), "flood", opts);
      if (i % 400 === 0) expect(checkRateLimit(abuser, "flood", opts).limited).toBe(true);
    }
    expect(checkRateLimit(abuser, "flood", opts).limited).toBe(true);
  });

  test("a sweep expires each bucket against its own route's window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    const longWindow = { limit: 2, windowMs: 60_000 };
    const shortWindow = { limit: 100, windowMs: 1_000 };

    // A client at its limit on a 60-second route.
    const client = requestFrom("9.9.9.9");
    for (let i = 0; i < 3; i++) checkRateLimit(client, "slow-route", longWindow);
    expect(checkRateLimit(client, "slow-route", longWindow).limited).toBe(true);

    // Fill the table to the cap on a 1-second route, then force a sweep
    // two seconds later, once those buckets have expired.
    for (let i = 0; i < 4999; i++) {
      checkRateLimit(requestFrom(`10.1.${Math.floor(i / 250)}.${i % 250}`), "fast-route", shortWindow);
    }
    vi.setSystemTime(new Date("2026-10-01T00:00:02Z"));
    for (const ip of ["8.8.8.1", "8.8.8.2", "8.8.8.3"]) checkRateLimit(requestFrom(ip), "fast-route", shortWindow);

    // Still inside its own 60-second window, so still limited.
    expect(checkRateLimit(client, "slow-route", longWindow).limited).toBe(true);
  });

  test("expired buckets are swept before any live one is evicted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    for (let i = 0; i < 4999; i++) {
      checkRateLimit(requestFrom(`10.2.${Math.floor(i / 250)}.${i % 250}`), "old", { limit: 5, windowMs: 1_000 });
    }
    vi.setSystemTime(new Date("2026-10-01T00:00:05Z"));
    const live = requestFrom("7.7.7.7");
    checkRateLimit(live, "fresh", { limit: 1, windowMs: 60_000 });
    checkRateLimit(requestFrom("6.6.6.6"), "fresh", { limit: 1, windowMs: 60_000 });

    expect(__trackedRateLimitKeysForTests()).toBe(2);
    expect(checkRateLimit(live, "fresh", { limit: 1, windowMs: 60_000 }).limited).toBe(true);
  });
});
