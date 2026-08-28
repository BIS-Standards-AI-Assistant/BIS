/**
 * Generation-level evaluation harness. Calls /api/v1/query exactly ONCE per
 * golden query not already covered (see data/evaluation/generation-results.json
 * for the 4 queries captured earlier this session, reused here rather than
 * re-run, per the explicit "don't waste credit" instruction).
 *
 * Persists after every single call, not at the end — so if OpenRouter's
 * free-tier balance runs out mid-run (expected; it's nearly exhausted),
 * everything completed so far is kept, and the run stops immediately
 * rather than burning further calls into a wall of errors.
 *
 * Usage: npx tsx scripts/eval-generation.ts [baseUrl]
 * Precondition: dev server running against the ingested corpus.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface GoldenQuery {
  id: string;
  query: string;
  alreadyTested?: boolean;
}

interface StoredResult {
  id: string;
  query: string;
  source: "cached_from_session" | "live_this_run";
  response?: unknown;
  httpStatus: number | null;
  error: string | null;
  latencyMs?: number;
}

const CREDIT_ERROR_PATTERNS = [/credits/i, /max_tokens/i, /payment/i, /402/];

function looksLikeCreditExhaustion(message: string): boolean {
  return CREDIT_ERROR_PATTERNS.some((p) => p.test(message));
}

async function main() {
  const baseUrl = process.argv[2] ?? "http://localhost:3000";
  const goldenPath = path.join(__dirname, "..", "data", "evaluation", "golden-queries.json");
  const resultsPath = path.join(__dirname, "..", "data", "evaluation", "generation-results.json");

  const golden: GoldenQuery[] = JSON.parse(readFileSync(goldenPath, "utf-8"));
  const results: StoredResult[] = JSON.parse(readFileSync(resultsPath, "utf-8"));
  const alreadyHave = new Set(results.map((r) => r.id));

  const remaining = golden.filter((q) => !q.alreadyTested && !alreadyHave.has(q.id));
  console.log(`${results.length} results already on disk. ${remaining.length} queries remaining to run.\n`);

  let ran = 0;
  let stoppedOnCredit = false;

  for (const q of remaining) {
    console.log(`[${q.id}] running: "${q.query}"`);
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/v1/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.query }),
      });
      const latencyMs = Date.now() - start;
      const body = await res.json();

      if (!res.ok) {
        const message = typeof body?.message === "string" ? body.message : JSON.stringify(body);
        results.push({ id: q.id, query: q.query, source: "live_this_run", httpStatus: res.status, error: message, latencyMs });
        writeFileSync(resultsPath, JSON.stringify(results, null, 2) + "\n");
        console.log(`  FAILED (${res.status}): ${message}`);
        if (looksLikeCreditExhaustion(message)) {
          console.log("\nStopping: this looks like credit exhaustion, not a code bug. Not burning further calls.");
          stoppedOnCredit = true;
          break;
        }
        continue;
      }

      results.push({ id: q.id, query: q.query, source: "live_this_run", response: body, httpStatus: res.status, error: null, latencyMs });
      writeFileSync(resultsPath, JSON.stringify(results, null, 2) + "\n");
      ran++;
      console.log(`  OK (${latencyMs}ms) — confidence=${body.confidence}, recommendations=${body.recommendations?.length ?? 0}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: q.id, query: q.query, source: "live_this_run", httpStatus: null, error: message });
      writeFileSync(resultsPath, JSON.stringify(results, null, 2) + "\n");
      console.log(`  ERROR: ${message}`);
    }
  }

  console.log(`\nDone. Ran ${ran} new queries this session. Total results on disk: ${results.length}/${golden.length}.`);
  if (stoppedOnCredit) {
    console.log(`Blocked by credit exhaustion: ${golden.length - results.length} queries not attempted.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
