/**
 * PRD §9 — refusal-correctness evaluation.
 *
 *   "Refusal correctness: Out-of-corpus questions must trigger refusal,
 *    not fabrication."
 *
 * The PRD §8.1 review checklist also asks, specifically: "Has the
 * threshold been checked against at least one real out-of-corpus query to
 * confirm refusal actually triggers, not just assumed?" This script is
 * that check, run against the whole pipeline rather than retrieval alone —
 * scripts/calibrate-refusal-threshold.ts measures the scores, this
 * measures the behaviour those scores are supposed to produce.
 *
 * It asserts both directions, because a refusal evaluation that only
 * tests refusals is trivially passed by a system that refuses everything:
 *
 *   out-of-corpus queries  MUST refuse
 *   in-corpus queries      MUST NOT refuse
 *
 * It also records end-to-end latency per query for the PRD's "under 10
 * seconds" non-functional requirement, and checks that no refusal carries
 * a fabricated standard number in its prose.
 *
 * Usage: npm run eval:refusal
 * Requires DATABASE_URL. Runs the real pipeline, so it will use whatever
 * LLM provider is configured (or none — the engine degrades deterministically).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runQueryPipeline } from "@/lib/query-pipeline";

interface CalibrationQuery {
  id: string;
  query: string;
  coveredBy?: string;
  why?: string;
}

/**
 * Free provider tiers are rate-limited per MINUTE, not just per day — the
 * configured Gemini free tier allows 20 generate_content requests/minute,
 * and each pipeline run makes up to three (translate, intent, synthesis).
 * An unpaced evaluation therefore exhausts the quota partway through and
 * the remaining queries silently degrade to the no-provider path, which
 * looks exactly like a product failure in the results. That happened on
 * the first run of this suite: every Hindi query reported
 * translated=false and the parity score read 0/5 for what was actually a
 * spent quota. Pacing keeps a long run honest.
 *
 * Override with EVAL_PACE_MS=0 when running against a paid provider.
 */
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 6000);
const pace = () => new Promise((r) => setTimeout(r, PACE_MS));

const LATENCY_TARGET_MS = 10_000;

type Outcome = string;

function isRefusal(outcome: Outcome): boolean {
  return outcome.startsWith("refused");
}

interface Row {
  id: string;
  query: string;
  group: "in-corpus" | "out-of-corpus";
  outcome: Outcome;
  refused: boolean;
  expectedRefusal: boolean;
  pass: boolean;
  latencyMs: number;
  citedStandards: string[];
  confidence: string;
}

async function run(q: CalibrationQuery, group: Row["group"]): Promise<Row> {
  const expectedRefusal = group === "out-of-corpus";
  const started = Date.now();
  const r = (await runQueryPipeline(q.query)) as {
    outcome?: string;
    confidence?: string;
    recommendations?: Array<{ standardNumber: string | null; primaryRecommendation?: boolean }>;
  };
  const latencyMs = Date.now() - started;
  const outcome = r.outcome ?? "unknown";
  const refused = isRefusal(outcome);

  return {
    id: q.id,
    query: q.query,
    group,
    outcome,
    refused,
    expectedRefusal,
    pass: refused === expectedRefusal,
    latencyMs,
    // Only PRIMARY recommendations are the system asserting applicability.
    // A refusal may still list loosely-related context below the answer —
    // the fixed refusal copy says exactly that — so listing those is not a
    // fabrication, but presenting one as primary would be.
    citedStandards: (r.recommendations ?? [])
      .filter((rec) => rec.primaryRecommendation)
      .map((rec) => rec.standardNumber)
      .filter((s): s is string => s !== null),
    confidence: r.confidence ?? "unknown",
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — this evaluation needs the live index.");
    process.exit(1);
  }

  const set = JSON.parse(
    readFileSync(path.join(__dirname, "..", "data", "evaluation", "refusal-calibration-queries.json"), "utf-8"),
  ) as { inCorpus: CalibrationQuery[]; outOfCorpus: CalibrationQuery[] };

  const rows: Row[] = [];

  console.log("PRD §9 — refusal correctness\n");
  console.log("OUT-OF-CORPUS (must refuse)");
  for (const q of set.outOfCorpus) {
    await pace();
    const row = await run(q, "out-of-corpus");
    rows.push(row);
    console.log(
      `  ${row.pass ? "PASS" : "FAIL"}  ${row.id}  ${row.outcome.padEnd(32)} ${String(row.latencyMs).padStart(6)}ms  "${row.query.slice(0, 44)}"`,
    );
  }

  console.log("\nIN-CORPUS (must NOT refuse)");
  for (const q of set.inCorpus) {
    await pace();
    const row = await run(q, "in-corpus");
    rows.push(row);
    console.log(
      `  ${row.pass ? "PASS" : "FAIL"}  ${row.id}  ${row.outcome.padEnd(32)} ${String(row.latencyMs).padStart(6)}ms  "${row.query.slice(0, 44)}"`,
    );
  }

  // A refusal that still puts a standard forward as a primary
  // recommendation is the exact "refuse, don't fabricate" failure the PRD
  // is guarding against, so it is reported separately from the pass/fail
  // count rather than folded into it.
  const refusalsWithPrimaryClaims = rows.filter((r) => r.refused && r.citedStandards.length > 0);
  // Same failure in badge form: a refusal shown with a "Verified evidence"
  // or "Partially supported" badge (seen live 2026-09-18). A refusal's
  // confidence must always be "none".
  const refusalsWithConfidence = rows.filter((r) => r.refused && r.confidence !== "none");

  const passed = rows.filter((r) => r.pass).length;
  const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const overTarget = rows.filter((r) => r.latencyMs > LATENCY_TARGET_MS);

  console.log("\n--- Summary ---");
  console.log(`  refusal correctness: ${passed}/${rows.length}`);
  console.log(`  refusals that still asserted a primary standard: ${refusalsWithPrimaryClaims.length}`);
  for (const r of refusalsWithPrimaryClaims) {
    console.log(`    ${r.id}: ${r.citedStandards.join(", ")}`);
  }
  console.log(`  refusals with a confidence other than "none": ${refusalsWithConfidence.length}`);
  for (const r of refusalsWithConfidence) {
    console.log(`    ${r.id}: ${r.confidence}`);
  }
  console.log(
    `  latency (PRD target ${LATENCY_TARGET_MS}ms): median ${latencies[Math.floor(latencies.length / 2)]}ms, max ${latencies[latencies.length - 1]}ms`,
  );
  console.log(`  queries over the latency target: ${overTarget.length}/${rows.length}`);
  for (const r of overTarget) {
    console.log(`    ${r.id}: ${r.latencyMs}ms`);
  }

  const outPath = path.join(__dirname, "..", "data", "evaluation", "refusal-eval-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        latencyTargetMs: LATENCY_TARGET_MS,
        summary: {
          passed,
          total: rows.length,
          refusalsWithPrimaryClaims: refusalsWithPrimaryClaims.length,
          refusalsWithConfidence: refusalsWithConfidence.length,
          medianLatencyMs: latencies[Math.floor(latencies.length / 2)],
          maxLatencyMs: latencies[latencies.length - 1],
          overLatencyTarget: overTarget.length,
        },
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);

  if (passed < rows.length || refusalsWithPrimaryClaims.length > 0 || refusalsWithConfidence.length > 0) {
    process.exitCode = 1;
  }
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
