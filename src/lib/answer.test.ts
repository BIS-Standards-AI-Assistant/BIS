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
