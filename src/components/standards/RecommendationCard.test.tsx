import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationCard } from "./RecommendationCard";
import type { Recommendation } from "@/types/api";

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    standardNumber: "IS 5522:2014",
    title: "Stainless Steel Sheets and Strips for Utensils",
    relevanceScore: 0.95,
    groundingState: "verified",
    reason: "This standard directly addresses the query.",
    coverage: {
      product: "covered", material: "covered", application: "unknown", targetUser: "unknown",
      sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
      overallCoverageRatio: 1,
    },
    evidence: [],
    applicability: { state: "DIRECTLY_APPLICABLE", reason: "Evidence directly supports this standard applying to the query.", materialConflict: false },
    recommendationStatus: "RECOMMENDED",
    primaryRecommendation: true,
    ...overrides,
  };
}

// 2026-09-04 bug: "I want to manufacture steel pipes" surfaced the real
// IS 4985:2021 (PVC pipes) with "High relevance" + "Directly supported by
// evidence" while the Applicability badge said "material mismatch" —
// the two halves of the same card contradicted each other. These tests
// pin the fixed behavior: a blocked candidate must never show the
// high-relevance/directly-supported styling, and must visibly say it is
// not a recommendation.
describe("RecommendationCard — applicability gate rendering", () => {
  test("a primary (RECOMMENDED) candidate shows the normal relevance + grounding language", () => {
    render(<RecommendationCard recommendation={recommendation()} />);
    expect(screen.getByText("High relevance")).toBeInTheDocument();
    expect(screen.getByText("Directly supported by evidence")).toBeInTheDocument();
    expect(screen.queryByText("Related but not applicable")).not.toBeInTheDocument();
  });

  test("a MATERIAL_MISMATCH candidate never shows 'High relevance' or 'Directly supported by evidence', even with a high relevanceScore and verified grounding", () => {
    const blocked = recommendation({
      standardNumber: "IS 4985:2021",
      title: "Unplasticized Polyvinyl Chloride (PVC-U) Pipes for Potable Water Supplies - Specification",
      relevanceScore: 0.95, // deliberately high — must not leak into the rendered label
      groundingState: "verified", // deliberately strong — must not leak into the rendered label either
      applicability: {
        state: "MATERIAL_MISMATCH",
        reason: 'The query specifies "steel", but this standard\'s title concerns "plastic" — applicability to a steel product is not established by the available evidence.',
        materialConflict: true,
      },
      recommendationStatus: "RELATED_BUT_NOT_APPLICABLE",
      primaryRecommendation: false,
    });
    render(<RecommendationCard recommendation={blocked} />);

    expect(screen.queryByText("High relevance")).not.toBeInTheDocument();
    expect(screen.queryByText("Directly supported by evidence")).not.toBeInTheDocument();
    expect(screen.getByText("Related to your search")).toBeInTheDocument();
    expect(screen.getByText("Standard information verified")).toBeInTheDocument();
    expect(screen.getByText("Related but not applicable")).toBeInTheDocument();
    expect(screen.getByText("Related standard — material mismatch")).toBeInTheDocument();
  });

  test("a blocked candidate's applicability reason (the material mismatch explanation) is always visible", () => {
    const blocked = recommendation({
      applicability: {
        state: "MATERIAL_MISMATCH",
        reason: "The query specifies steel, but this standard concerns plastic.",
        materialConflict: true,
      },
      recommendationStatus: "RELATED_BUT_NOT_APPLICABLE",
      primaryRecommendation: false,
    });
    render(<RecommendationCard recommendation={blocked} />);
    expect(screen.getByText("The query specifies steel, but this standard concerns plastic.")).toBeInTheDocument();
  });

  test("CONFLICTING_EVIDENCE and INSUFFICIENT_EVIDENCE statuses also render as non-primary, not as a recommendation", () => {
    for (const status of ["CONFLICTING_EVIDENCE", "INSUFFICIENT_EVIDENCE"] as const) {
      const { unmount } = render(
        <RecommendationCard recommendation={recommendation({ recommendationStatus: status, primaryRecommendation: false })} />,
      );
      expect(screen.getByText("Related but not applicable")).toBeInTheDocument();
      expect(screen.queryByText("High relevance")).not.toBeInTheDocument();
      unmount();
    }
  });
});
