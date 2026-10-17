// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { runQueryPipeline } from "./query-pipeline";
import type { RetrievedChunk } from "./retrieval";
import type { QueryIntent } from "./intent";
import type { LLMAnswer } from "./answer";

// Only the I/O edges are mocked — translation, LLM intent extraction, the
// agent, retrieval, the registry/graph lookups, LLM answer generation and the
// query log. Every deterministic stage in between (normalisation, evidence
// aggregation, relevance floor, coverage, conflicts, grounding, confidence,
// knowledge boundary, applicability gate, refusal copy) runs for real.

const translateQueryToEnglish = vi.fn();
vi.mock("./translate", () => ({ translateQueryToEnglish: (...a: unknown[]) => translateQueryToEnglish(...a) }));

const extractQueryIntent = vi.fn();
vi.mock("./intent", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./intent")>()),
  extractQueryIntent: (...a: unknown[]) => extractQueryIntent(...a),
}));

vi.mock("./agent/orchestrator", () => ({
  runAgent: async () => {
    throw new Error("agent unavailable in tests");
  },
}));

const retrieveChunks = vi.fn();
vi.mock("./retrieval", () => ({ retrieveChunks: (...a: unknown[]) => retrieveChunks(...a) }));
vi.mock("./reference-registry", () => ({ buildReferenceEntry: async () => null }));
vi.mock("./graph/graph-retrieval", () => ({ getNeighbors: async () => [] }));

const generateAnswer = vi.fn();
vi.mock("./answer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./answer")>()),
  generateAnswer: (...a: unknown[]) => generateAnswer(...a),
}));

const insertValues = vi.fn();
vi.mock("@/db", () => ({ getDb: () => ({ insert: () => ({ values: insertValues }) }) }));

const WATER = "Packaged Drinking Water (Other than Packaged Natural Mineral Water) - Specification";

function chunk(documentId: string, standardNumber: string, title: string, rank: number, text: string, similarity: number | null): RetrievedChunk {
  return {
    chunkId: `${documentId}-${rank}`,
    documentId,
    standardNumber,
    title,
    sourceUrl: "https://www.bis.gov.in/x.pdf",
    sourceOrg: "BIS",
    section: null,
    clause: `${rank}.1`,
    page: 1,
    text,
    semanticScore: 1 / (60 + rank),
    semanticSimilarity: similarity,
    keywordScore: 1 / (60 + rank),
    identifierMatch: false,
    score: 2 / (60 + rank),
    rerankReason: "",
  };
}

function waterEvidence(similarity: number): RetrievedChunk[] {
  return [
    chunk("d1", "IS 14543:2016", WATER, 1, "Packaged drinking water shall be bottled in food grade containers and tested for total dissolved solids.", similarity),
    chunk("d1", "IS 14543:2016", WATER, 2, "Packaged drinking water samples shall be tested as per the methods of test.", similarity - 0.05),
  ];
}

function llmAnswer(overrides: Partial<LLMAnswer> = {}): LLMAnswer {
  return {
    answer: "IS 14543 covers packaged drinking water.",
    recommendationExplanations: [
      { standardNumber: "IS 14543:2016", reason: "It is the packaged drinking water specification." },
      { standardNumber: "IS 9999:2099", reason: "An invented standard the model made up." },
    ],
    certificationNotes: null,
    testingNotes: null,
    nextSteps: ["Apply for a BIS licence."],
    limitations: [],
    ...overrides,
  } as LLMAnswer;
}

async function useDeterministicIntent(overrides: Partial<QueryIntent> = {}) {
  const { deterministicIntentFallback } = await vi.importActual<typeof import("./intent")>("./intent");
  extractQueryIntent.mockImplementation(async (q: string) => ({ ...deterministicIntentFallback(q), ...overrides }));
}

const originalDatabaseUrl = process.env.DATABASE_URL;

/** Runs a query that is expected to reach retrieval, narrowing away the out-of-scope response shape. */
async function run(...args: Parameters<typeof runQueryPipeline>) {
  const r = await runQueryPipeline(...args);
  if (r.outcome === "refused_out_of_scope") throw new Error("unexpected out-of-scope refusal");
  return r;
}

beforeEach(async () => {
  for (const fn of [translateQueryToEnglish, extractQueryIntent, retrieveChunks, generateAnswer, insertValues]) fn.mockReset();
  translateQueryToEnglish.mockImplementation(async (q: string) => ({ queryForRetrieval: q, originalQuery: q, translated: false, method: "skipped-not-needed" }));
  await useDeterministicIntent();
  generateAnswer.mockResolvedValue(llmAnswer());
  insertValues.mockResolvedValue(undefined);
  delete process.env.DATABASE_URL;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("runQueryPipeline — out of scope", () => {
  test("an off-topic query is refused before retrieval or answer generation", async () => {
    const r = await runQueryPipeline("chocolate cake recipe");
    expect(r.outcome).toBe("refused_out_of_scope");
    expect(r.isRelevant).toBe(false);
    expect(r.recommendations).toEqual([]);
    expect(r.confidence).toBe("none");
    expect(retrieveChunks).not.toHaveBeenCalled();
    expect(generateAnswer).not.toHaveBeenCalled();
  });
});

describe("runQueryPipeline — answered", () => {
  test("well-grounded evidence is answered with the model's prose and next steps", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    const r = await run("packaged drinking water");
    expect(r.outcome).toBe("answered");
    expect(r.answer).toBe("IS 14543 covers packaged drinking water.");
    expect(r.nextSteps).toEqual(["Apply for a BIS licence."]);
    expect(r.recommendations[0]).toMatchObject({ standardNumber: "IS 14543:2016", primaryRecommendation: true });
    expect(r.recommendations[0].reason).toBe("It is the packaged drinking water specification.");
  });

  test("a model explanation for a standard that was never retrieved is dropped", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    const r = await run("packaged drinking water");
    expect(r.recommendations.map((x) => x.standardNumber)).not.toContain("IS 9999:2099");
    expect(JSON.stringify(r.recommendations)).not.toContain("invented");
  });

  test("every recommendation carries its evidence with source links", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    const r = await run("packaged drinking water");
    expect(r.recommendations[0].evidence).toHaveLength(2);
    expect(r.recommendations[0].evidence[0]).toMatchObject({ clause: "1.1", sourceUrl: "https://www.bis.gov.in/x.pdf" });
  });

  test("the agent failing does not fail the query", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    const r = await run("packaged drinking water");
    expect(r.outcome).toBe("answered");
    expect(r.toolEvidence).toBeNull();
  });
});

