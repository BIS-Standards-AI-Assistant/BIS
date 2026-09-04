import { test, expect } from "./fixtures/test-base";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/**
 * Journeys C (Search -> Passport -> Research Assistant) and D (scoped
 * follow-up -> explicit global expansion). Drives the real BisChatBot
 * component against the real /api/v1/chat endpoint.
 */

test.describe("Journey C/D: Research Assistant — scoped context, then explicit global expansion", () => {
  test("chat opens scoped to the current results and stays scoped for context/evidence/missing-info questions", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: "Discuss these results" }).click();
    await expect(page.getByText(`Discussing: "${KNOWN_QUERIES.exactStandard}"`)).toBeVisible();

    const input = page.getByPlaceholder("Ask any question about BIS standards...");

    // Why relevant — must stay scoped (no "Wider BIS search" badge).
    await input.fill(KNOWN_QUERIES.chatWhyRelevant);
    await input.press("Enter");
    await expect(page.getByText(/don't have enough evidence|indexed evidence includes/i).last()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Wider BIS search")).not.toBeVisible();

    // Show evidence — must stay scoped.
    await input.fill(KNOWN_QUERIES.chatShowEvidence);
    await input.press("Enter");
    await expect(page.getByText(/Indexed evidence for|don't have enough evidence/i).last()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Wider BIS search")).not.toBeVisible();

    // What's missing — must stay scoped.
    await input.fill(KNOWN_QUERIES.chatMissingInfo);
    await input.press("Enter");
    await expect(page.locator("text=/not confirmed by indexed evidence|no specific evidence gap/i").last()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Wider BIS search")).not.toBeVisible();

    // Explicit wider search — MUST switch scope, MUST be visibly labeled.
    await input.fill(KNOWN_QUERIES.chatWiderSearch);
    await input.press("Enter");
    await expect(page.getByText("Wider BIS search").last()).toBeVisible({ timeout: 60_000 });
  });

  test("chat context is isolated per search — a fresh query resets the discussion scope", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Discuss these results" }).click();
    await expect(page.getByText(`Discussing: "${KNOWN_QUERIES.exactStandard}"`)).toBeVisible();

    // Run a new, different search. The results page no longer has a second
    // inline search box — "the centre is a research conversation, not a
    // second search box" (src/components/home/HomeClient.tsx) — so a new
    // search now goes through the header's global Search overlay instead.
    await page.getByRole("button", { name: "Search the site" }).click();
    const searchInput = page.getByRole("textbox", { name: "Search BIS Standards, Services & Documents" });
    await searchInput.fill(KNOWN_QUERIES.materialMismatch);
    await searchInput.press("Enter");
    await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

    // The chat's context indicator must reflect the NEW query, not the old one.
    await expect(page.getByText(`Discussing: "${KNOWN_QUERIES.materialMismatch}"`)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Research Assistant API contract — server resolves context, never trusts client facts", () => {
  test("scoped chat call with a real standardNumber and no client-supplied evidence text returns real, DB-resolved evidence", async ({ request }) => {
    const res = await request.post("/api/v1/chat", {
      data: {
        originalQuery: KNOWN_QUERIES.exactStandard,
        standardNumbers: [KNOWN_QUERIES.exactStandard],
        message: KNOWN_QUERIES.chatShowEvidence,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.scope).toBe("current_results");
    if (body.evidence.length > 0) {
      expect(body.evidence[0].standardNumber).toBe(KNOWN_QUERIES.exactStandard);
    }
  });

  test("a fabricated standardNumber the client claims is real resolves to no evidence, never invented content", async ({ request }) => {
    const res = await request.post("/api/v1/chat", {
      data: {
        originalQuery: "test",
        standardNumbers: ["IS 00000:0000"],
        message: KNOWN_QUERIES.chatShowEvidence,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.resolvedStandards).toEqual([]);
    expect(body.evidence).toEqual([]);
  });
});
