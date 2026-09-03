import { test as base, expect } from "@playwright/test";
import crypto from "crypto";

/**
 * Every spec in this suite should import `test`/`expect` from here, not
 * directly from @playwright/test. Reason: src/lib/rate-limit-http.ts's
 * 20-req/min-per-IP budget on /api/v1/query is real, intentional P0
 * production behavior (this suite must never weaken it) — but every
 * Playwright-driven request defaults to the same "unknown" client
 * identity, so this suite's own legitimate cross-test traffic was
 * exhausting the shared bucket and causing unrelated later tests to see
 * 429s (2026-09-03 full-run investigation). Giving each test a distinct
 * synthetic IP is the correct fix: it matches how real, distinct users
 * actually behave, without touching the rate limiter itself.
 */
// Playwright fixture parameter named `use`, not a React hook — the
// react-hooks lint rule matches on the name alone and misfires on both
// calls below.
export const test = base.extend({
  page: async ({ page }, use) => {
    const syntheticIp = `198.51.100.${crypto.randomInt(1, 255)}`;
    await page.setExtraHTTPHeaders({ "X-Forwarded-For": syntheticIp });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
  request: async ({ playwright, baseURL }, use) => {
    const syntheticIp = `198.51.100.${crypto.randomInt(1, 255)}`;
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { "X-Forwarded-For": syntheticIp },
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(context);
    await context.dispose();
  },
});

export { expect };
