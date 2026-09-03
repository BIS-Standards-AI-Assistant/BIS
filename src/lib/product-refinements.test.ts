import { describe, it, expect } from "vitest";
import { getProductRefinements, isForbiddenGeneric } from "./product-refinements";

describe("product-refinements exact measurements", () => {
  it("detects water bottle products and provides exact volume measurements and specs", () => {
    const results = getProductRefinements("Steel water bottle");
    expect(results).toContain("1 Litre");
    expect(results).toContain("750 ml");
    expect(results).toContain("500 ml");
    expect(results).toContain("Vacuum Insulated");
    expect(results).toContain("Stainless Steel 304");
    expect(results.some((r) => isForbiddenGeneric(r))).toBe(false);
  });

  it("detects pressure cooker and provides exact litre capacities", () => {
    const results = getProductRefinements("pressure cooker");
    expect(results).toContain("3 Litre");
    expect(results).toContain("5 Litre");
    expect(results).toContain("2 Litre");
  });

  it("detects LED bulbs and provides wattage ratings", () => {
    const results = getProductRefinements("led bulb");
    expect(results).toContain("9 Watt");
    expect(results).toContain("12 Watt");
    expect(results).toContain("15 Watt");
  });

  it("detects wire and cable and provides cross-section dimensions", () => {
    const results = getProductRefinements("copper wire");
    expect(results).toContain("1.5 sq mm");
    expect(results).toContain("2.5 sq mm");
  });

  it("detects PVC pipes and provides diameter measurements", () => {
    const results = getProductRefinements("pvc pipes");
    expect(results).toContain("20 mm (1/2 inch)");
    expect(results).toContain("25 mm (3/4 inch)");
  });

  it("correctly flags generic placeholder labels as forbidden", () => {
    expect(isForbiddenGeneric("intended use")).toBe(true);
    expect(isForbiddenGeneric("material grade")).toBe(true);
    expect(isForbiddenGeneric("size or capacity")).toBe(true);
    expect(isForbiddenGeneric("target age group")).toBe(true);
    expect(isForbiddenGeneric("1 Litre")).toBe(false);
  });
});