describe("runQueryPipeline — the applicability gate outranks the model", () => {
  test("a material mismatch is never primary, and its reason is the engine's, not the model's", async () => {
    await useDeterministicIntent({ material: "steel", product: "pipes" });
    retrieveChunks.mockResolvedValue([
      chunk("pvc", "IS 4985:2021", "Unplasticized PVC Pipes for Potable Water Supplies", 1, "Pipes shall be tested for hydrostatic pressure.", 0.72),
      chunk("pvc", "IS 4985:2021", "Unplasticized PVC Pipes for Potable Water Supplies", 2, "Pipes shall be marked with the class.", 0.7),
    ]);
    generateAnswer.mockResolvedValue(llmAnswer({
      recommendationExplanations: [{ standardNumber: "IS 4985:2021", reason: "Definitely the right standard for steel pipes." }],
    }));

    const r = await run("standard for steel pipes");
    const pvc = r.recommendations.find((x) => x.standardNumber === "IS 4985:2021")!;
    expect(pvc.primaryRecommendation).toBe(false);
    expect(pvc.recommendationStatus).toBe("RELATED_BUT_NOT_APPLICABLE");
    expect(pvc.reason).not.toContain("Definitely the right standard");
    expect(pvc.reason).toBe(pvc.applicability.reason);
  });
});

describe("runQueryPipeline — refusals", () => {
  test("below the relevance floor: fixed refusal, synthesis skipped, nothing left as primary", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.3));
    const r = await run("packaged drinking water");
    expect(r.outcome).toBe("refused_insufficient_evidence");
    expect(r.answer).not.toBe("IS 14543 covers packaged drinking water.");
    expect(generateAnswer.mock.calls[0][1]).toMatchObject({ skipSynthesis: true });
    expect(r.recommendations.every((x) => !x.primaryRecommendation)).toBe(true);
    expect(r.recommendations.every((x) => x.recommendationStatus === "INSUFFICIENT_EVIDENCE")).toBe(true);
    expect(r.confidence).toBe("none");
    expect(r.limitations.some((l) => l.includes("required minimum of 0.45"))).toBe(true);
    expect(r.clarificationNeeded).toBeUndefined();
  });

  test("no retrieved evidence at all is a refusal with no confidence", async () => {
    retrieveChunks.mockResolvedValue([]);
    const r = await run("packaged drinking water");
    expect(r.outcome).toBe("refused_insufficient_evidence");
    expect(r.recommendations).toEqual([]);
    expect(r.confidence).toBe("none");
    expect(r.complianceMap.standards).toEqual([]);
  });

  test("a Hindi answer language gets the reviewed Hindi refusal text", async () => {
    retrieveChunks.mockResolvedValue([]);
    const r = await run("packaged drinking water", { language: "hi" });
    expect(/[ऀ-ॿ]/.test(r.answer)).toBe(true);
  });

  test("a language without reviewed refusal copy says the English text is a fallback", async () => {
    retrieveChunks.mockResolvedValue([]);
    const r = await run("packaged drinking water", { language: "ta" });
    expect(r.limitations[0]).toMatch(/shown in English because a reviewed Tamil translation/);
  });
});

describe("runQueryPipeline — translation", () => {
  test("when translation was needed but unavailable, the first limitation says so", async () => {
    translateQueryToEnglish.mockImplementation(async (q: string) => ({ queryForRetrieval: q, originalQuery: q, translated: false, method: "skipped-no-provider" }));
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    const r = await run("पैकेज्ड पेयजल", { language: "hi" });
    expect(r.limitations[0]).toMatch(/अनुवाद/);
    expect(r.translated).toBe(false);
  });
});

describe("runQueryPipeline — query log", () => {
  test("nothing is written without a database configured", async () => {
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    await run("packaged drinking water");
    expect(insertValues).not.toHaveBeenCalled();
  });

  test("with a database, the outcome and retrieved chunk ids are logged", async () => {
    process.env.DATABASE_URL = "postgres://test";
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    await run("packaged drinking water");
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      query: "packaged drinking water",
      outcome: "answered",
      retrievedChunkIds: ["d1-1", "d1-2"],
    }));
  });

  test("a failing log write never fails the query", async () => {
    process.env.DATABASE_URL = "postgres://test";
    insertValues.mockRejectedValue(new Error("connection reset"));
    retrieveChunks.mockResolvedValue(waterEvidence(0.72));
    await expect(runQueryPipeline("packaged drinking water")).resolves.toMatchObject({ outcome: "answered" });
  });
});
