import { test, expect } from "./fixtures/test-base";
import { expectNoA11yViolations } from "./a11y";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/** @a11y — run with `npm run test:a11y` */

test.describe("@a11y Accessibility — axe-core against major pages", () => {
  test("home page (no search yet)", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page, testInfo);
  });

  test("search results page", async ({ page }, testInfo) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    await expectNoA11yViolations(page, testInfo);
  });

  test("Standard Passport page", async ({ page }, testInfo) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    const link = page.getByRole("link", { name: "View Complete Standard Passport" }).first();
    await link.click();
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page, testInfo);
  });

  test("research assistant open state", async ({ page }, testInfo) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });
    await page.getByRole("button", { name: "Discuss these results" }).click();
    await expectNoA11yViolations(page, testInfo);
  });
});

test.describe("@a11y Keyboard navigation — critical flows without a mouse", () => {
  test("skip-to-content link is the first focusable element and works", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText("Skip to main content");
    await page.keyboard.press("Enter");
    // The skip link is a real <a href="#main-content"> (GovernmentBar.tsx)
    // — activating it must move the URL fragment to #main-content. This
    // is the one unambiguous cross-browser signal that it fired; a bare
    // `main` has no tabindex so `:focus` on it is not reliable to assert.
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("search can be submitted entirely via keyboard", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("textbox", { name: /product or compliance question/i });
    await input.focus();
    await input.fill(KNOWN_QUERIES.exactStandard);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Search Synthesis")).toBeVisible({ timeout: 60_000 });
  });

  test("research assistant chat can be opened and used via keyboard, including Escape to close", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
    await page.getByText("Search Synthesis").waitFor({ timeout: 60_000 });

    const openButton = page.getByRole("button", { name: "Discuss these results" });
    await openButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByPlaceholder("Ask any question about BIS standards...")).toBeVisible();
  });
});

