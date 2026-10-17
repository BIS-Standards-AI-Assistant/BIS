import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory, per-process rate limiting (P0 audit, 2026-09-03: no
 * authentication or rate limiting existed on any /api/v1/* route). A
 * fixed-window counter, not a token bucket — simpler, and adequate for a
 * single-instance Next.js deployment. Deliberately no Redis/external
 * infrastructure dependency: this project's own resource-constraint rule
 * (docs/ui/SIH.md §23) applies to infra choices too, not just LLM
 * providers. If this app is ever deployed across multiple instances, this
 * needs a shared store — noted here rather than silently wrong.
 */

interface Bucket {
  count: number;
  windowStart: number;
  /** The owning route's window — routes may differ, so expiry is per bucket. */
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory: an attacker spamming distinct IPs/keys could otherwise
// grow this map unboundedly between windows.
const MAX_TRACKED_KEYS = 5000;
// Sweeping trims to this, not to the cap, so a flood of new keys triggers a
// sweep once per ~500 keys rather than an O(n) pass on every request.
const SWEEP_TARGET = Math.floor(MAX_TRACKED_KEYS * 0.9);

/**
 * Drops expired buckets (each against its own route's window), then — if
 * every remaining bucket is still live, i.e. thousands of distinct clients
 * inside one window — evicts the least recently active. Evicting a live
 * bucket forgets that client's count, which is the lesser harm: the
 * alternative is a map that grows for as long as the flood lasts. Map
 * iteration is insertion order and a bucket is re-inserted on every
 * request (refused ones included), so a client that keeps hammering stays
 * tracked and the first keys are the quietest.
 */
function sweep(now: number): void {
  for (const [k, b] of buckets) {
    if (now - b.windowStart >= b.windowMs) buckets.delete(k);
  }
  for (const k of buckets.keys()) {
    if (buckets.size <= SWEEP_TARGET) break;
    buckets.delete(k);
  }
}

export interface RateLimitOptions {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

function clientKey(req: NextRequest): string {
  // Standard proxy header first (Vercel/most reverse proxies set this);
  // req.ip isn't reliable across Next.js versions/runtimes, so this is
  // the best-effort identifier available without adding infrastructure.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(req: NextRequest, routeName: string, opts: RateLimitOptions): RateLimitResult {
  const key = `${routeName}:${clientKey(req)}`;
  const now = Date.now();

  if (buckets.size >= MAX_TRACKED_KEYS) sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= opts.windowMs) {
    bucket = { count: 0, windowStart: now, windowMs: opts.windowMs };
  }
  // Re-inserted on every request to keep the map least-recently-active first.
  buckets.delete(key);
  buckets.set(key, bucket);

  bucket.count += 1;
  const remaining = Math.max(0, opts.limit - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + opts.windowMs - now) / 1000));

  return { limited: bucket.count > opts.limit, remaining, retryAfterSeconds };
}

/** Returns a 429 response if the request is over its limit, or null if the caller should proceed. Logs every limited request (P0 audit requirement: "clear logging"). */
export function rateLimitOrNull(req: NextRequest, routeName: string, opts: RateLimitOptions): NextResponse | null {
  const result = checkRateLimit(req, routeName, opts);
  if (!result.limited) return null;

  console.warn(`[rate-limit] ${routeName} blocked ${clientKey(req)} — retry after ${result.retryAfterSeconds}s`);
  return NextResponse.json(
    { error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

/** Exposed for tests only — clears all tracked buckets between test cases. */
export function __resetRateLimitsForTests(): void {
  buckets.clear();
}

/** Exposed for tests only — how many client/route buckets are tracked. */
export function __trackedRateLimitKeysForTests(): number {
  return buckets.size;
}
