import { describe, test, expect } from "vitest";
import { buildComplianceMap } from "./compliance-map";
import type { Recommendation } from "@/types/api";

/**
 * Regression tests for a real fabrication defect. Before this module
 * existed, the compliance map was assembled from hardcoded literals: every
 * result — whatever the query, whatever the standard — was given an "ISI
 * Mark Scheme (Scheme-I)" certification row with status "Mandatory (QCO
 * Active)", two invented test names ("Electrical Safety & Performance",
 * "Mechanical Strength") against invented clause numbers ("Section 4.1",
 * "Section 5"), and a laboratory list whose coordinates came from
 * `Math.random()`. All of it rendered to users as fact.
 *
 * These tests run against the real reference dataset
 * (data/bis-standards-dataset/qco-standards.json) rather than a mock, so
 * they fail if the loader stops matching real entries as well as if
 * fabricated ones reappear.
 */
function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    standardNumber: "IS 5522:2014",
    title: "Stainless Steel Sheets and Strips for Utensils",
    relevanceScore: 0.8,
    groundingState: "verified",
    reason: "test fixture",
    coverage: {
      identifier: "covered",
      dimensions: [],
      overallCoverageRatio: 1,
      missingDimensions: [],
    },
    applicability: { verdict: "APPLICABLE", reason: "test fixture", signals: [] },
    recommendationStatus: "recommended",
    primaryRecommendation: true,
    evidence: [],
    ...overrides,
  } as unknown as Recommendation;
}

describe("compliance map — real reference data only", () => {
  test("populates certification and testing from the real dataset entry for a matched standard", async () => {
    const map = await buildComplianceMap([rec()]);

    expect(map.certifications).toHaveLength(1);
    const cert = map.certifications[0];
    expect(cert.standardNumber).toBe("IS 5522:2014");
    // Sourced, not asserted by this module.
    expect(cert.scheme).toBeTruthy();
    expect(cert.sourceUrl).toMatch(/^https?:\/\//);
    expect(map.testing.length).toBeGreaterThan(0);
    expect(map.unmatchedStandards).toEqual([]);
  });

  test("no testing row carries a clause number — the reference dataset has none", async () => {
    const map = await buildComplianceMap([rec()]);
    for (const t of map.testing) {
      expect(t).not.toHaveProperty("clause");
      // The specific invented values the old implementation emitted.
      expect(JSON.stringify(t)).not.toMatch(/Section 4\.1|Section 5\b/);
    }
  });

  test("does not attach a scheme to a standard with no reference entry", async () => {
    // IS 14543:2016 is genuinely indexed, and is exactly the case that
    // makes this matter: the reference dataset carries IS 14543 at the
    // 2024 edition, not 2016, so there is no entry for the edition we
    // actually hold. The old code would still have claimed ISI Scheme-I
    // and a mandatory QCO for it.
    const map = await buildComplianceMap([
      rec({ standardNumber: "IS 14543:2016", title: "Packaged Drinking Water" }),
    ]);
    expect(map.certifications).toEqual([]);
    expect(map.testing).toEqual([]);
    expect(map.unmatchedStandards).toEqual(["IS 14543:2016"]);
  });

  test("does not match across editions", async () => {
    // A different year can carry different certification requirements, so
    // a near-miss must be reported as unmatched, never resolved to the
    // closest edition.
    const map = await buildComplianceMap([rec({ standardNumber: "IS 5522:1999" })]);
    expect(map.certifications).toEqual([]);
    expect(map.unmatchedStandards).toEqual(["IS 5522:1999"]);
  });

  test("a fabricated standard number yields nothing at all", async () => {
    const map = await buildComplianceMap([
      rec({ standardNumber: "IS 99999:2099", title: "Nonexistent Standard" }),
    ]);
    expect(map.certifications).toEqual([]);
    expect(map.testing).toEqual([]);
    expect(map.unmatchedStandards).toEqual(["IS 99999:2099"]);
  });

  test("ignores candidates the applicability gate excluded", async () => {
    // Non-primary candidates are shown as context, not as the system's
    // recommendation, so they must not pull certification claims in.
    const map = await buildComplianceMap([
      rec({ standardNumber: "IS 5522:2014", primaryRecommendation: false }),
    ]);
    expect(map.standards).toEqual([]);
    expect(map.certifications).toEqual([]);
    expect(map.unmatchedStandards).toEqual([]);
  });

  test("mandatoryQco is read from the dataset, not assumed true", async () => {
    const map = await buildComplianceMap([rec()]);
    expect(typeof map.certifications[0].mandatoryQco).toBe("boolean");
  });

  test("an empty recommendation set produces an empty map, not a default one", async () => {
    const map = await buildComplianceMap([]);
    expect(map).toEqual({ standards: [], certifications: [], testing: [], unmatchedStandards: [] });
  });
});
