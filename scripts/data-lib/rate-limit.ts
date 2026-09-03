/**
 * Shared rate-limiting for any script that talks to bis.gov.in (or any
 * external domain). prompts/dataAcquisition.md §30: "Respect BIS
 * infrastructure... implement concurrency limit, request delay, retry
 * with exponential backoff... download each source once."
 */

const MIN_DELAY_MS = 1500; // one request roughly every 1.5s, well under anything that would look like hammering a small gov site
const MAX_RETRIES = 3;
// Node's fetch has no default timeout: a server that accepts the connection
// and then never answers hangs the whole script indefinitely. bis.gov.in
// does this occasionally under load, so every attempt gets its own deadline
// and is retried like any other transport error.
const TIMEOUT_MS = 45_000;

let lastRequestAt = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes all calls through this function to at least MIN_DELAY_MS
 * apart, and retries a failed fetch with exponential backoff. Never
 * fetches the same URL concurrently with itself — callers should await
 * each call before issuing the next.
 */
export async function politeFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  let attempt = 0;
  let lastError: unknown;
  while (attempt < MAX_RETRIES) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        ...init,
        headers: { "User-Agent": "BIS-Navigator-Research/1.0 (non-commercial student project)", ...init?.headers },
      });
      if (res.ok) return res;
      // Retry on 429/5xx only — a 404 or 403 won't fix itself with a delay.
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    attempt++;
    await sleep(MIN_DELAY_MS * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
