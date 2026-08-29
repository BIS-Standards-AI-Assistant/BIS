/**
 * Unit tests for coverage-analysis.ts, conflict-detection.ts, grounding.ts,
 * and confidence.ts — the deterministic decision layer that replaces
 * LLM-assigned groundingState/confidence. All synthetic fixtures, no DB, no
 * LLM call.
 *
 * Usage: npx tsx scripts/test-grounding-pipeline.ts
 */
import assert from "node:assert/strict";
import { analyzeCoverage } from "../src/lib/coverage-analysis";
import { detectConflicts } from "../src/lib/conflict-detection";
import { computeGrounding } from "../src/lib/grounding";
import { computeEngineConfidence } from "../src/lib/confidence";
import { aggregateEvidence, type AggregatedEvidence } from "../src/lib/evidence-aggregation";
import type { RetrievedChunk } from "../src/lib/retrieval";
import type { QueryIntent } from "../src/lib/intent";

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

function intent(overrides: Partial<QueryIntent> = {}): QueryIntent {
  return {
    intent: "find_applicable_standard",
    product: null,
    material: null,
    useCase: null,
    targetUser: null,
    sector: null,
    certificationRequested: false,
    testingRequested: false,
    searchQuery: "",
    missingInformation: [],
    ...overrides,
  };
}

// ---- coverage-analysis ----

test("coverage: null intent fields are 'unknown', not 'not_covered'", () => {
  const [agg] = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", text: "stainless steel utensils" })]);
  const c = analyzeCoverage(intent(), agg, []);
  assert.equal(c.product, "unknown");
  assert.equal(c.material, "unknown");
  assert.equal(c.overallCoverageRatio, 1, "no applicable constraints => ratio defaults to 1");
});

test("coverage: material term present in evidence text is 'covered'", () => {
  const [agg] = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", text: "This standard applies to stainless steel sheets for utensils." }),
  ]);
  const c = analyzeCoverage(intent({ material: "stainless steel" }), agg, []);
  assert.equal(c.material, "covered");
});

test("coverage: material term absent from evidence text is 'not_covered'", () => {
  const [agg] = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", text: "This standard applies to plastic bottles." })]);
  const c = analyzeCoverage(intent({ material: "stainless steel" }), agg, []);
  assert.equal(c.material, "not_covered");
});

test("coverage: testing keyword coverage only applies when testingRequested is true", () => {
  const withTestText = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", text: "Method of test for chemical composition." })])[0];
  const withoutTestText = aggregateEvidence([chunk({ chunkId: "b", documentId: "d2", text: "General scope of the standard." })])[0];

  assert.equal(analyzeCoverage(intent({ testingRequested: false }), withTestText, []).testing, "unknown");
  assert.equal(analyzeCoverage(intent({ testingRequested: true }), withTestText, []).testing, "covered");
  assert.equal(analyzeCoverage(intent({ testingRequested: true }), withoutTestText, []).testing, "not_covered");
});

test("coverage: identifier coverage matches only the resolved candidate", () => {
  const agg = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014" })])[0];
  const identifiers = [{ normalized: "IS 5522:2014", number: "5522", part: null, section: null, year: "2014", raw: "IS 5522:2014" }];
  assert.equal(analyzeCoverage(intent(), agg, identifiers).identifier, "covered");

  const wrongAgg = aggregateEvidence([chunk({ chunkId: "b", documentId: "d2", standardNumber: "IS 14543:2016" })])[0];
  assert.equal(analyzeCoverage(intent(), wrongAgg, identifiers).identifier, "not_covered");
});

test("coverage: overallCoverageRatio reflects mixed covered/not_covered dimensions", () => {
  const agg = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", text: "stainless steel utensils, method of test for composition" }),
  ])[0];
  const result = analyzeCoverage(intent({ material: "stainless steel", useCase: "cooking outdoor camping", testingRequested: true }), agg, []);
  // material: covered, application(useCase): not_covered, testing: covered -> 2/3
  assert.equal(result.material, "covered");
  assert.equal(result.application, "not_covered");
  assert.equal(result.testing, "covered");
  assert.equal(result.overallCoverageRatio, 2 / 3);
});

