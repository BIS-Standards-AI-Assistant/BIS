import { describe, test, expect } from "vitest";
import { createRateLimiter, clientKeyFromHeaders, positiveNumberFromEnv } from "./rate-limit";

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

describe("createRateLimiter: memory bound under a flood of distinct clients", () => {
  test("past the cap, the least recently active clients are forgotten", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("first");
    expect(limiter.check("first").allowed).toBe(false);

    // All inside one window, so nothing expires and pruning alone frees nothing.
    for (let i = 0; i < 12_000; i++) limiter.check(`flood-${i}`);

    // The oldest entry was evicted rather than the map growing to 12,001 keys.
    expect(limiter.check("first").allowed).toBe(true);
  });

  test("a client that stays active is not the one evicted", () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check("busy");
    for (let i = 0; i < 12_000; i++) {
      limiter.check(`flood-${i}`);
      // Keeps hitting (and being refused) throughout the flood.
      if (i % 500 === 0) expect(limiter.check("busy").allowed).toBe(false);
    }
    expect(limiter.check("busy").allowed).toBe(false);
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

describe("positiveNumberFromEnv", () => {
  test("uses a valid positive value", () => {
    expect(positiveNumberFromEnv("30", 20)).toBe(30);
    expect(positiveNumberFromEnv(" 45 ", 20)).toBe(45);
    expect(positiveNumberFromEnv("90000", 60_000)).toBe(90_000);
  });

  test("falls back when unset or blank — a blank .env line must not become a limit of 0", () => {
    expect(positiveNumberFromEnv(undefined, 20)).toBe(20);
    expect(positiveNumberFromEnv("", 20)).toBe(20);
    expect(positiveNumberFromEnv("   ", 20)).toBe(20);
  });

  test("falls back on a typo — NaN would silently disable the limit", () => {
    expect(positiveNumberFromEnv("2O", 20)).toBe(20);
    expect(positiveNumberFromEnv("twenty", 20)).toBe(20);
  });

  test("falls back on zero, negative and infinite values", () => {
    expect(positiveNumberFromEnv("0", 20)).toBe(20);
    expect(positiveNumberFromEnv("-5", 20)).toBe(20);
    expect(positiveNumberFromEnv("Infinity", 20)).toBe(20);
  });

  test("the reason this matters: a NaN limit never blocks anyone", () => {
    const limiter = createRateLimiter({ limit: Number("2O"), windowMs: 60_000 });
    for (let i = 0; i < 100; i++) expect(limiter.check("k").allowed).toBe(true);
  });
});
