/**
 * Live PRD smoke test — exercises the real pipeline against the real Neon
 * DB and the configured LLM provider. Checks the requirements added in the
 * 2026-09-04 PRD-conformance pass:
 *   FR16  latencyMs is returned
 *   FR13  outcome is set
 *   FR2/§7 Hindi query is detected + translated for retrieval
 *   FR11  answerLanguage is "hi" for a Hindi query
 *   FR4/§8 an out-of-corpus query yields the fixed refusal
 *
 * Run: npm run smoke:prd   (dotenv -e .env.local -- tsx scripts/live-prd-smoke.ts)
 */
import { writeFileSync } from "fs";
import { runQueryPipeline } from "../src/lib/query-pipeline";

const CASES: Array<{ label: string; query: string; language?: "en" | "hi"; expect: string }> = [
  {
    label: "English · in-corpus product",
    query: "What tests are required for packaged drinking water?",
    language: "en",
    expect: "answered with recommendations + evidence",
  },
  {
    label: "English · deliberately out-of-corpus",
    query: "What is the boiling point of xenon at 3 atmospheres?",
    language: "en",
    expect: "refused_out_of_scope, fixed refusal string",
  },
  {
    label: "English · on-topic but nothing indexed",
    query: "certification route for industrial safety helmets IS 2925",
    language: "en",
    expect: "refused_insufficient_evidence or refused_not_in_database",
  },
  {
    label: "Hindi · in-corpus product (Devanagari)",
    query: "पैकेज्ड पेयजल के लिए कौन से परीक्षण आवश्यक हैं?",
    language: "hi",
    expect: "translated=true, answerLanguage=hi, answered",
  },
];

function line(s = "") {
  console.log(s);
}

async function main() {
  const report: unknown[] = [];
  for (const c of CASES) {
    line("=".repeat(78));
    line(`CASE: ${c.label}`);
    line(`query: ${c.query}`);
    line(`expect: ${c.expect}`);
    const t0 = Date.now();
    try {
      const r = await runQueryPipeline(c.query, { language: c.language }) as Record<string, unknown>;
      const recsFull = (r.recommendations as Array<{ standardNumber: string | null; groundingState: string; evidence: unknown[]; applicability?: { state: string } }>) ?? [];
      report.push({
        label: c.label, query: c.query,
        latencyMs: r.latencyMs, outcome: r.outcome, language: r.language,
        answerLanguage: r.answerLanguage, translated: r.translated, isRelevant: r.isRelevant,
        confidence: r.confidence, knowledgeBoundary: (r.knowledgeBoundary as { state?: string })?.state,
        recommendations: recsFull.map((x) => ({ n: x.standardNumber, grounding: x.groundingState, applicability: x.applicability?.state, evidence: x.evidence.length })),
        answer: r.answer, limitations: r.limitations,
      });
      line(`  wallclock:        ${Date.now() - t0} ms`);
      line(`  latencyMs (resp): ${(r as { latencyMs?: number }).latencyMs}`);
      line(`  outcome:          ${(r as { outcome?: string }).outcome}`);
      line(`  language:         ${(r as { language?: string }).language}`);
      line(`  answerLanguage:   ${(r as { answerLanguage?: string }).answerLanguage}`);
      line(`  translated:       ${(r as { translated?: boolean }).translated}`);
      line(`  isRelevant:       ${(r as { isRelevant?: boolean }).isRelevant}`);
      line(`  confidence:       ${(r as { confidence?: string }).confidence}`);
      const recs = (r as { recommendations?: Array<{ standardNumber: string | null; groundingState: string; evidence: unknown[] }> }).recommendations ?? [];
      line(`  recommendations:  ${recs.length}`);
      for (const rec of recs.slice(0, 4)) {
        line(`     - ${rec.standardNumber ?? "(no number)"} · ${rec.groundingState} · ${rec.evidence.length} evidence`);
      }
      line(`  answer:`);
      line(`     ${String((r as { answer?: string }).answer ?? "").replace(/\n/g, "\n     ")}`);
      const lims = (r as { limitations?: string[] }).limitations ?? [];
      if (lims.length) line(`  limitations: ${lims.map((l) => `\n     - ${l}`).join("")}`);
    } catch (err) {
      line(`  ERROR: ${err instanceof Error ? err.stack : String(err)}`);
    }
    line();
  }
  writeFileSync("scripts/_smoke-report.json", JSON.stringify(report, null, 2));
  line("=".repeat(78));
  line("done — wrote scripts/_smoke-report.json");
  process.exit(0);
}

main();
