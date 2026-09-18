import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationsList } from "./RecommendationsList";
import type { Recommendation } from "@/types/api";

function related(standardNumber: string, title: string): Recommendation {
  return {
    standardNumber,
    title,
    relevanceScore: 0.2,
    groundingState: "insufficient_evidence",
    reason: "Loosely related.",
    coverage: {
      product: "not_covered", material: "unknown", application: "unknown", targetUser: "unknown",
      sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
      overallCoverageRatio: 0,
    },
    evidence: [],
    applicability: { state: "INSUFFICIENT_EVIDENCE", reason: "Not established.", materialConflict: false },
    recommendationStatus: "INSUFFICIENT_EVIDENCE",
    primaryRecommendation: false,
  };
}

// 2026-09-18: on the refused query "turbine blade coatings for aircraft jet
// engines", tyres / mineral water / cookware were listed openly under the
// refusal. On a refusal they must sit behind a disclosure, not read as results.
const candidates = [
  related("IS 15636:2012", "PNEUMATIC TYRES FOR COMMERCIAL VEHICLES"),
  related("IS 13428:2005", "PACKAGED NATURAL MINERAL WATER"),
];

describe("RecommendationsList — related candidates on a refusal", () => {
  test("collapseRelated puts related candidates behind a closed disclosure", () => {
    const { container } = render(<RecommendationsList recommendations={candidates} onOpen={() => {}} collapseRelated />);
    expect(screen.getByText("Show loosely related results (2)")).toBeInTheDocument();
    expect(screen.queryByText(/Related but not applicable/)).not.toBeInTheDocument();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
  });

  test("without collapseRelated the related list renders openly as before", () => {
    render(<RecommendationsList recommendations={candidates} onOpen={() => {}} />);
    expect(screen.getByText("Related but not applicable (2)")).toBeInTheDocument();
    expect(screen.queryByText(/Show loosely related results/)).not.toBeInTheDocument();
  });
});