// ---- conflict-detection ----

test("conflict: flags multiple editions of the same base standard", () => {
  const candidates: AggregatedEvidence[] = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 302 (Part 2/Sec 6):2009" }),
    chunk({ chunkId: "b", documentId: "d2", standardNumber: "IS 302 (Part 2/Sec 26):2014" }),
  ]);
  const conflicts = detectConflicts(candidates);
  assert.ok(conflicts.some((c) => c.type === "version_conflict"));
});

test("conflict: no version conflict for genuinely different standards", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014" }),
    chunk({ chunkId: "b", documentId: "d2", standardNumber: "IS 14543:2016" }),
  ]);
  assert.equal(detectConflicts(candidates).some((c) => c.type === "version_conflict"), false);
});

test("conflict: flags superseded/withdrawn language", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 999:1990", text: "This standard has been superseded by IS 999:2020." }),
  ]);
  const conflicts = detectConflicts(candidates);
  assert.ok(conflicts.some((c) => c.type === "superseded_standard"));
});

test("conflict: flags mandatory/voluntary co-occurrence within one standard", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 1:2000", text: "Certification under this scheme is mandatory." }),
    chunk({ chunkId: "b", documentId: "d1", standardNumber: "IS 1:2000", text: "A voluntary labeling scheme is also available." }),
  ]);
  const conflicts = detectConflicts(candidates);
  assert.ok(conflicts.some((c) => c.type === "evidence_conflict"));
});

test("conflict: clean evidence produces no conflicts", () => {
  const candidates = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014", text: "Scope and requirements." })]);
  assert.deepEqual(detectConflicts(candidates), []);
});

// ---- grounding ----

test("grounding: exact identifier match with full coverage and no conflicts -> verified", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014", identifierMatch: true, semanticScore: 1, keywordScore: 1, score: 0.03 }),
  ]);
  const coverage = analyzeCoverage(intent(), candidates[0], [
    { normalized: "IS 5522:2014", number: "5522", part: null, section: null, year: "2014", raw: "IS 5522:2014" },
  ]);
  const g = computeGrounding(candidates[0], candidates, coverage, []);
  assert.equal(g.state, "verified");
});

test("grounding: weak, unrelated candidate with no identifier and no coverage -> insufficient_evidence", () => {
  const candidates = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 1:1999", score: 0.001, sourceOrg: "other" })]);
  const coverage = analyzeCoverage(intent({ material: "titanium alloy" }), candidates[0], []);
  const g = computeGrounding(candidates[0], candidates, coverage, []);
  assert.equal(g.state, "insufficient_evidence");
});

test("grounding: a version conflict pulls the score down relative to an identical candidate without one", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014", score: 0.02 }),
  ]);
  const coverage = analyzeCoverage(intent(), candidates[0], []);
  const withoutConflict = computeGrounding(candidates[0], candidates, coverage, []);
  const withConflict = computeGrounding(candidates[0], candidates, coverage, [
    { type: "superseded_standard", description: "test", affectedStandards: ["IS 5522:2014"] },
  ]);
  assert.ok(withConflict.score < withoutConflict.score);
});

