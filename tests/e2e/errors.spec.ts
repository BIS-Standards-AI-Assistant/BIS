import { test, expect } from "./fixtures/test-base";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/**
 * Error/empty/loading states. The UI must explain WHAT happened, WHY
 * (when known), and WHAT the user can do next — never a raw stack trace,
 * never a state that looks like success when it isn't.
 */

test("API failure surfaces a real ErrorState, never a raw error string or blank page", async ({ page }) => {
  // Simulate a downstream failure by aborting the request the client makes.
  await page.route("**/api/v1/query", (route) => route.abort("failed"));
  await page.goto("/");
  const input = page.getByRole("textbox", { name: /product or compliance question/i });
  await input.fill(KNOWN_QUERIES.exactStandard);
  await input.press("Enter");

  // Scoped past Next.js's own built-in route announcer, which also
  // carries role="alert" (id="__next-route-announcer__") — a real,
  // always-present element, not a defect, but not what this test means
  // by "alert".
  const errorAlert = page.getByRole("alert").filter({ hasText: /temporarily unavailable/i });
  await expect(errorAlert).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
  // Never a raw stack trace or fetch error object dumped into the DOM.
  await expect(page.getByText(/TypeError:|at fetch|NetworkError/)).not.toBeVisible();
});

test("rate limiting on /api/v1/query returns 429 with Retry-After, and the client does not crash on it", async ({ request }) => {
  // 25 concurrent requests each run the full deterministic pipeline
  // (retrieval + grounding + evidence aggregation) at real, observed
  // per-request latency (9-16s) — cumulative wall time under Node's
  // single-process concurrency genuinely exceeds the default test
  // timeout, so this test gets a longer budget rather than a weaker check.
  test.setTimeout(120_000);
  // Rate-limit state (src/lib/rate-limit-http.ts) is per-process and keyed
  // by X-Forwarded-For, shared across this whole single-worker test run.
  // Using a dedicated forwarded-for value here isolates this test's burst
  // from every other test in the suite that hits /api/v1/query under the
  // default "unknown" key — without this, this test would exhaust the
  // shared budget and cause unrelated tests running afterward to fail.
  const testIp = "203.0.113.42";
  const results = await Promise.all(
    Array.from({ length: 25 }, () =>
      request.post("/api/v1/query", {
        data: { query: "cement" },
        headers: { "X-Forwarded-For": testIp },
      }),
    ),
  );
  const statuses = results.map((r) => r.status());
  expect(statuses).toContain(429);
  const limited = results.find((r) => r.status() === 429)!;
  expect(limited.headers()["retry-after"]).toBeTruthy();
});

test("a nonsense query never shows fabricated high-confidence matches — trust regression from a real defect found by this suite", async ({ page }) => {
  // Live finding (2026-09-03): this retrieval engine has no hard
  // rejection threshold — it always returns its top-K candidates by
  // relative similarity, even for nonsense text like this. That's a
  // legitimate retrieval design choice. What is NOT legitimate is
  // presenting those candidates as "Best match"/"Directly applicable" —
  // that was a real bug in src/lib/applicability.ts (vacuous 100%
  // coverage when no product/material could be extracted), fixed this
  // pass. This test locks in the fix: gibberish input must not produce
  // a "Best match" heading or a "Directly applicable" badge.
  await page.goto(`/?q=${encodeURIComponent("xyzzy-nonexistent-product-qqq")}`);
  await expect(page.getByText("Search Synthesis")).toBeVisible({ timeout: 60_000 });

  await expect(page.getByText("Best match")).not.toBeVisible();
  await expect(page.getByText("Directly applicable")).not.toBeVisible();
});

test("laboratory search's no-match state explains the gap, not a silent empty list", async ({ request }) => {
  const res = await request.post("/api/v1/find-laboratories", { data: { location: "Nowhereistan-Not-A-Real-Place" } });
  const body = await res.json();
  expect(body.message).toBeTruthy();
  expect(body.message.length).toBeGreaterThan(10);
});

test("malformed document upload explains the specific validation failure, not a generic 500", async ({ request }) => {
  const res = await request.post("/api/v1/analyze-document", {
    multipart: { file: { name: "bad.pdf", mimeType: "application/pdf", buffer: Buffer.from("garbage") } },
  });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("invalid query request (empty string) is rejected with a clear 400, not a silent 200 with nothing useful", async ({ request }) => {
  const res = await request.post("/api/v1/query", { data: { query: "" } });
  expect(res.status()).toBe(400);
});
