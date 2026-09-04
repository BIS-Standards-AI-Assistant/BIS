import { test, expect } from "./fixtures/test-base";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/**
 * @visual — run with `npm run test:visual`
 *
 * Screenshots only of stable, important surfaces, per the spec. Dynamic
 * data (query text echoed back, timestamps in chat messages) is masked
 * rather than snapshotted raw, so these don't flake on every re-run of
 * live retrieval scores. First run creates the baseline; subsequent runs
 * diff against it (standard Playwright snapshot behavior).
 */

test.describe("@visual Stable surface screenshots", () => {
  test("home / search (empty state)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("home-empty.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test("search results", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("search-results.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // real evidence text/scores can shift slightly as the corpus grows
      mask: [page.getByText(/\d+\.\d{3}/)], // raw score numbers in "technical detail" panels, if expanded
    });
  });

  // KNOWN DEFECT (confirmed 2026-09-03/04, not fixed — see
  // docs/UI_UX_TEST_REPORT.md "Defects Discovered" for full investigation
  // notes): the Standard Passport page's rendered height is intermittently
  // ~7.3x too tall (7021px expected vs 51205px observed), reproduced
  // across multiple independent runs via both direct URL navigation and
  // client-side link-through, with no reliable trigger identified in this
  // pass. Server-rendered HTML byte size is confirmed STABLE (911285
  // bytes via 3x direct curl fetches) — the defect is client-side
  // rendering/layout non-determinism, not a server data bug. test.fail()
  // marks this as a tracked, expected-to-fail case rather than hiding it
  // or letting it silently block the rest of the suite's signal.
  test("Standard Passport", async ({ page }) => {
    test.fail(true, "Known defect: passport page height is intermittently ~7.3x too tall — see docs/UI_UX_TEST_REPORT.md");
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    await page.getByRole("link", { name: "View Complete Standard Passport" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("standard-passport.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
  });

  test("research assistant open state", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    await page.getByRole("button", { name: "Discuss these results" }).click();
    await page.getByPlaceholder("Ask any question about BIS standards...").waitFor();
    await expect(page.locator("div").filter({ hasText: "Discuss these results" }).last()).toHaveScreenshot(
      "research-assistant.png",
      { maxDiffPixelRatio: 0.05, mask: [page.locator("text=/\\d{1,2}:\\d{2}\\s*(AM|PM)/i")] }, // message timestamps
    );
  });

  test("laboratory finder API response shape (real data + map-provider-blocked, captured as rendered JSON for visibility in reports)", async ({ page }) => {
    // No dedicated UI page exists for THIS route yet (find-laboratories is
    // API-only; the laboratory directory UI lives at /testing/laboratory-search
    // against /api/v1/laboratories instead) — screenshotting the raw JSON
    // response is the honest equivalent of a visual for an API-only feature.
    await page.goto("about:blank");
    const res = await page.request.post("/api/v1/find-laboratories", { data: { location: "Delhi" } });
    const body = await res.json();
    await page.setContent(`<pre style="font-family:monospace;padding:16px;">${JSON.stringify(body, null, 2)}</pre>`);
    await expect(page).toHaveScreenshot("laboratory-finder-blocked.png");
  });
});
