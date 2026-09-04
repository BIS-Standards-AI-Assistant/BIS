import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { generateAnswer, type EvidencePackage } from "./answer";
import { resetProviderCooldowns } from "./providers";

const prevProvider = process.env.LLM_PROVIDER;
beforeEach(() => {
  process.env.LLM_PROVIDER = "none"; // force the deterministic evidence-only path
  resetProviderCooldowns();
});
afterEach(() => {
  if (prevProvider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = prevProvider;
});

function pkg(overrides: Partial<EvidencePackage> = {}): EvidencePackage {
  return {
    query: "test",
    intent: {
      intent: "find_applicable_standard",
      isRelevant: true,
      relevanceMessage: null,
      product: "widget",
      material: null,
      useCase: null,
      targetUser: null,
      sector: null,
      certificationRequested: false,
      testingRequested: false,
      searchQuery: "widget",
      missingInformation: [],
    },
    candidates: [
      {
        standardNumber: "IS 14543:2016",
        title: "Packaged Drinking Water",
        groundingState: "verified",
        coverage: {
          product: "covered", material: "unknown", application: "unknown", targetUser: "unknown",
          sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
          overallCoverageRatio: 0.5,
        },
        chunks: [{ chunkId: "c1", section: null, clause: null, text: "Some evidence text." }],
        primaryRecommendation: true,
        applicabilityReason: "",
      },
    ],
    conflicts: [],
    engineConfidence: { score: 0.5, band: "medium", groundingState: "verified", supportingSignals: [], limitingSignals: [] },
    ...overrides,
  };
}

describe("generateAnswer — language handling with no provider", () => {
  test("English request: no language-fallback note", async () => {
    const a = await generateAnswer(pkg(), { answerLanguage: "en" });
    expect(a.limitations.join(" ")).not.toMatch(/was not available/i);
  });

  test("Hindi request without a provider: English summary + an explicit note that Hindi was unavailable", async () => {
    const a = await generateAnswer(pkg(), { answerLanguage: "hi" });
    expect(a.limitations.join(" ")).toMatch(/Hindi/);
    expect(a.limitations.join(" ")).toMatch(/not available|English/i);
    // standard number is never translated / mangled
    expect(a.recommendationExplanations[0].standardNumber).toBe("IS 14543:2016");
  });

  test("empty candidate list still returns an honest no-evidence answer", async () => {
    const a = await generateAnswer(pkg({ candidates: [] }), { answerLanguage: "hi" });
    expect(a.recommendationExplanations).toHaveLength(0);
    expect(a.answer.length).toBeGreaterThan(0);
  });
});

describe("generateAnswer — applicability gate (steel pipes / PVC standard regression)", () => {
  // 2026-09-04 bug: the deterministic no-LLM summary sentence named a
  // material-mismatched candidate in the same breath as "N directly
  // supported by evidence" — the whole-answer-level version of the same
  // bug fixed per-card in RecommendationCard.test.tsx.
  const mismatchedCandidate = (overrides: Partial<EvidencePackage["candidates"][number]> = {}) => ({
    standardNumber: "IS 4985:2021",
    title: "Unplasticized Polyvinyl Chloride (PVC-U) Pipes for Potable Water Supplies - Specification",
    groundingState: "verified", // deliberately strong, as in the real bug report
    coverage: {
      product: "covered" as const, material: "unknown" as const, application: "unknown" as const, targetUser: "unknown" as const,
      sector: "unknown" as const, testing: "unknown" as const, certification: "unknown" as const, identifier: "unknown" as const,
      overallCoverageRatio: 1,
    },
    chunks: [{ chunkId: "c-pvc", section: null, clause: null, text: "PVC pipe evidence." }],
    primaryRecommendation: false,
    applicabilityReason: 'The query specifies "steel", but this standard\'s title concerns "plastic" — applicability to a steel product is not established by the available evidence.',
    ...overrides,
  });

  test("a blocked candidate's recommendationExplanation is the applicability reason, never a grounding-based endorsement", async () => {
    const a = await generateAnswer(pkg({ candidates: [mismatchedCandidate()] }));
    expect(a.recommendationExplanations).toHaveLength(1);
    expect(a.recommendationExplanations[0].reason).toContain("steel");
    expect(a.recommendationExplanations[0].reason).toContain("plastic");
    expect(a.recommendationExplanations[0].reason).not.toMatch(/directly supported by indexed BIS evidence/);
  });

  test("the whole-answer summary sentence never counts a blocked candidate toward 'directly supported by evidence'", async () => {
    const a = await generateAnswer(pkg({ candidates: [mismatchedCandidate()] }));
    // No primary candidates at all in this package.
    expect(a.answer).not.toMatch(/directly supported by evidence/);
    expect(a.answer).toContain("IS 4985:2021");
    expect(a.answer).toMatch(/none established applicability/);
  });

  test("mixed package: the summary sentence separates the primary candidate from the blocked one, with an accurate directly-supported count", async () => {
    const goodCandidate = {
      standardNumber: "IS 5522:2014",
      title: "Stainless Steel Sheets and Strips for Utensils",
      groundingState: "verified" as const,
      coverage: {
        product: "covered" as const, material: "covered" as const, application: "unknown" as const, targetUser: "unknown" as const,
        sector: "unknown" as const, testing: "unknown" as const, certification: "unknown" as const, identifier: "unknown" as const,
        overallCoverageRatio: 1,
      },
      chunks: [{ chunkId: "c-steel", section: null, clause: null, text: "Steel sheet evidence." }],
      primaryRecommendation: true,
      applicabilityReason: "",
    };
    const a = await generateAnswer(pkg({ candidates: [goodCandidate, mismatchedCandidate()] }));
    expect(a.answer).toContain("1 candidate standard was found (1 directly supported by evidence): IS 5522:2014");
    expect(a.answer).toContain("did not pass applicability checks");
    expect(a.answer).toContain("IS 4985:2021");
  });
});
