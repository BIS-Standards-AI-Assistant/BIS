import { test, expect } from "./fixtures/test-base";
import { KNOWN_QUERIES } from "./fixtures/known-data";

/** @responsive — run with `npm run test:responsive` */

const BREAKPOINTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

for (const bp of BREAKPOINTS) {
  test.describe(`@responsive ${bp.name} (${bp.width}x${bp.height})`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test("search input is visible and usable, no horizontal page scroll", async ({ page }) => {
      await page.goto("/");
      const input = page.getByRole("textbox", { name: /product or compliance question/i });
      await expect(input).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalScroll).toBe(false);

      await input.fill(KNOWN_QUERIES.exactStandard);
      await input.press("Enter");
      await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });
    });

    test("results render without horizontal overflow and the Best Match section is reachable", async ({ page }) => {
      await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
      await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalScroll).toBe(false);

      const bestMatch = page.getByText(/Best match|Related standard/).first();
      await bestMatch.scrollIntoViewIfNeeded();
      await expect(bestMatch).toBeVisible();
    });

    test("research assistant chat is usable at this breakpoint", async ({ page }) => {
      await page.goto(`/?q=${encodeURIComponent(KNOWN_QUERIES.exactStandard)}`);
      await expect(page.getByText("Research Summary")).toBeVisible({ timeout: 60_000 });

      const chatButton = page.getByRole("button", { name: "Discuss these results" });
      await chatButton.scrollIntoViewIfNeeded();
      await chatButton.click();
      await expect(page.getByPlaceholder("Ask any question about BIS standards...")).toBeVisible();
    });
  });
}