test("grounding: a fabricated identifier that matches no candidate forces insufficient_evidence even with a dominant lone candidate", () => {
  // Reproduces a real bug found via scripts/smoke-test-pipeline.ts against
  // live OpenRouter data: "What does IS 99999:2099 require for electric
  // kettles?" returned groundingState=supported_inference (score 0.6)
  // before this fix, because post-rerank RetrievedChunk.score is a
  // position-based value (1/(1+rank)) that saturates near the reranker's
  // maximum for a lone leading candidate regardless of actual relevance —
  // these are realistic reranker-scale scores (~1.0+), not the small
  // raw-RRF-scale numbers (~0.01-0.03) used in earlier synthetic tests,
  // which is exactly why this case wasn't caught until a live run.
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 14543:2016", text: "packaged drinking water requirements", score: 1.0 }),
    chunk({ chunkId: "b", documentId: "d1", standardNumber: "IS 14543:2016", text: "packaging and marking", score: 0.5 }),
  ]);
  const identifiers = [{ normalized: "IS 99999:2099", number: "99999", part: null, section: null, year: "2099", raw: "IS 99999:2099" }];
  const coverage = analyzeCoverage(intent({ product: "electric kettles" }), candidates[0], identifiers);
  assert.equal(coverage.identifier, "not_covered");

  const g = computeGrounding(candidates[0], candidates, coverage, []);
  assert.equal(g.state, "insufficient_evidence", `expected the fabricated-identifier mismatch to force insufficient_evidence, got ${g.state} (score ${g.score})`);
});

test("grounding: retrievalStrength is 1.0 for a genuinely strong top candidate among weaker peers", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS A", score: 0.08 }),
    chunk({ chunkId: "b", documentId: "d2", standardNumber: "IS B", score: 0.01 }),
  ]);
  const coverage = analyzeCoverage(intent(), candidates[0], []);
  const g = computeGrounding(candidates[0], candidates, coverage, []);
  assert.equal(g.signals.retrievalStrength, 1);
});

// ---- confidence ----

test("confidence: no candidate at all -> band 'none', explicit limiting signal", () => {
  const c = computeEngineConfidence(null, null, [], null);
  assert.equal(c.band, "none");
  assert.ok(c.limitingSignals.length > 0);
});

test("confidence: band tracks the grounding score consistently", () => {
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014", identifierMatch: true, score: 0.03 }),
  ]);
  const coverage = analyzeCoverage(intent(), candidates[0], [
    { normalized: "IS 5522:2014", number: "5522", part: null, section: null, year: "2014", raw: "IS 5522:2014" },
  ]);
  const grounding = computeGrounding(candidates[0], candidates, coverage, []);
  const confidence = computeEngineConfidence(candidates[0], coverage, [], grounding);
  assert.equal(confidence.score, grounding.score);
  assert.equal(confidence.groundingState, grounding.state);
});

test("confidence: band can never contradict groundingState (insufficient_evidence never reports medium/high)", () => {
  // The exact real-world case this guards: a fabricated identifier query
  // where grounding.ts's disqualifying rule caps state at
  // insufficient_evidence without necessarily zeroing the raw blended
  // score. Before this invariant existed, that combination reported
  // groundingState=insufficient_evidence alongside band=medium.
  const candidates = aggregateEvidence([
    chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 14543:2016", score: 1.0 }),
  ]);
  const identifiers = [{ normalized: "IS 99999:2099", number: "99999", part: null, section: null, year: "2099", raw: "IS 99999:2099" }];
  const coverage = analyzeCoverage(intent({ product: "electric kettles" }), candidates[0], identifiers);
  const grounding = computeGrounding(candidates[0], candidates, coverage, []);
  const confidence = computeEngineConfidence(candidates[0], coverage, [], grounding);

  assert.equal(grounding.state, "insufficient_evidence");
  assert.ok(["none", "low"].includes(confidence.band), `band ${confidence.band} contradicts groundingState insufficient_evidence`);
});

test("confidence: single-chunk evidence is surfaced as a limiting signal", () => {
  const candidates = aggregateEvidence([chunk({ chunkId: "a", documentId: "d1", standardNumber: "IS 5522:2014", score: 0.01 })]);
  const coverage = analyzeCoverage(intent(), candidates[0], []);
  const grounding = computeGrounding(candidates[0], candidates, coverage, []);
  const confidence = computeEngineConfidence(candidates[0], coverage, [], grounding);
  assert.ok(confidence.limitingSignals.some((s) => s.includes("single supporting chunk")));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
