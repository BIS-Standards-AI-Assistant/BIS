import { describe, test, expect } from "vitest";
import { assessApplicability, detectMaterialFamily } from "./applicability";
import type { CoverageResult } from "./coverage-analysis";

function coverage(overrides: Partial<CoverageResult> = {}): CoverageResult {
  return {
    product: "unknown",
    material: "unknown",
    application: "unknown",
    targetUser: "unknown",
    sector: "unknown",
    testing: "unknown",
    certification: "unknown",
    identifier: "unknown",
    overallCoverageRatio: 1,
    ...overrides,
  };
}

describe("detectMaterialFamily", () => {
  test("finds steel from 'steel bottle'", () => {
    expect(detectMaterialFamily("steel bottle")).toBe("steel");
  });
  test("finds plastic from a standard title", () => {
    expect(detectMaterialFamily("Plastics Bottles/Containers for Packaged Natural Mineral Water")).toBe("plastic");
  });
  test("returns null for text with no known material", () => {
    expect(detectMaterialFamily("pressure cooker safety requirements")).toBeNull();
  });
  test("returns null for null/empty input", () => {
    expect(detectMaterialFamily(null)).toBeNull();
    expect(detectMaterialFamily("")).toBeNull();
  });
});

describe("assessApplicability", () => {
  test("steel query vs plastic-titled standard -> MATERIAL_MISMATCH, even with high grounding/coverage", () => {
    const result = assessApplicability({
      query: "steel bottle for drinking water",
      intentMaterial: null,
      candidateTitle: "Plastics Bottles/Containers for Packaged Natural Mineral Water and Packaged Drinking Water",
      coverage: coverage({ product: "covered", overallCoverageRatio: 1 }),
      groundingState: "verified",
    });
    expect(result.state).toBe("MATERIAL_MISMATCH");
    expect(result.materialConflict).toBe(true);
    expect(result.reason).toContain("steel");
    expect(result.reason).toContain("plastic");
  });

  test("uses structured intent.material over a raw-query guess when both are present", () => {
    const result = assessApplicability({
      query: "container for water, steel preferred",
      intentMaterial: "stainless steel",
      candidateTitle: "Plastics Bottles/Containers Specification",
      coverage: coverage(),
      groundingState: "verified",
    });
    expect(result.state).toBe("MATERIAL_MISMATCH");
  });

  test("no material mentioned anywhere -> not a mismatch, falls through to grounding-based state", () => {
    const result = assessApplicability({
      query: "domestic pressure cooker",
      intentMaterial: null,
      candidateTitle: "Domestic Pressure Cooker",
      coverage: coverage({ product: "covered", overallCoverageRatio: 1 }),
      groundingState: "verified",
    });
    expect(result.state).toBe("DIRECTLY_APPLICABLE");
    expect(result.materialConflict).toBe(false);
  });

  test("same material family on both sides -> no mismatch", () => {
    const result = assessApplicability({
      query: "stainless steel utensils",
      intentMaterial: "steel",
      candidateTitle: "Stainless Steel Sheets and Strips for Utensils",
      coverage: coverage({ product: "covered", overallCoverageRatio: 1 }),
      groundingState: "verified",
    });
    expect(result.state).toBe("DIRECTLY_APPLICABLE");
  });

  test("insufficient_evidence grounding always wins over a would-be DIRECTLY_APPLICABLE coverage shape", () => {
    const result = assessApplicability({
      query: "pressure cooker",
      intentMaterial: null,
      candidateTitle: "Domestic Pressure Cooker",
      coverage: coverage({ product: "covered", overallCoverageRatio: 1 }),
      groundingState: "insufficient_evidence",
    });
    expect(result.state).toBe("INSUFFICIENT_EVIDENCE");
  });

  test("material mismatch takes priority even over insufficient_evidence grounding", () => {
    const result = assessApplicability({
      query: "steel bottle",
      intentMaterial: null,
      candidateTitle: "Plastics Bottles/Containers Specification",
      coverage: coverage(),
      groundingState: "insufficient_evidence",
    });
    expect(result.state).toBe("MATERIAL_MISMATCH");
  });

  test("no product coverage and low overall ratio -> SCOPE_UNCLEAR, not silently applicable", () => {
    const result = assessApplicability({
      query: "helmet for construction workers",
      intentMaterial: null,
      candidateTitle: "Domestic Pressure Cooker",
      coverage: coverage({ product: "not_covered", overallCoverageRatio: 0.1 }),
      groundingState: "supported_inference",
    });
    expect(result.state).toBe("SCOPE_UNCLEAR");
  });

  test("supported_inference with decent coverage and no conflict -> POTENTIALLY_APPLICABLE", () => {
    const result = assessApplicability({
      query: "helmet",
      intentMaterial: null,
      candidateTitle: "Protective Helmet for Two Wheeler Riders",
      coverage: coverage({ product: "covered", overallCoverageRatio: 0.7 }),
      groundingState: "supported_inference",
    });
    expect(result.state).toBe("POTENTIALLY_APPLICABLE");
  });
});
