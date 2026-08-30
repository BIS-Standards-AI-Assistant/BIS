import { describe, test, expect } from "vitest";
import { loadCertificationSchemes, findCertificationSchemeForStandard } from "./certification-schemes";

describe("findCertificationSchemeForStandard", () => {
  test("returns null for a standard number not in the reference dataset — never guesses", async () => {
    const result = await findCertificationSchemeForStandard("IS 99999:2099");
    expect(result).toBeNull();
  });

  test("returns null for a null standard number", async () => {
    const result = await findCertificationSchemeForStandard(null);
    expect(result).toBeNull();
  });

  test("matches a real entry exactly by standard number, case-insensitively", async () => {
    const result = await findCertificationSchemeForStandard("is 269:2015");
    expect(result?.standardNumber).toBe("IS 269:2015");
  });

  test("does not match across different editions of the same base standard", async () => {
    // The dataset has IS 4151:2015; a query for a different edition of the
    // same base number must not silently match it.
    const result = await findCertificationSchemeForStandard("IS 4151:2020");
    expect(result).toBeNull();
  });
});

describe("loadCertificationSchemes", () => {
  test("every loaded item has a real, traceable standard number (never blank/fabricated)", async () => {
    const items = await loadCertificationSchemes();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      // Matches "IS 5522:2014" and the joint "IS/ISO 80601-2-56:2017" form.
      expect(item.standardNumber).toMatch(/^IS[/ ]/);
    }
  });
});
