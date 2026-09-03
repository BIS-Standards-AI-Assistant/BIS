/**
 * Integration test for the engine/LLM boundary — no live API call, so it
 * runs for free and deterministically. Proves the schema round-trip:
 *
 *   engine-selected candidates -> LLMAnswerSchema -> (simulated) LLM
 *   response -> validateRecommendationExplanations -> final recommendations
 *
 * and specifically that malicious or malformed model output cannot leak
 * through: an unknown standard number, a fabricated grounding state, a
 * fabricated confidence, or a malformed shape.
 *
 * Usage: npx tsx scripts/test-answer-schema-validation.ts
 */
import assert from "node:assert/strict";
import { LLMAnswerSchema, validateRecommendationExplanations, type EvidencePackageCandidate } from "../src/lib/answer";
import { computeGrounding } from "../src/lib/grounding";
import { computeEngineConfidence } from "../src/lib/confidence";
import { aggregateEvidence } from "../src/lib/evidence-aggregation";
import { analyzeCoverage } from "../src/lib/coverage-analysis";
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

const intent: QueryIntent = {
  intent: "find_applicable_standard",
  isRelevant: true,
  relevanceMessage: null,
  product: "stainless steel utensils",
  material: "stainless steel",
  useCase: null,
  targetUser: null,
  sector: null,
  certificationRequested: false,
  testingRequested: false,
  searchQuery: "stainless steel utensils standard",
  missingInformation: [],
};

// A realistic engine-selected candidate set — this is the "ground truth"
// the LLM is (or isn't) allowed to talk about.
const aggregated = aggregateEvidence([
  chunk({ chunkId: "real-chunk-1", documentId: "doc-5522", standardNumber: "IS 5522:2014", text: "stainless steel sheets for utensils", score: 1.0, identifierMatch: true }),
  chunk({ chunkId: "real-chunk-2", documentId: "doc-5522", standardNumber: "IS 5522:2014", text: "chemical composition requirements", score: 0.5, identifierMatch: true }),
]);
const coverage = analyzeCoverage(intent, aggregated[0], []);
const grounding = computeGrounding(aggregated[0], aggregated, coverage, []);
const engineConfidence = computeEngineConfidence(aggregated[0], coverage, [], grounding);

const evidencePackageCandidates: EvidencePackageCandidate[] = aggregated.map((c) => ({
  standardNumber: c.standardNumber,
  title: c.title,
  groundingState: grounding.state,
  coverage,
  chunks: c.chunks.map((ch) => ({ chunkId: ch.chunkId, section: ch.section, clause: ch.clause, text: ch.text })),
}));
const validStandardNumbers = new Set(aggregated.map((c) => c.standardNumber));

test("evidence package candidates carry the engine's groundingState, never a placeholder the LLM could overwrite", () => {
  assert.equal(evidencePackageCandidates.length, aggregated.length);
  for (const c of evidencePackageCandidates) {
    assert.equal(c.groundingState, grounding.state);
  }
});

// ---- schema shape tests ----

test("LLMAnswerSchema has no groundingState, confidence, or citation-id field at all", () => {
  const shape = LLMAnswerSchema.shape;
  assert.equal("groundingState" in shape, false);
  assert.equal("confidence" in shape, false);
  assert.equal("evidenceChunkIds" in shape, false);
  const explanationShape = shape.recommendationExplanations.element.shape;
  assert.equal("groundingState" in explanationShape, false);
  assert.equal("confidence" in explanationShape, false);
  assert.equal("evidenceChunkIds" in explanationShape, false);
});

test("schema round-trip: a well-formed LLM response validates and its standardNumber is accepted", () => {
  const mockResponse = {
    answer: "IS 5522:2014 applies to stainless steel sheets used for utensils.",
    recommendationExplanations: [{ standardNumber: "IS 5522:2014", reason: "Directly matches the material and product described." }],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: ["Review IS 5522:2014 in full."],
    limitations: [],
  };
  const parsed = LLMAnswerSchema.parse(mockResponse);
  const { accepted, rejected } = validateRecommendationExplanations(parsed.recommendationExplanations, validStandardNumbers);
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 0);
  assert.equal(accepted[0].standardNumber, "IS 5522:2014");
});

