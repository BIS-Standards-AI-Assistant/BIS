/**
 * Retrieval-only regression check against data/evaluation/golden-queries.json.
 * No LLM calls — exercises /api/v1/search only, so it costs nothing and
 * doesn't depend on the AI Gateway / OpenRouter being available.
 *
 * Precondition: the dev server must be running (`npm run dev`) against a
 * database that has the seed corpus ingested (`npm run ingest`).
 *
 * Usage: npx tsx scripts/eval-retrieval.ts [baseUrl]
 */
import { readFileSync } from "node:fs";
import path from "node:path";

interface GoldenQuery {
  id: string;
  category: string;
  query: string;
  expectedStandardIds: string[];
  requiresEvidence: boolean;
  retrievalHardNegative?: boolean;
}

interface SearchResult {
  standardNumber: string | null;
  identifierMatch: boolean;
}

async function main() {
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const queries: GoldenQuery[] = JSON.parse(
    readFileSync(path.join(__dirname, "..", "data", "evaluation", "golden-queries.json"), "utf-8"),
  );

  let hits = 0;
  let totalWithExpectation = 0;
  let correctEmpty = 0;
  let totalExpectEmpty = 0;
  const rows: Array<{ id: string; category: string; pass: boolean }> = [];
  const failures: string[] = [];

  for (const q of queries) {
    const res = await fetch(`${baseUrl}/api/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.query, limit: 5 }),
    });
    const body = (await res.json()) as { results: SearchResult[] };
    const results = body.results ?? [];
    const topStandards = [...new Set(results.map((r) => r.standardNumber))];

    let pass: boolean;
    if (q.expectedStandardIds.length > 0) {
      totalWithExpectation++;
      pass = q.expectedStandardIds.every((id) => topStandards.includes(id));
      if (pass) hits++;
      else failures.push(`${q.id}: expected ${q.expectedStandardIds.join(",")}, got ${topStandards.join(",") || "(none)"}`);
    } else {
      totalExpectEmpty++;
      // The hard invariant: no chunk from a nonexistent/unresolvable
      // identifier should ever get the identifier-match boost. Ambiguous
      // natural-language queries with no single "correct" standard (see
      // golden-queries.json notes on Q11/Q20) are intentionally not held
      // to "must return nothing" — the generation layer's groundingState
      // is what should hedge those, not retrieval refusing to return
      // plausible candidates.
      pass = !results.some((r) => r.identifierMatch);
      if (pass) correctEmpty++;
      else failures.push(`${q.id}: unexpected identifierMatch=true for a query with no expected standard`);
    }
    rows.push({ id: q.id, category: q.category, pass });
  }

  console.table(rows);
  console.log(`\nRecall (expected standard in top 5): ${hits}/${totalWithExpectation}`);
  console.log(`No false identifier-match: ${correctEmpty}/${totalExpectEmpty}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
