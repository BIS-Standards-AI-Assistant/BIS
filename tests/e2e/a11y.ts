import { AxeBuilder } from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared axe-core runner. Scans the whole page (or a specific region via
 * `include`), fails the test on any violation, and attaches the full
 * violation list to the Playwright report so a failure is diagnosable
 * without re-running locally.
 */
export async function expectNoA11yViolations(
  page: Page,
  testInfo: TestInfo,
  opts: { include?: string; excludeRules?: string[] } = {},
) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (opts.include) builder = builder.include(opts.include);
  if (opts.excludeRules) builder = builder.disableRules(opts.excludeRules);

  const results = await builder.analyze();

  await testInfo.attach("axe-violations", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  expect(results.violations, `axe-core found ${results.violations.length} violation(s): ${results.violations.map((v) => v.id).join(", ")}`).toEqual([]);
}
