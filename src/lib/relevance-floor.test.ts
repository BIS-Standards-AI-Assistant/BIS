import { describe, test, expect } from "vitest";
import { evaluateRelevanceFloor, RELEVANCE_FLOOR } from "./relevance-floor";
import type { RetrievedChunk } from "./retrieval";

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "d1",
    standardNumber: "IS 14543:2016",
    title: "Packaged Drinking Water",
    sourceUrl: "https://www.bis.gov.in/",
    sourceOrg: "BIS",
    section: null,
    clause: null,
    page: null,
    text: "sample chunk text",
    semanticScore: 1,
    semanticSimilarity: 0.6,
    keywordScore: 1,
    identifierMatch: false,
    score: 1,
    rerankReason: "test",
    ...overrides,
  };
}

describe("PRD §8.1 relevance floor", () => {
  test("the floor sits inside the measured gap between in-corpus and out-of-corpus queries", () => {
    // From the live calibration run recorded in
    // data/evaluation/refusal-calibration.json (2026-09-09): the worst
    // in-corpus query scored 0.5557, the best out-of-corpus one 0.3493.
    // A floor outside that gap would either refuse real queries or admit
    // junk, so the constant itself is worth pinning.
    expect(RELEVANCE_FLOOR).toBeGreaterThan(0.3493);
    expect(RELEVANCE_FLOOR).toBeLessThan(0.5557);
  });

  test("passes when the best passage clears the floor", () => {
    const v = evaluateRelevanceFloor([chunk({ semanticSimilarity: 0.5557 })]);
    expect(v.decision).toBe("pass");
    expect(v.topSimilarity).toBeCloseTo(0.5557);
  });

  test("refuses when every passage is below the floor", () => {
    // The real measured out-of-corpus maximum ("semiconductor
    // photolithography mask alignment tolerance" → 0.3493).
    const v = evaluateRelevanceFloor([
      chunk({ semanticSimilarity: 0.3493 }),
      chunk({ chunkId: "c2", semanticSimilarity: 0.1413 }),
    ]);
    expect(v.decision).toBe("below_floor");
    expect(v.reason).toContain("0.349");
  });

  test("uses the best passage, not the first — a reranker reshuffle alone never triggers a refusal", () => {
    const v = evaluateRelevanceFloor([
      chunk({ chunkId: "c1", semanticSimilarity: 0.2 }),
      chunk({ chunkId: "c2", semanticSimilarity: 0.62 }),
    ]);
    expect(v.decision).toBe("pass");
    expect(v.topSimilarity).toBeCloseTo(0.62);
  });

  test("uses the best passage, not an average across k", () => {
    // Mean here is 0.2825, below the floor; the max is 0.62, above it.
    // The PRD explicitly requires the top-1 behaviour, so this must pass.
    const v = evaluateRelevanceFloor([
      chunk({ chunkId: "c1", semanticSimilarity: 0.62 }),
      chunk({ chunkId: "c2", semanticSimilarity: 0.15 }),
      chunk({ chunkId: "c3", semanticSimilarity: 0.2 }),
      chunk({ chunkId: "c4", semanticSimilarity: 0.16 }),
    ]);
    expect(v.decision).toBe("pass");
  });

  test("a real identifier match is exempt even far below the floor", () => {
    // Measured live: "5522 2014" resolves to exactly IS 5522:2014 with 12
    // identifier matches, yet scores only 0.2913 semantically. Applying
    // the floor there would refuse a query the system answers correctly.
    const v = evaluateRelevanceFloor([
      chunk({ semanticSimilarity: 0.2913, identifierMatch: true }),
    ]);
    expect(v.decision).toBe("exempt_identifier_match");
  });

  test("a fabricated identifier gets no exemption and is still refused", () => {
    // "IS 99999:2099" produced zero identifier matches and a 0.3349 max
    // similarity against the live index — the exemption cannot be reached
    // by naming a standard that does not exist.
    const v = evaluateRelevanceFloor([
      chunk({ standardNumber: "IS 15450:2004", semanticSimilarity: 0.3349, identifierMatch: false }),
    ]);
    expect(v.decision).toBe("below_floor");
  });

  test("an empty retrieval set is not measurable rather than below the floor", () => {
    const v = evaluateRelevanceFloor([]);
    expect(v.decision).toBe("not_measurable");
    expect(v.topSimilarity).toBeNull();
  });

  test("keyword-only / seed-corpus results are not measurable, not refused", () => {
    // Distinguishing "could not measure relevance" from "measured, and it
    // is irrelevant" matters: the seed fallback has no embeddings at all,
    // and treating that as a refusal would break the no-database path.
    const v = evaluateRelevanceFloor([chunk({ semanticSimilarity: null })]);
    expect(v.decision).toBe("not_measurable");
  });

  test("the floor is a parameter, so calibration can be re-run without editing callers", () => {
    const chunks = [chunk({ semanticSimilarity: 0.5 })];
    expect(evaluateRelevanceFloor(chunks, 0.4).decision).toBe("pass");
    expect(evaluateRelevanceFloor(chunks, 0.6).decision).toBe("below_floor");
  });
});
