/**
 * The evaluation harness prompts/final.md §61-62 asks for. Computes
 * Recall@5/10/20, MRR@10, and NDCG@5/10 for the CURRENT retrieval +
 * reranking stack (hybrid retrieval + the deterministic
 * document-diversity-v1 reranker — see src/lib/ml/reranker.ts) against
 * the real 20-query golden set (data/evaluation/golden-queries.json).
 *
 * This is a BASELINE run, not an ML model evaluation — there is no
 * trained reranker to evaluate yet (data/ml/README.md explains why:
 * 0/300 labeled query-document pairs exist). Every future trained
 * reranker must be run through this same harness and beat these numbers
 * before promotion to PRODUCTION in the model registry (§60
 * baseline-first rule).
 *
 * NDCG here uses BINARY relevance (a document either is or isn't in a
 * golden query's expectedStandardIds) because no graded 0-3 relevance
 * dataset exists (§8) — this is a real, disclosed simplification, not a
 * silent approximation.
 *
 * Precondition: the dev server must be running against a database with
 * the corpus ingested (same precondition as scripts/eval-retrieval.ts).
 *
 * Usage: npx tsx scripts/ml-evaluate.ts [baseUrl]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { registerModel } from "../src/lib/ml/model-registry";

interface GoldenQuery {
  id: string;
  category: string;
  query: string;
  expectedStandardIds: string[];
}

interface SearchResult {
  standardNumber: string | null;
}

export function dcg(relevances: number[]): number {
  return relevances.reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);
}

export function ndcgAtK(rankedStandards: (string | null)[], expected: Set<string>, k: number): number {
  const relevances = rankedStandards.slice(0, k).map((s) => (s && expected.has(s) ? 1 : 0));
  const actualDcg = dcg(relevances);
  const idealRelevances = Array.from({ length: Math.min(k, expected.size) }, () => 1);
  const idealDcg = dcg(idealRelevances);
  return idealDcg === 0 ? 0 : actualDcg / idealDcg;
}

export function recallAtK(rankedStandards: (string | null)[], expected: Set<string>, k: number): boolean {
  const top = new Set(rankedStandards.slice(0, k).filter((s): s is string => s !== null));
  return [...expected].every((id) => top.has(id));
}

export function reciprocalRank(rankedStandards: (string | null)[], expected: Set<string>): number {
  for (let i = 0; i < rankedStandards.length; i++) {
    const s = rankedStandards[i];
    if (s && expected.has(s)) return 1 / (i + 1);
  }
  return 0;
}

async function main() {
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const golden: GoldenQuery[] = JSON.parse(
    readFileSync(path.join(__dirname, "..", "data", "evaluation", "golden-queries.json"), "utf-8"),
  );
  // Ranking metrics only make sense for queries with a real expected
  // answer — the hallucination-trap/unsupported-query cases (empty
  // expectedStandardIds) are correctness tests for retrieval refusing to
  // fabricate a match, not ranking-quality tests; scripts/eval-retrieval.ts
  // already covers those separately.
  const rankable = golden.filter((q) => q.expectedStandardIds.length > 0);

  const perQuery: Array<{ id: string; category: string; recall5: boolean; recall10: boolean; recall20: boolean; rr: number; ndcg5: number; ndcg10: number }> = [];

  for (const q of rankable) {
    const res = await fetch(`${baseUrl}/api/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.query, limit: 20 }),
    });
    const body = (await res.json()) as { results: SearchResult[] };
    const rankedStandards = (body.results ?? []).map((r) => r.standardNumber);
    // Dedupe consecutive same-standard chunks into a per-standard ranking
    // without losing rank order — the same standard's first (best) chunk
    // determines its rank.
    const seen = new Set<string>();
    const dedupedRanked: (string | null)[] = [];
    for (const s of rankedStandards) {
      if (s === null || !seen.has(s)) {
        dedupedRanked.push(s);
        if (s) seen.add(s);
      }
    }

    const expected = new Set(q.expectedStandardIds);
    perQuery.push({
      id: q.id,
      category: q.category,
      recall5: recallAtK(dedupedRanked, expected, 5),
      recall10: recallAtK(dedupedRanked, expected, 10),
      recall20: recallAtK(dedupedRanked, expected, 20),
      rr: reciprocalRank(dedupedRanked, expected),
      ndcg5: ndcgAtK(dedupedRanked, expected, 5),
      ndcg10: ndcgAtK(dedupedRanked, expected, 10),
    });
  }

  const mean = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
  const results = {
    model: "document-diversity-v1",
    modelType: "heuristic",
    dataset: "golden-queries-v1",
    datasetSize: rankable.length,
    excludedFromRanking: golden.length - rankable.length,
    recallAt5: mean(perQuery.map((r) => (r.recall5 ? 1 : 0))),
    recallAt10: mean(perQuery.map((r) => (r.recall10 ? 1 : 0))),
    recallAt20: mean(perQuery.map((r) => (r.recall20 ? 1 : 0))),
    mrr: mean(perQuery.map((r) => r.rr)),
    ndcgAt5: mean(perQuery.map((r) => r.ndcg5)),
    ndcgAt10: mean(perQuery.map((r) => r.ndcg10)),
    perQuery,
    evaluatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify({ ...results, perQuery: undefined }, null, 2));

  const outDir = path.join(__dirname, "..", "data", "ml", "eval", "results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `baseline-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWritten to ${outPath}`);

  // Register/update the baseline entry in the model registry (§45, §60)
  // with these freshly-measured numbers — never hand-typed metrics.
  registerModel({
    modelId: "document-diversity-v1",
    modelName: "Document-diversity heuristic reranker",
    version: "v1",
    artifactPath: null,
    modelType: "heuristic",
    datasetVersion: "golden-queries-v1",
    metrics: {
      recallAt5: results.recallAt5,
      recallAt10: results.recallAt10,
      recallAt20: results.recallAt20,
      mrr: results.mrr,
      ndcgAt5: results.ndcgAt5,
      ndcgAt10: results.ndcgAt10,
    },
    createdAt: new Date().toISOString(),
    status: "PRODUCTION", // this heuristic is what's actually deployed today
    approvedBy: null,
    checksum: null,
  });
  console.log("Registered as the current PRODUCTION baseline in data/ml/artifacts/registry.json");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
