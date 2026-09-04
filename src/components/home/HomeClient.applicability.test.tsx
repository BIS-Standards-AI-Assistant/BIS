import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { HomeClient } from "./HomeClient";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import type { QueryResponse, Recommendation } from "@/types/api";

/**
 * End-to-end regression for the 2026-09-04 applicability-gate bug:
 * "I want to manufacture steel pipes" surfaced the real IS 4985:2021
 * (Unplasticized PVC Pipes) as a primary recommendation labeled "High
 * relevance" / "Directly supported by evidence", despite the server
 * already detecting a material mismatch. This test exercises the same
 * rendering path RecommendationCard.test.tsx tests in isolation, but
 * here through the actual HomeClient result screen, with a mocked
 * server response shaped exactly like the real bug (one applicable
 * candidate, one material-mismatched candidate) — the server response
 * is the authoritative source of recommendationStatus/
 * primaryRecommendation; this test never re-derives it client-side.
 */

function renderHome() {
  return render(
    <LanguageProvider>
      <HomeClient />
    </LanguageProvider>,
  );
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    standardNumber: "IS 5522:2014",
    title: "Stainless Steel Sheets and Strips for Utensils",
    relevanceScore: 0.9,
    groundingState: "verified",
    reason: "This standard directly addresses steel products.",
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

function baseResponse(overrides: Partial<QueryResponse> = {}): QueryResponse {
  return {
    answer: "test answer",
    intent: "find_applicable_standard",
    interpretation: {
      product: "steel pipes", material: "steel", useCase: null, targetUser: null, sector: null,
      certificationRequested: false, testingRequested: false,
    },
    recommendations: [],
    certification: { available: false, notes: null },
    testing: { available: false, notes: null },
    nextSteps: [],
    confidence: "high",
    engineConfidence: { score: 0.9, band: "high", groundingState: "verified", supportingSignals: [], limitingSignals: [] },
    conflicts: [],
    limitations: [],
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomeClient — applicability gate (steel pipes / PVC standard regression)", () => {
  test("a real material-mismatched candidate (IS 4985:2021) never appears under 'Recommended standards', always under 'Related but not applicable'", async () => {
    const pvcMismatch = recommendation({
      standardNumber: "IS 4985:2021",
      title: "Unplasticized Polyvinyl Chloride (PVC-U) Pipes for Potable Water Supplies - Specification",
      relevanceScore: 0.95, // deliberately high, as in the real bug report
      groundingState: "verified", // deliberately strong, as in the real bug report
      reason: "Retrieved because it is a pipe standard.",
      applicability: {
        state: "MATERIAL_MISMATCH",
        reason: 'The query specifies "steel", but this standard\'s title concerns "plastic" — applicability to a steel product is not established by the available evidence.',
        materialConflict: true,
      },
      recommendationStatus: "RELATED_BUT_NOT_APPLICABLE",
      primaryRecommendation: false,
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ recommendations: [pvcMismatch] }),
    });

    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "I want to manufacture steel pipes" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // IS 4985:2021 legitimately appears twice: once auto-populated into the
    // left Sources panel from this same query's retrieval, and once as the
    // blocked recommendation card itself — assert presence, not uniqueness.
    await waitFor(() => expect(screen.getAllByText("IS 4985:2021").length).toBeGreaterThan(0));

    // The section heading itself must say this is NOT a recommendation.
    expect(screen.getByText("Related but not applicable (1)")).toBeInTheDocument();
    expect(screen.queryByText(/^Recommended standards?/)).not.toBeInTheDocument();

    // The centre list is now a compact row (RecommendationRow) — the
    // exact misleading combination from the bug report ("High relevance" /
    // "Directly supported by evidence") must never appear there, and the
    // row's own applicability badge must say material mismatch, not
    // endorse the candidate.
    expect(screen.queryByText("High relevance")).not.toBeInTheDocument();
    expect(screen.queryByText("Directly supported by evidence")).not.toBeInTheDocument();
    expect(screen.getByText("Related standard — material mismatch")).toBeInTheDocument();
  });

  test("positive control: a real, applicable steel standard renders under 'Recommended standards' with full relevance/grounding language", async () => {
    const goodMatch = recommendation(); // IS 5522:2014, primaryRecommendation: true, by default above

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ recommendations: [goodMatch] }),
    });

    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "I want to manufacture steel utensils" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // An applicable standard legitimately appears twice: on its result card
    // and as a research-context chip beside the conversation. That is the
    // correct behaviour — only material-mismatched candidates are kept out
    // of context — so assert presence rather than uniqueness here.
    await waitFor(() => expect(screen.getAllByText("IS 5522:2014").length).toBeGreaterThan(0));

    expect(screen.getByText("Recommended standard")).toBeInTheDocument();
    expect(screen.queryByText("Related but not applicable")).not.toBeInTheDocument();
    expect(screen.getByText("Directly applicable")).toBeInTheDocument();

    // The full relevance/grounding language lives in the popup opened from
    // the compact row, not inline in the centre list.
    fireEvent.click(screen.getByText("View evidence →"));
    expect(screen.getByText("High relevance")).toBeInTheDocument();
    expect(screen.getByText("Directly supported by evidence")).toBeInTheDocument();
  });

  test("mixed response: one recommended and one blocked candidate render in visibly separate sections, in the same query", async () => {
    const goodMatch = recommendation();
    const pvcMismatch = recommendation({
      standardNumber: "IS 4985:2021",
      title: "Unplasticized Polyvinyl Chloride (PVC-U) Pipes for Potable Water Supplies - Specification",
      applicability: { state: "MATERIAL_MISMATCH", reason: "Material mismatch.", materialConflict: true },
      recommendationStatus: "RELATED_BUT_NOT_APPLICABLE",
      primaryRecommendation: false,
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => baseResponse({ recommendations: [goodMatch, pvcMismatch] }),
    });

    renderHome();
    fireEvent.change(screen.getByLabelText(/Describe your product or compliance question/i), { target: { value: "steel pipes and utensils" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // Same auto-populated-left-panel duplication as above.
    await waitFor(() => expect(screen.getAllByText("IS 4985:2021").length).toBeGreaterThan(0));

    const recommendedHeading = screen.getByText("Recommended standard");
    const relatedHeading = screen.getByText("Related but not applicable (1)");
    // The recommended standard's card must sit before the related heading
    // in document order, and the blocked one after it.
    expect(recommendedHeading.compareDocumentPosition(relatedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const relatedSection = relatedHeading.closest("div")!.parentElement!;
    expect(within(relatedSection).getByText("IS 4985:2021")).toBeInTheDocument();
  });
});
