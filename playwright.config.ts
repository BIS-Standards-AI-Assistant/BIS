import { defineConfig, devices } from "@playwright/test";

/**
 * Real E2E suite (pfinal.md follow-up, 2026-09-03): proves that a user
 * can complete implemented journeys through UI -> API -> deterministic
 * engine -> real database -> evidence/Knowledge Boundary -> correct UI
 * state, against the actual dev server and the actual Neon database —
 * never a mocked backend. See docs/UI_UX_TEST_REPORT.md for what each
 * spec (tests/e2e/*.spec.ts) actually proves and what it deliberately
 * does not (BLOCKED/NOT_IMPLEMENTED features per
 * docs/FINAL_E2E_COMPLETION_REPORT.md are never given fake-success tests).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // shares one dev-server + one real DB — avoid rate-limit collisions between specs
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  // This environment has no LLM provider configured, so every query goes
  // through a real retry-then-timeout chain (local -> openrouter-free ->
  // paid, all skipped/failed) before falling back to the deterministic
  // path — confirmed live at 9-16s per /api/v1/query call, and more under
  // concurrent load. These margins reflect that real, observed latency,
  // not a padded guess.
  timeout: 90_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Requires .env.local (DATABASE_URL, etc.) — the dev server has never
    // started successfully in this session without it.
    command: "npx dotenv -e .env.local -- npm run dev",
    url: "http://localhost:3000/api/v1/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
