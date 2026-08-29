/**
 * Measures the document-diversity reranker against the no-op baseline over
 * the full golden query set — retrieval only, no LLM calls, so it costs
 * nothing and runs without OpenRouter/Gateway availability.
 *
 * This exists to answer one question honestly: does the reranker actually
 * improve retrieval, or does it just move the failure around? Every number
 * printed comes from a real query against the live database via
 * retrieveChunks() — the same function the application uses — with only
 * the `reranker` argument swapped, so there is no duplicated retrieval
 * logic to drift out of sync with production.
 *
 * Usage: npx dotenv-cli -e .env.local -- tsx scripts/eval-reranker.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { retrieveChunks } from "../src/lib/retrieval";
import { noopReranker, documentDiversityReranker } from "../src/lib/ml/reranker";
import type { Reranker } from "../src/lib/ml/types";

interface GoldenQuery {
  id: string;
  category: string;
  query: string;
  expectedStandardIds: string[];
}

async function evaluate(queries: GoldenQuery[], reranker: Reranker) {
  let hits = 0;
  let totalWithExpectation = 0;
  let correctEmpty = 0;
  let totalExpectEmpty = 0;
  const rows: Array<{ id: string; category: string; pass: boolean; got: string }> = [];
  const failures: string[] = [];

  for (const q of queries) {
    const results = await retrieveChunks(q.query, { limit: 5, reranker });
    const topStandards = [...new Set(results.map((r) => r.standardNumber))];

    let pass: boolean;
    if (q.expectedStandardIds.length > 0) {
      totalWithExpectation++;
      pass = q.expectedStandardIds.every((id) => topStandards.includes(id));
      if (pass) hits++;
      else failures.push(`${q.id}: expected ${q.expectedStandardIds.join(",")}, got ${topStandards.join(",") || "(none)"}`);
    } else {
      totalExpectEmpty++;
      pass = !results.some((r) => r.identifierMatch);
      if (pass) correctEmpty++;
      else failures.push(`${q.id}: unexpected identifierMatch=true for a query with no expected standard`);
    }
    rows.push({ id: q.id, category: q.category, pass, got: topStandards.join(", ") || "(none)" });
  }

  return {
    name: reranker.name,
    recall: `${hits}/${totalWithExpectation}`,
    negative: `${correctEmpty}/${totalExpectEmpty}`,
    rows,
    failures,
  };
}

async function main() {
  const queries: GoldenQuery[] = JSON.parse(
    readFileSync(path.join(__dirname, "..", "data", "evaluation", "golden-queries.json"), "utf-8"),
  );

  const baseline = await evaluate(queries, noopReranker);
  const reranked = await evaluate(queries, documentDiversityReranker);

  console.log(`\n=== ${baseline.name} (baseline) ===`);
  console.log(`Recall: ${baseline.recall}   No-false-match: ${baseline.negative}`);
  if (baseline.failures.length) console.log("Failures:", baseline.failures);

  console.log(`\n=== ${reranked.name} ===`);
  console.log(`Recall: ${reranked.recall}   No-false-match: ${reranked.negative}`);
  if (reranked.failures.length) console.log("Failures:", reranked.failures);

  console.log("\n=== Per-query diff (baseline -> reranked) ===");
  const diffs = baseline.rows
    .map((b, i) => ({ b, r: reranked.rows[i] }))
    .filter(({ b, r }) => b.pass !== r.pass || b.got !== r.got);
  if (diffs.length === 0) {
    console.log("No per-query differences.");
  } else {
    console.table(
      diffs.map(({ b, r }) => ({
        id: b.id,
        category: b.category,
        baselinePass: b.pass,
        baselineGot: b.got,
        rerankedPass: r.pass,
        rerankedGot: r.got,
      })),
    );
  }

  const q17Baseline = baseline.rows.find((r) => r.id === "Q17");
  const q17Reranked = reranked.rows.find((r) => r.id === "Q17");
  console.log(`\nQ17 specifically — baseline: ${q17Baseline?.pass ? "PASS" : "FAIL"} (${q17Baseline?.got}), reranked: ${q17Reranked?.pass ? "PASS" : "FAIL"} (${q17Reranked?.got})`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
