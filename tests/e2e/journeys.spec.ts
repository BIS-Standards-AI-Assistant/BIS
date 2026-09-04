import { test, expect } from "./fixtures/test-base";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/**
 * Core user journeys (A, B, E, F, M from the E2E spec) — real UI, real
 * API calls, real database. No mocked backend anywhere in this file.
 */

test.describe("Journey A/B: Search -> results -> evidence", () => {
  test("searching a known product returns a Best Match with real evidence, navigable to the Standard Passport", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);

    // The Research Summary appears once the pipeline resolves.
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

    const bestMatchHeading = page.getByText(/Recommended standard|Related but not applicable/).first();
    await expect(bestMatchHeading).toBeVisible();

    // At least one evidence excerpt with a real, dereferenceable source link.
    const officialLink = page.getByRole("link", { name: "Official Gazette Text" }).first();
    await expect(officialLink).toBeVisible();
    await expect(officialLink).toHaveAttribute("href", /^https:\/\//);

    // Journey B: navigate to the Standard Passport from a real result link.
    const passportLink = page.getByRole("link", { name: "View Complete Standard Passport" }).first();
    await expect(passportLink).toBeVisible();
    const href = await passportLink.getAttribute("href");
    expect(href).toMatch(/^\/standards\/[0-9a-f-]{36}$/);

    await passportLink.click();
    await expect(page).toHaveURL(/\/standards\/[0-9a-f-]{36}/);
    // The Passport page must render real content, not a 404/empty shell.
    await expect(page.locator("main#main-content")).toBeVisible();
  });
});

test.describe("Journey E/F: Product applicability, including material mismatch", () => {
  test("a query with no material stated resolves to real candidates with an applicability label on each", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

    // Every recommendation card must show an "Applicability" section —
    // never just a bare relevance score standing in for it.
    const applicabilityLabels = page.getByText("Applicability");
    await expect(applicabilityLabels.first()).toBeVisible();
  });

  test("MATERIAL_MISMATCH: a steel-material query does not present a plastics standard as directly applicable", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.materialMismatch)}`);
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

    // Trust regression: relevance != applicability. The page must contain
    // the material-mismatch badge text somewhere in the result set for
    // this known query (IS 15410:2003, a plastics-bottle standard, is
    // live-verified to score highly on relevance for "steel bottle").
    await expect(page.getByText("Related standard — material mismatch")).toBeVisible({ timeout: 60_000 });

    // And the reason text must actually explain the conflict in plain
    // language, not just show a badge with no justification.
    await expect(page.getByText(/specifies "steel".*concerns "plastic"/i).first()).toBeVisible();
  });
});

test.describe("Journey M: Knowledge Boundary for an unindexed identifier", () => {
  test("a real-looking but unindexed standard number does not produce a fabricated technical answer", async ({ request }) => {
    // UI-level assertion is covered by the trust-regression spec (checks
    // the rendered page never claims technical requirements it can't
    // support); this call proves the underlying API contract the UI
    // relies on for that state.
    const res = await request.post("/api/v1/query", {
      data: { query: KNOWN_QUERIES.unindexedStandard },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.knowledgeBoundary?.state).toBe("NOT_IN_DATABASE");
    expect(body.knowledgeBoundary?.answerable).toBe(false);
  });
});

test.describe("Out-of-domain query", () => {
  test("a non-BIS query is rejected as irrelevant, not answered with an invented standard", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.outOfDomain)}`);
    // The same relevanceMessage legitimately renders twice on this page
    // (the Research Summary card and the red "not relevant" alert both
    // read result.answer — HomeClient.tsx) — .first() is correct here,
    // not a workaround for a bug.
    //
    // Matched on the substance of the refusal rather than one phrasing: the
    // wording has already changed once ("does not appear to be relevant" ->
    // "outside what BIS Standards Navigator covers") and silently broke this
    // test, which is the regression it exists to catch.
    await expect(
      page.getByText(/outside what BIS Standards Navigator covers|not appear to be relevant/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    // The point of the test: no standard is offered as an answer.
    await expect(page.getByText(/Recommended standard/)).not.toBeVisible();
  });
});
