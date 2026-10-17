/**
 * Inbound per-client rate limiting for API routes.
 *
 * Distinct from scripts/data-lib/rate-limit.ts, which throttles OUTBOUND
 * requests to bis.gov.in so this project is a polite scraper. This one
 * protects our own endpoints — specifically the ones that spend money per
 * call (speech-to-text, LLM generation) and are reachable by anyone who
 * finds the deployed URL.
 *
 * Deliberately in-memory and dependency-free: this app is deployed as a
 * single self-contained container (see Dockerfile, `output: "standalone"`),
 * so a process-local counter is a genuine limit rather than a decorative
 * one. Two honest caveats, stated rather than glossed:
 *   1. Running multiple replicas makes the effective limit N x limit, since
 *      each process counts separately. A shared store (Redis) is the fix if
 *      this is ever scaled horizontally.
 *   2. Counters reset on restart/redeploy.
 * Neither makes it useless — it stops casual abuse and runaway retry loops,
 * which is what it's for. It is not a defence against a determined
 * distributed attacker.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Seconds until the caller may retry — 0 when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  /** Exposed for tests; also called opportunistically to bound memory. */
  prune(now?: number): void;
}

export interface RateLimiterOptions {
  /** Max requests permitted per key within the window. */
  limit: number;
  windowMs: number;
  /** Injectable for deterministic tests. */
  now?: () => number;
}

/**
 * Sliding-window log: keeps the timestamps of a key's recent requests and
 * counts those still inside the window. More accurate than a fixed window
 * at these small limits — a fixed window lets a caller fire 2x the limit
 * across a boundary instant.
 */
/** Most clients tracked at once; see the eviction note in check(). */
const MAX_TRACKED_KEYS = 10_000;
/** Trimming below the cap means a flood triggers a sweep per ~1,000 new keys, not per request. */
const SWEEP_TARGET = Math.floor(MAX_TRACKED_KEYS * 0.9);

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions): RateLimiter {
  // Kept least-recently-active first: a key is re-inserted on every hit.
  const hits = new Map<string, number[]>();

  function prune(at: number = now()) {
    const cutoff = at - windowMs;
    for (const [key, timestamps] of hits) {
      const live = timestamps.filter((t) => t > cutoff);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    prune,
    check(key: string): RateLimitResult {
      const at = now();
      const cutoff = at - windowMs;

      // Bound memory: without this, one request each from many distinct
      // IPs would grow the map forever. Pruning alone isn't enough — inside
      // one window nothing has expired — so if every key is still live the
      // least recently active are dropped. That forgets their counts, which
      // is the lesser harm next to a map that grows for the whole flood.
      if (hits.size >= MAX_TRACKED_KEYS) {
        prune(at);
        for (const k of hits.keys()) {
          if (hits.size <= SWEEP_TARGET) break;
          hits.delete(k);
        }
      }

      const timestamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (timestamps.length >= limit) {
        const oldest = timestamps[0];
        // A refused request is still activity: a client hammering the
        // endpoint must stay tracked, not be the first one evicted.
        hits.delete(key);
        hits.set(key, timestamps);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - at) / 1000)),
        };
      }

      timestamps.push(at);
      hits.delete(key);
      hits.set(key, timestamps);
      return { allowed: true, remaining: limit - timestamps.length, retryAfterSeconds: 0 };
    },
  };
}

/**
 * Reads a rate-limit setting from an environment variable. A blank, zero,
 * negative or non-numeric value falls back to the default instead of being
 * used: `Number("")` is 0, which would block every request, and
 * `Number("2O")` is NaN, which never compares as over the limit and so
 * silently removes the limit from a metered endpoint.
 */
export function positiveNumberFromEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw?.trim() || NaN);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Best-effort client identity for rate limiting. Behind a reverse proxy
 * (the expected deployment — see Dockerfile) the socket address is the
 * proxy's, so the forwarded headers are what distinguish callers.
 *
 * These headers are client-controllable when NOT behind a trusted proxy,
 * so this is a throttle against ordinary abuse and retry storms, not an
 * authentication mechanism — never treat the result as a verified identity.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // "client, proxy1, proxy2" — the original client is first.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
