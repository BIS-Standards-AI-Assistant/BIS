import { describe, test, expect } from "vitest";
import { classifyKnowledgeBoundary } from "./knowledge-boundary";
import type { AggregatedEvidence } from "./evidence-aggregation";
import type { CoverageResult } from "./coverage-analysis";
import type { GroundingResult } from "./grounding";

function candidate(overrides: Partial<AggregatedEvidence> = {}): AggregatedEvidence {
  return {
    documentId: "doc-1",
    standardNumber: "IS 5522:2014",
    title: "Stainless Steel Sheets",
    sourceUrl: "https://bis.gov.in/x.pdf",
    sourceOrg: "BIS",
    chunkCount: 2,
    bestChunkScore: 1,
    meanChunkScore: 1,
    weightedScore: 0.1,
    clauseDiversity: 2,
    identifierMatch: true,
    multiSourceChunkCount: 2,
    chunks: [],
    ...overrides,
  };
}

function coverage(overrides: Partial<CoverageResult> = {}): CoverageResult {
  return {
    product: "unknown",
    material: "unknown",
    application: "unknown",
    targetUser: "unknown",
    sector: "unknown",
    testing: "unknown",
    certification: "unknown",
    identifier: "covered",
    overallCoverageRatio: 1,
    ...overrides,
  };
}

function grounding(overrides: Partial<GroundingResult> = {}): GroundingResult {
  return {
    state: "verified",
    score: 0.9,
    signals: {
      retrievalStrength: 1,
      identifierStrength: 1,
      coverageStrength: 1,
      sourceAuthority: 1,
      consistency: 1,
      versionValidity: 1,
    },
    ...overrides,
  };
}

describe("classifyKnowledgeBoundary", () => {
  test("no candidate at all -> NOT_IN_DATABASE, not answerable, knowledge gap", () => {
    const result = classifyKnowledgeBoundary(null, null, [], null);
    expect(result.state).toBe("NOT_IN_DATABASE");
    expect(result.answerable).toBe(false);
    expect(result.knowledgeGap).toBe(true);
  });

  test("strong verified candidate with full coverage -> VERIFIED, answerable", () => {
    const result = classifyKnowledgeBoundary(candidate(), coverage(), [], grounding());
    expect(result.state).toBe("VERIFIED");
    expect(result.answerable).toBe(true);
    expect(result.knowledgeGap).toBe(false);
  });

  test("insufficient_evidence grounding -> NOT_IN_DATABASE, never lets the LLM guess", () => {
    const result = classifyKnowledgeBoundary(
      candidate(),
      coverage(),
      [],
      grounding({ state: "insufficient_evidence", score: 0.1 }),
    );
    expect(result.state).toBe("NOT_IN_DATABASE");
    expect(result.answerable).toBe(false);
  });

  test("a version/evidence conflict affecting this standard -> CONFLICTING_EVIDENCE", () => {
    const result = classifyKnowledgeBoundary(
      candidate(),
      coverage(),
      [{ type: "version_conflict", description: "two editions retrieved", affectedStandards: ["IS 5522:2014"] }],
      grounding(),
    );
    expect(result.state).toBe("CONFLICTING_EVIDENCE");
    expect(result.answerable).toBe(false);
  });

  test("non-BIS source authority with non-verified state -> UNVERIFIED_SOURCE", () => {
    const result = classifyKnowledgeBoundary(
      candidate(),
      coverage(),
      [],
      grounding({ state: "supported_inference", signals: { ...grounding().signals, sourceAuthority: 0.6 } }),
    );
    expect(result.state).toBe("UNVERIFIED_SOURCE");
    expect(result.answerable).toBe(true);
  });

  test("partial coverage ratio -> PARTIALLY_SUPPORTED, still answerable but flags the gap", () => {
    const result = classifyKnowledgeBoundary(
      candidate(),
      coverage({ overallCoverageRatio: 0.5, testing: "not_covered" }),
      [],
      grounding(),
    );
    expect(result.state).toBe("PARTIALLY_SUPPORTED");
    expect(result.answerable).toBe(true);
    expect(result.knowledgeGap).toBe(true);
  });
});
