import { describe, test, expect } from "vitest";
import { createRateLimiter, clientKeyFromHeaders } from "./rate-limit";

function fixedClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  test("allows requests up to the limit, then blocks", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);
  });

  test("reports remaining requests accurately", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });
    expect(limiter.check("ip").remaining).toBe(2);
    expect(limiter.check("ip").remaining).toBe(1);
    expect(limiter.check("ip").remaining).toBe(0);
  });

  test("keys are independent — one caller's usage doesn't throttle another", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  test("the window slides — capacity returns as old requests age out", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    limiter.check("ip");
    clock.advance(30_000);
    limiter.check("ip");
    expect(limiter.check("ip").allowed).toBe(false);

    // 31s later the first request has aged out; exactly one slot frees up.
    clock.advance(31_000);
    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);
  });

  test("retryAfterSeconds points at when the oldest request actually expires", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });
    limiter.check("ip");
    clock.advance(20_000);
    const blocked = limiter.check("ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(40); // 60s window - 20s elapsed
  });

  test("retryAfterSeconds is never 0 for a blocked request", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: clock.now });
    limiter.check("ip");
    clock.advance(999);
    expect(limiter.check("ip").retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  test("prune drops keys whose requests have all expired", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: clock.now });
    limiter.check("ip");
    clock.advance(2_000);
    limiter.prune();
    // Capacity fully restored after pruning.
    expect(limiter.check("ip").allowed).toBe(true);
  });
});

describe("clientKeyFromHeaders", () => {
  test("uses the first entry of x-forwarded-for (the original client)", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(clientKeyFromHeaders(h)).toBe("203.0.113.7");
  });

  test("falls back to x-real-ip", () => {
    expect(clientKeyFromHeaders(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  test("falls back to a constant when no forwarding headers are present", () => {
    // Everything shares one bucket in that case — deliberately conservative,
    // since letting each unidentifiable caller through unthrottled would
    // defeat the limiter entirely.
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });

  test("ignores an empty x-forwarded-for rather than keying on empty string", () => {
    expect(clientKeyFromHeaders(new Headers({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});
