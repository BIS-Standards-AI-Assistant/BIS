/**
 * Unit tests for src/lib/evidence-aggregation.ts. Pure functions over
 * synthetic RetrievedChunk fixtures — no DB, no LLM call.
 *
 * The central claim under test: chunk COUNT alone must never let a
 * lower-quality document beat a higher-quality one. That's the exact
 * failure mode measured in the Q17 investigation (IS 14543: 111 chunks in
 * the corpus vs IS 15410: 10 chunks) — see scripts/diagnose-retrieval.ts
 * for the real numbers this fixture is modeled on.
 *
 * Usage: npx tsx scripts/test-evidence-aggregation.ts
 */
import assert from "node:assert/strict";
import { aggregateEvidence } from "../src/lib/evidence-aggregation";
import type { RetrievedChunk } from "../src/lib/retrieval";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function chunk(overrides: Partial<RetrievedChunk> & { chunkId: string; documentId: string }): RetrievedChunk {
  return {
    standardNumber: null,
    title: "doc",
    sourceUrl: "https://example.test",
    sourceOrg: "BIS",
    section: null,
    clause: null,
    page: null,
    text: "text",
    semanticScore: 0,
    keywordScore: 0,
    identifierMatch: false,
    score: 0,
    rerankReason: "test fixture",
    ...overrides,
  };
}

test("a document with 100 mediocre chunks does not beat one with 3 strong chunks", () => {
  const mediocre: RetrievedChunk[] = Array.from({ length: 100 }, (_, i) =>
    chunk({ chunkId: `m${i}`, documentId: "docA", standardNumber: "IS AAAA", score: 0.01 }),
  );
  const strong: RetrievedChunk[] = [
    chunk({ chunkId: "s0", documentId: "docB", standardNumber: "IS BBBB", score: 0.02, clause: "4.1" }),
    chunk({ chunkId: "s1", documentId: "docB", standardNumber: "IS BBBB", score: 0.018, clause: "4.2" }),
    chunk({ chunkId: "s2", documentId: "docB", standardNumber: "IS BBBB", score: 0.015, clause: "4.3" }),
  ];

  const [top, second] = aggregateEvidence([...mediocre, ...strong]);

  assert.equal(top.standardNumber, "IS BBBB", "the 3-strong-chunk document should rank first");
  assert.equal(second.standardNumber, "IS AAAA");
  // Raw sum would have docA (sum 1.0) crushing docB (sum 0.053) — the whole
  // point of weightedScore is that this never happens.
  assert.ok(top.weightedScore > second.weightedScore);
});

test("weightedScore is bounded near 2x the best chunk regardless of chunk count", () => {
  const many: RetrievedChunk[] = Array.from({ length: 111 }, (_, i) =>
    chunk({ chunkId: `c${i}`, documentId: "docA", score: 0.01 }),
  );
  const [agg] = aggregateEvidence(many);
  // Geometric series sum with ratio 0.5 converges to 1/(1-0.5) = 2.
  assert.ok(agg.weightedScore < 0.02 * 1.01, `expected weightedScore to stay near 2x best (0.02), got ${agg.weightedScore}`);
  assert.ok(agg.weightedScore > 0.019, "should still meaningfully exceed a single chunk's score");
});

test("reproduces the measured Q17 shape: fewer, competitive chunks still rank near the top", () => {
  // Real numbers from scripts/diagnose-retrieval.ts for
  // "What tests are performed on plastic bottles for packaged natural mineral water?"
  const is14543: RetrievedChunk[] = [
    chunk({ chunkId: "a", documentId: "doc14543", standardNumber: "IS 14543:2016", score: 0.01639 }),
    chunk({ chunkId: "b", documentId: "doc14543", standardNumber: "IS 14543:2016", score: 0.01613 }),
    chunk({ chunkId: "c", documentId: "doc14543", standardNumber: "IS 14543:2016", score: 0.01587 }),
    chunk({ chunkId: "d", documentId: "doc14543", standardNumber: "IS 14543:2016", score: 0.01563 }),
    chunk({ chunkId: "e", documentId: "doc14543", standardNumber: "IS 14543:2016", score: 0.01538 }),
  ];
  const is15410: RetrievedChunk[] = [
    chunk({ chunkId: "f", documentId: "doc15410", standardNumber: "IS 15410:2003", score: 0.01515 }),
    chunk({ chunkId: "g", documentId: "doc15410", standardNumber: "IS 15410:2003", score: 0.01351 }),
  ];

  const aggregated = aggregateEvidence([...is14543, ...is15410]);
  const ratio = aggregated[1].weightedScore / aggregated[0].weightedScore;

  // IS 15410 has fewer contributing chunks (2 vs 5), so some volume
  // advantage for IS 14543 is legitimate — more corroborating evidence is
  // real signal, not just noise. What must NOT happen is IS 15410 getting
  // crushed to near-irrelevance the way a naive chunk-count-weighted sum
  // would (there, 5 chunks vs 2 at similar per-chunk scores would already
  // be a ~2.5x gap before even accounting for the other 106 chunks IS
  // 14543 has in the full corpus). Staying above 50% keeps it clearly
  // competitive for the downstream grounding/confidence decision, which is
  // what actually determines the Q17 outcome — retrieval ranking itself is
  // the reranker's job (src/lib/ml/reranker.ts), already solved separately.
  assert.ok(ratio >= 0.5, `expected IS 15410 to stay within 50% of IS 14543's weightedScore, got ratio ${ratio}`);
});

test("clauseDiversity counts distinct clauses, not chunk count", () => {
  const chunks: RetrievedChunk[] = [
    chunk({ chunkId: "a", documentId: "docA", clause: "4.1", score: 0.01 }),
    chunk({ chunkId: "b", documentId: "docA", clause: "4.1", score: 0.01 }), // same clause repeated
    chunk({ chunkId: "c", documentId: "docA", clause: "4.2", score: 0.01 }),
    chunk({ chunkId: "d", documentId: "docA", clause: null, score: 0.01 }),
  ];
  const [agg] = aggregateEvidence(chunks);
  assert.equal(agg.clauseDiversity, 2);
  assert.equal(agg.chunkCount, 4);
});

test("multiSourceChunkCount counts only chunks with both semantic and keyword signal", () => {
  const chunks: RetrievedChunk[] = [
    chunk({ chunkId: "a", documentId: "docA", semanticScore: 0.5, keywordScore: 0.3, score: 0.02 }),
    chunk({ chunkId: "b", documentId: "docA", semanticScore: 0.5, keywordScore: 0, score: 0.01 }),
    chunk({ chunkId: "c", documentId: "docA", semanticScore: 0, keywordScore: 0.3, score: 0.01 }),
  ];
  const [agg] = aggregateEvidence(chunks);
  assert.equal(agg.multiSourceChunkCount, 1);
});

test("identifierMatch is true if any contributing chunk matched", () => {
  const chunks: RetrievedChunk[] = [
    chunk({ chunkId: "a", documentId: "docA", identifierMatch: false, score: 0.01 }),
    chunk({ chunkId: "b", documentId: "docA", identifierMatch: true, score: 0.02 }),
  ];
  const [agg] = aggregateEvidence(chunks);
  assert.equal(agg.identifierMatch, true);
});

test("empty input produces empty output", () => {
  assert.deepEqual(aggregateEvidence([]), []);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