test("attempting to smuggle groundingState/confidence into the response is silently stripped by the schema", () => {
  // A model that ignores instructions and emits extra fields anyway —
  // zod's default (non-strict) parse drops unrecognized keys rather than
  // erroring, so this proves the extra fields never reach the response.
  const maliciousResponse = {
    answer: "Definitely IS 5522:2014.",
    recommendationExplanations: [{ standardNumber: "IS 5522:2014", reason: "Trust me." }],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: [],
    limitations: [],
    groundingState: "verified", // not part of the schema
    confidence: "high", // not part of the schema
  };
  const parsed = LLMAnswerSchema.parse(maliciousResponse);
  assert.equal("groundingState" in parsed, false);
  assert.equal("confidence" in parsed, false);
});

test("an unknown/fabricated standard number is rejected, not surfaced", () => {
  const maliciousResponse = LLMAnswerSchema.parse({
    answer: "IS 99999:2099 also applies.",
    recommendationExplanations: [
      { standardNumber: "IS 5522:2014", reason: "Real candidate, fine." },
      { standardNumber: "IS 99999:2099", reason: "Fabricated — this standard was never retrieved." },
    ],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: [],
    limitations: [],
  });
  const { accepted, rejected } = validateRecommendationExplanations(maliciousResponse.recommendationExplanations, validStandardNumbers);
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].standardNumber, "IS 99999:2099");
});

test("a standard number the model invents with no engine candidates at all (empty candidate set) is fully rejected", () => {
  const emptyValidSet = new Set<string | null>();
  const maliciousResponse = LLMAnswerSchema.parse({
    answer: "IS 5522:2014 applies.",
    recommendationExplanations: [{ standardNumber: "IS 5522:2014", reason: "Fabricated — no evidence was actually retrieved." }],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: [],
    limitations: [],
  });
  const { accepted, rejected } = validateRecommendationExplanations(maliciousResponse.recommendationExplanations, emptyValidSet);
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 1);
});

test("malformed answer (wrong types) fails schema validation outright", () => {
  const malformed = {
    answer: 12345, // should be a string
    recommendationExplanations: "not an array",
    certificationNotes: null,
    testingNotes: null,
    nextSteps: [],
    limitations: [],
  };
  const result = LLMAnswerSchema.safeParse(malformed);
  assert.equal(result.success, false);
});

test("missing required fields fails schema validation outright", () => {
  const result = LLMAnswerSchema.safeParse({ answer: "Some answer." });
  assert.equal(result.success, false);
});

test("final recommendation's groundingState/relevanceScore always come from the engine, never the LLM response, even when accepted", () => {
  // Simulates what route.ts does after validation: the LLM only supplied
  // `reason` text; groundingState and relevanceScore are attached from the
  // engine's own `grounding` object, which the LLM never saw a writable
  // field for in the first place.
  const mockResponse = LLMAnswerSchema.parse({
    answer: "IS 5522:2014 applies.",
    recommendationExplanations: [{ standardNumber: "IS 5522:2014", reason: "Matches material and product." }],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: [],
    limitations: [],
  });
  const { accepted } = validateRecommendationExplanations(mockResponse.recommendationExplanations, validStandardNumbers);
  const reasonByStandard = new Map(accepted.map((e) => [e.standardNumber, e.reason]));

  const finalRecommendation = {
    standardNumber: aggregated[0].standardNumber,
    groundingState: grounding.state, // engine-owned
    relevanceScore: grounding.score, // engine-owned
    reason: reasonByStandard.get(aggregated[0].standardNumber) ?? "fallback",
  };
  assert.equal(finalRecommendation.groundingState, "verified");
  assert.equal(finalRecommendation.reason, "Matches material and product.");
});

test("engineConfidence in the final response is the object computed pre-LLM-call, structurally incapable of LLM influence", () => {
  assert.equal(engineConfidence.groundingState, grounding.state);
  assert.equal(engineConfidence.score, grounding.score);
  // engineConfidence was constructed before generateAnswer() is ever
  // called in route.ts — there is no code path where its value depends on
  // the LLM's response.
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
