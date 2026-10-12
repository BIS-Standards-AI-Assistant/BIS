import { describe, test, expect } from "vitest";
import { computeEngineConfidence } from "./confidence";
import type { AggregatedEvidence } from "./evidence-aggregation";
import type { CoverageResult } from "./coverage-analysis";
import type { Conflict } from "./conflict-detection";
import type { GroundingResult, GroundingState } from "./grounding";

function candidate(overrides: Partial<AggregatedEvidence> = {}): AggregatedEvidence {
  return {
    documentId: "doc-1",
    standardNumber: "IS 1293:2019",
    title: "Plugs and socket-outlets",
    sourceUrl: "https://example.test/is-1293",
    sourceOrg: "BIS",
    chunkCount: 3,
    bestChunkScore: 0.03,
    meanChunkScore: 0.02,
    weightedScore: 0.05,
    clauseDiversity: 2,
    identifierMatch: false,
    multiSourceChunkCount: 1,
    chunks: [],
    ...overrides,
  };
}

function coverage(overrides: Partial<CoverageResult> = {}): CoverageResult {
  return {
    product: "covered",
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

function grounding(state: GroundingState, score: number, identifierStrength = 0.6): GroundingResult {
  return {
    state,
    score,
    signals: {
      retrievalStrength: 1,
      identifierStrength,
      coverageStrength: 1,
      sourceAuthority: 1,
      consistency: 1,
      versionValidity: 1,
    },
  };
}

describe("computeEngineConfidence — missing inputs", () => {
  test.each([
    ["candidate", null, coverage(), grounding("verified", 0.9)],
    ["coverage", candidate(), null, grounding("verified", 0.9)],
    ["grounding", candidate(), coverage(), null],
  ] as const)("no %s means no confidence at all", (_label, cand, cov, gr) => {
    const result = computeEngineConfidence(cand, cov, [], gr);
    expect(result.score).toBe(0);
    expect(result.band).toBe("none");
    expect(result.groundingState).toBe("insufficient_evidence");
    expect(result.supportingSignals).toEqual([]);
    expect(result.limitingSignals).toHaveLength(1);
  });
});

describe("computeEngineConfidence — band is gated by grounding state first", () => {
  test.each([
    ["verified", 0.85, "high"],
    ["verified", 0.84, "medium"],
    ["supported_inference", 0.55, "medium"],
    ["supported_inference", 0.54, "low"],
    ["insufficient_evidence", 0.15, "low"],
    ["insufficient_evidence", 0.14, "none"],
  ] as const)("%s at %d -> %s", (state, score, band) => {
    expect(computeEngineConfidence(candidate(), coverage(), [], grounding(state, score)).band).toBe(band);
  });

  test("a high raw score can never lift an insufficient-evidence answer above low", () => {
    const result = computeEngineConfidence(candidate(), coverage(), [], grounding("insufficient_evidence", 0.99));
    expect(result.band).toBe("low");
    expect(result.groundingState).toBe("insufficient_evidence");
  });

  test("score and grounding state pass through unchanged", () => {
    const result = computeEngineConfidence(candidate(), coverage(), [], grounding("supported_inference", 0.61));
    expect(result.score).toBe(0.61);
    expect(result.groundingState).toBe("supported_inference");
  });
});

describe("computeEngineConfidence — signals", () => {
  const signals = (...args: Parameters<typeof computeEngineConfidence>) => {
    const r = computeEngineConfidence(...args);
    return { support: r.supportingSignals.join("\n"), limit: r.limitingSignals.join("\n") };
  };

  test("identifier match is supporting, identifier mismatch is limiting, neutral says nothing", () => {
    expect(signals(candidate(), coverage(), [], grounding("verified", 0.9, 1)).support).toMatch(/exact standard identifier/);
    expect(signals(candidate(), coverage(), [], grounding("verified", 0.9, 0)).limit).toMatch(/does not match/);
    const neutral = signals(candidate(), coverage(), [], grounding("verified", 0.9, 0.6));
    expect(neutral.support).not.toMatch(/identifier/);
    expect(neutral.limit).not.toMatch(/identifier/);
  });

  test("multi-source chunks are reported with their count", () => {
    expect(signals(candidate({ multiSourceChunkCount: 4 }), coverage(), [], grounding("verified", 0.9)).support).toMatch(
      /4 chunk\(s\) confirmed by both/,
    );
    expect(signals(candidate({ multiSourceChunkCount: 0 }), coverage(), [], grounding("verified", 0.9)).support).not.toMatch(
      /confirmed by both/,
    );
  });

  test("clause diversity supports; a single lone chunk limits", () => {
    expect(signals(candidate({ clauseDiversity: 3 }), coverage(), [], grounding("verified", 0.9)).support).toMatch(
      /3 distinct clauses/,
    );
    expect(
      signals(candidate({ clauseDiversity: 0, chunkCount: 1 }), coverage(), [], grounding("verified", 0.9)).limit,
    ).toMatch(/single supporting chunk/);
  });

  test("full coverage supports; partial coverage names exactly the uncovered dimensions", () => {
    expect(signals(candidate(), coverage(), [], grounding("verified", 0.9)).support).toMatch(/All applicable query constraints/);
    const partial = signals(
      candidate(),
      coverage({ material: "not_covered", testing: "not_covered", sector: "covered", overallCoverageRatio: 0.5 }),
      [],
      grounding("supported_inference", 0.6),
    );
    expect(partial.limit).toContain("Evidence does not address: material, testing.");
    expect(partial.limit).not.toContain("overallCoverageRatio");
  });

  test("only conflicts that affect this candidate's standard are surfaced", () => {
    const conflicts: Conflict[] = [
      { type: "superseded_standard", description: "IS 1293 may be withdrawn.", affectedStandards: ["IS 1293:2019"] },
      { type: "superseded_standard", description: "IS 302 may be withdrawn.", affectedStandards: ["IS 302:2008"] },
    ];
    const s = signals(candidate(), coverage(), conflicts, grounding("verified", 0.9));
    expect(s.limit).toContain("IS 1293 may be withdrawn.");
    expect(s.limit).not.toContain("IS 302");
    expect(s.support).not.toMatch(/No conflicting/);
  });

  test("no affecting conflicts is itself a supporting signal", () => {
    expect(signals(candidate(), coverage(), [], grounding("verified", 0.9)).support).toMatch(/No conflicting or superseded/);
  });
});
