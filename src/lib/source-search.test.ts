import { describe, test, expect } from "vitest";
import { groupChunksIntoSources, sourceLabel, sourcesFromRecommendations } from "./source-search";
import type { EvidenceRef, Recommendation, RetrievedChunk } from "@/types/api";

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "chunk-1",
    documentId: "doc-1",
    standardNumber: "IS 14543:2016",
    title: "Packaged Drinking Water",
    sourceUrl: "https://example.test/is-14543",
    sourceOrg: "BIS",
    section: null,
    clause: null,
    page: null,
    text: "",
    semanticScore: 0,
    semanticSimilarity: null,
    keywordScore: 0,
    identifierMatch: false,
    score: 0.01,
    rerankReason: "",
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceRef> = {}): EvidenceRef {
  return {
    chunkId: "chunk-1",
    documentId: "doc-1",
    document: "Packaged Drinking Water",
    standardNumber: "IS 14543:2016",
    section: null,
    clause: null,
    page: null,
    text: "",
    sourceUrl: "https://example.test/is-14543",
    ...overrides,
  };
}

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    standardNumber: "IS 14543:2016",
    title: "Packaged Drinking Water",
    relevanceScore: 0.8,
    groundingState: "verified",
    reason: "",
    coverage: {
      product: "covered", material: "unknown", application: "unknown", targetUser: "unknown",
      sector: "unknown", testing: "unknown", certification: "unknown", identifier: "unknown",
      overallCoverageRatio: 1,
    },
    evidence: [evidence()],
    applicability: { state: "DIRECTLY_APPLICABLE", reason: "", materialConflict: false },
    recommendationStatus: "RECOMMENDED",
    primaryRecommendation: true,
    ...overrides,
  };
}

describe("groupChunksIntoSources", () => {
  test("no chunks, no sources", () => {
    expect(groupChunksIntoSources([])).toEqual([]);
  });

  test("passages from the same standard collapse into one source with a passage count and best score", () => {
    const sources = groupChunksIntoSources([
      chunk({ chunkId: "a", score: 0.01 }),
      chunk({ chunkId: "b", score: 0.03 }),
      chunk({ chunkId: "c", score: 0.02 }),
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ id: "IS 14543:2016", matchingPassages: 3, topScore: 0.03 });
  });

  test("a chunk with no standard number is keyed by its document id", () => {
    const [source] = groupChunksIntoSources([chunk({ standardNumber: null, documentId: "manual-7" })]);
    expect(source.id).toBe("manual-7");
    expect(source.standardNumber).toBeNull();
  });

  test("one identifier-matching passage marks the whole source as named", () => {
    const [source] = groupChunksIntoSources([chunk(), chunk({ identifierMatch: true }), chunk()]);
    expect(source.identifierMatch).toBe(true);
  });

  test("a named standard outranks a higher-scoring merely similar one", () => {
    const sources = groupChunksIntoSources([
      chunk({ standardNumber: "IS 13428:2005", score: 0.05 }),
      chunk({ standardNumber: "IS 14543:2016", score: 0.01, identifierMatch: true }),
    ]);
    expect(sources.map((s) => s.id)).toEqual(["IS 14543:2016", "IS 13428:2005"]);
  });

  test("otherwise sources are ordered by best score", () => {
    const sources = groupChunksIntoSources([
      chunk({ standardNumber: "IS 1", score: 0.01 }),
      chunk({ standardNumber: "IS 2", score: 0.04 }),
      chunk({ standardNumber: "IS 3", score: 0.02 }),
    ]);
    expect(sources.map((s) => s.id)).toEqual(["IS 2", "IS 3", "IS 1"]);
  });

  test("the input chunks are not mutated", () => {
    const input = [chunk({ score: 0.01 }), chunk({ score: 0.03 })];
    const copy = structuredClone(input);
    groupChunksIntoSources(input);
    expect(input).toEqual(copy);
  });
});

describe("sourceLabel", () => {
  test("never calls a source recommended", () => {
    const [named] = groupChunksIntoSources([chunk({ identifierMatch: true })]);
    const [similar] = groupChunksIntoSources([chunk()]);
    expect(sourceLabel(named)).toBe("Named in your search");
    expect(sourceLabel(similar)).toBe("Matching source");
    for (const label of [sourceLabel(named), sourceLabel(similar)]) expect(label).not.toMatch(/recommend/i);
  });
});

describe("sourcesFromRecommendations", () => {
  test("reshapes a recommendation into the same SourceCandidate the panel search produces", () => {
    const [source] = sourcesFromRecommendations([
      recommendation({ evidence: [evidence({ documentId: "doc-9", sourceUrl: "https://example.test/9" }), evidence()] }),
    ]);
    expect(source).toEqual({
      id: "IS 14543:2016",
      standardNumber: "IS 14543:2016",
      title: "Packaged Drinking Water",
      documentId: "doc-9",
      sourceUrl: "https://example.test/9",
      sourceOrg: "BIS",
      matchingPassages: 2,
      topScore: 0.8,
      identifierMatch: false,
    });
  });

  test("identifier coverage becomes identifierMatch", () => {
    const rec = recommendation();
    rec.coverage = { ...rec.coverage, identifier: "covered" };
    expect(sourcesFromRecommendations([rec])[0].identifierMatch).toBe(true);
  });

  test("falls back to document id, then title, for the id when there is no standard number", () => {
    expect(sourcesFromRecommendations([recommendation({ standardNumber: null })])[0].id).toBe("doc-1");
    const [bare] = sourcesFromRecommendations([recommendation({ standardNumber: null, evidence: [] })]);
    expect(bare).toMatchObject({ id: "Packaged Drinking Water", documentId: "", sourceUrl: "", matchingPassages: 0 });
  });

  test("preserves the server's order", () => {
    const recs = ["IS 3", "IS 1", "IS 2"].map((n) => recommendation({ standardNumber: n }));
    expect(sourcesFromRecommendations(recs).map((s) => s.id)).toEqual(["IS 3", "IS 1", "IS 2"]);
  });
});
