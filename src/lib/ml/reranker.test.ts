import { describe, test, expect } from "vitest";
import { documentDiversityReranker, noopReranker } from "./reranker";
import type { RetrievalCandidate } from "./types";

let nextId = 0;
function candidate(documentId: string, fusedScore: number): RetrievalCandidate {
  return {
    chunkId: `${documentId}#${nextId++}`,
    documentId,
    standardNumber: documentId,
    section: null,
    clause: null,
    text: "",
    semanticScore: 0,
    semanticSimilarity: null,
    keywordScore: 0,
    identifierMatch: false,
    fusedScore,
  };
}

const docs = (ranked: { documentId: string }[]) => ranked.map((c) => c.documentId);

describe("noopReranker", () => {
  test("orders by fused score and passes it through as the rerank score", async () => {
    const ranked = await noopReranker.rerank("q", [candidate("A", 0.01), candidate("B", 0.03), candidate("C", 0.02)]);
    expect(docs(ranked)).toEqual(["B", "C", "A"]);
    expect(ranked.map((c) => c.rerankScore)).toEqual([0.03, 0.02, 0.01]);
    expect(ranked.every((c) => c.rerankReason === "fused RRF score, unmodified")).toBe(true);
  });

  test("does not mutate or reorder the caller's array", async () => {
    const input = [candidate("A", 0.01), candidate("B", 0.03)];
    await noopReranker.rerank("q", input);
    expect(docs(input)).toEqual(["A", "B"]);
  });
});

describe("documentDiversityReranker", () => {
  test("empty input is fine", async () => {
    expect(await documentDiversityReranker.rerank("q", [])).toEqual([]);
  });

  // Measured Q17 case ("plastic bottles for packaged natural mineral water"):
  // IS 14543 flooded the top ranks on chunk volume while the correct IS 15410
  // was only slightly behind on best-chunk score (ratio 0.925).
  test("Q17: a competitive runner-up is interleaved instead of being pushed out of the top 5", async () => {
    const flood = [0.01639, 0.0161, 0.0159, 0.0157, 0.0156, 0.0155].map((s) => candidate("IS 14543", s));
    const correct = [0.01515, 0.0149].map((s) => candidate("IS 15410", s));
    const ranked = await documentDiversityReranker.rerank("q", [...flood, ...correct]);

    expect(docs(ranked).slice(0, 4)).toEqual(["IS 14543", "IS 15410", "IS 14543", "IS 15410"]);
    expect(ranked).toHaveLength(8);
  });

  // Measured exact-identifier case ("IS 5522:2014"): ratio 0.488 to the runner-up.
  test("an unambiguous exact match is not diluted by a far-behind document", async () => {
    const exact = [0.03252, 0.03, 0.028].map((s) => candidate("IS 5522", s));
    const other = [0.01587, 0.015].map((s) => candidate("IS 1", s));
    const ranked = await documentDiversityReranker.rerank("q", [...other, ...exact]);

    expect(docs(ranked)).toEqual(["IS 5522", "IS 5522", "IS 5522", "IS 1", "IS 1"]);
    expect(ranked[3].rerankReason).toMatch(/below the 70% competitiveness threshold/);
  });

  test("the 70% threshold is inclusive", async () => {
    const ranked = await documentDiversityReranker.rerank("q", [
      candidate("A", 0.1),
      candidate("A", 0.09),
      candidate("B", 0.07),
    ]);
    expect(docs(ranked)).toEqual(["A", "B", "A"]);
  });

  test("round-robin picks each document's chunks in its own score order", async () => {
    const ranked = await documentDiversityReranker.rerank("q", [
      candidate("A", 0.08),
      candidate("A", 0.1),
      candidate("B", 0.085),
      candidate("B", 0.09),
    ]);
    expect(ranked.map((c) => c.fusedScore)).toEqual([0.1, 0.09, 0.08, 0.085]);
  });

  test("never adds or drops a candidate", async () => {
    const input = [candidate("A", 0.1), candidate("B", 0.09), candidate("C", 0.01), candidate("A", 0.05), candidate("C", 0.005)];
    const ranked = await documentDiversityReranker.rerank("q", input);
    expect(ranked.map((c) => c.chunkId).sort()).toEqual(input.map((c) => c.chunkId).sort());
  });

  test("rerank scores are strictly decreasing by final position", async () => {
    const ranked = await documentDiversityReranker.rerank("q", [candidate("A", 0.1), candidate("B", 0.09), candidate("C", 0.01)]);
    expect(ranked.map((c) => c.rerankScore)).toEqual([1, 1 / 2, 1 / 3]);
  });

  test("every candidate gets a deterministic reason naming its document rank or round", async () => {
    const ranked = await documentDiversityReranker.rerank("q", [candidate("A", 0.1), candidate("A", 0.09), candidate("B", 0.095)]);
    expect(ranked[0].rerankReason).toMatch(/competitive with the leading document .* document rank 1 of 2/);
    expect(ranked[1].rerankReason).toMatch(/document rank 2 of 2/);
    expect(ranked[2].rerankReason).toMatch(/round 2 pick for this document \(document rank 1 of 2\)/);
  });

  test("is deterministic for the same input", async () => {
    const input = [candidate("A", 0.1), candidate("B", 0.095), candidate("A", 0.09), candidate("C", 0.02)];
    const first = await documentDiversityReranker.rerank("q", input);
    const second = await documentDiversityReranker.rerank("q", input);
    expect(second).toEqual(first);
  });
});
