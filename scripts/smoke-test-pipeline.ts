/**
 * Real end-to-end smoke test of the full intelligence pipeline, run
 * per-stage (not through the HTTP route) so that if the LLM call fails —
 * a live possibility given limited OpenRouter credit — every deterministic
 * stage that already ran is still visible instead of being swallowed by
 * the route's single try/catch.
 *
 * No production code is modified by this script. It imports the exact
 * same functions the route uses.
 *
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/smoke-test-pipeline.ts "<query>" ["<query2>" ...]
 */
import { normalizeQuery } from "../src/lib/query-normalization";
import { extractQueryIntent } from "../src/lib/intent";
import { retrieveChunks } from "../src/lib/retrieval";
import { aggregateEvidence } from "../src/lib/evidence-aggregation";
import { analyzeCoverage } from "../src/lib/coverage-analysis";
import { detectConflicts } from "../src/lib/conflict-detection";
import { computeGrounding } from "../src/lib/grounding";
import { computeEngineConfidence } from "../src/lib/confidence";
import { generateAnswer, type EvidencePackage, type EvidencePackageCandidate } from "../src/lib/answer";

async function runQuery(query: string) {
  console.log(`\n${"=".repeat(70)}\nQUERY: ${query}\n${"=".repeat(70)}`);

  const normalized = normalizeQuery(query);
  console.log(`[1] normalization OK — normalizedQuery="${normalized.normalizedQuery}" identifiers=${JSON.stringify(normalized.identifiers.map((i) => i.normalized))}`);

  let intent;
  const intentStart = Date.now();
  try {
    intent = await extractQueryIntent(normalized.normalizedQuery);
    console.log(`[2] intent extraction OK (${Date.now() - intentStart}ms) — intent=${intent.intent} product=${intent.product} material=${intent.material} searchQuery="${intent.searchQuery}"`);
  } catch (err) {
    console.log(`[2] intent extraction FAILED (${Date.now() - intentStart}ms): ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const chunks = await retrieveChunks(intent.searchQuery || normalized.normalizedQuery, { limit: 12 });
  console.log(`[3] hybrid retrieval + reranking OK — ${chunks.length} chunks, standards=${JSON.stringify([...new Set(chunks.map((c) => c.standardNumber))])}`);

  const aggregated = aggregateEvidence(chunks).slice(0, 4);
  console.log(
    `[4] evidence aggregation OK — ${aggregated.length} candidates: ${JSON.stringify(
      aggregated.map((a) => ({ standard: a.standardNumber, chunkCount: a.chunkCount, weightedScore: Number(a.weightedScore.toFixed(5)) })),
    )}`,
  );

  const coverageByStandard = new Map(aggregated.map((c) => [c.documentId, analyzeCoverage(intent, c, normalized.identifiers)]));
  console.log(`[5] coverage analysis OK — ${JSON.stringify([...coverageByStandard.values()].map((c) => c.overallCoverageRatio))}`);

  const conflicts = detectConflicts(aggregated);
  console.log(`[6] conflict detection OK — ${conflicts.length} conflict(s): ${JSON.stringify(conflicts)}`);

  const groundingByStandard = new Map(
    aggregated.map((c) => [c.documentId, computeGrounding(c, aggregated, coverageByStandard.get(c.documentId)!, conflicts)]),
  );
  console.log(
    `[7] deterministic grounding OK — ${JSON.stringify(
      aggregated.map((c) => ({ standard: c.standardNumber, state: groundingByStandard.get(c.documentId)!.state, score: Number(groundingByStandard.get(c.documentId)!.score.toFixed(3)) })),
    )}`,
  );

  const top = aggregated[0] ?? null;
  const engineConfidence = computeEngineConfidence(
    top,
    top ? coverageByStandard.get(top.documentId)! : null,
    conflicts,
    top ? groundingByStandard.get(top.documentId)! : null,
  );
  console.log(`[8] deterministic confidence OK — band=${engineConfidence.band} score=${engineConfidence.score.toFixed(3)} groundingState=${engineConfidence.groundingState}`);

  const evidencePackageCandidates: EvidencePackageCandidate[] = aggregated.map((c) => ({
    standardNumber: c.standardNumber,
    title: c.title,
    groundingState: groundingByStandard.get(c.documentId)!.state,
    coverage: coverageByStandard.get(c.documentId)!,
    chunks: c.chunks.map((ch) => ({ chunkId: ch.chunkId, section: ch.section, clause: ch.clause, text: ch.text })),
    primaryRecommendation: true, // this manual smoke script doesn't exercise the applicability gate — see query-pipeline.ts for the real wiring
    applicabilityReason: "",
  }));
  const pkg: EvidencePackage = { query, intent, candidates: evidencePackageCandidates, conflicts, engineConfidence };
  console.log(`    evidence package built for ${pkg.candidates.length} candidate(s), engine-owned groundingState/confidence attached before LLM call`);

  const answerStart = Date.now();
  try {
    const llmAnswer = await generateAnswer(pkg);
    const latency = Date.now() - answerStart;
    console.log(`[9] LLM answer generation OK (${latency}ms)`);
    console.log(`    answer: "${llmAnswer.answer.slice(0, 200)}${llmAnswer.answer.length > 200 ? "..." : ""}"`);
    console.log(`    recommendationExplanations: ${JSON.stringify(llmAnswer.recommendationExplanations)}`);
    console.log(`    certificationNotes: ${llmAnswer.certificationNotes ? "present" : "null"}, testingNotes: ${llmAnswer.testingNotes ? "present" : "null"}`);
    console.log(`    limitations: ${JSON.stringify(llmAnswer.limitations)}`);

    const validStandardNumbers = new Set(aggregated.map((c) => c.standardNumber));
    const accepted = llmAnswer.recommendationExplanations.filter((e) => validStandardNumbers.has(e.standardNumber));
    const rejected = llmAnswer.recommendationExplanations.filter((e) => !validStandardNumbers.has(e.standardNumber));
    console.log(`[10] standard-number validation OK — accepted=${accepted.length} rejected=${rejected.length}${rejected.length ? " REJECTED: " + JSON.stringify(rejected) : ""}`);

    console.log(`[11] final QueryResponse would carry: confidence=${engineConfidence.band} (engine, not LLM), groundingState per candidate=${JSON.stringify(aggregated.map((c) => groundingByStandard.get(c.documentId)!.state))} (engine, not LLM)`);
    console.log(`[12] citations are engine-attached from aggregated.chunks — the LLM schema has no chunk-ID field, so it cannot alter citation identity`);
    console.log(`[13] groundingState/engineConfidence above were computed before the LLM call and are not present anywhere in LLMAnswerSchema, so the LLM cannot have overridden them`);
  } catch (err) {
    console.log(`[9] LLM answer generation FAILED (${Date.now() - answerStart}ms): ${err instanceof Error ? err.message : String(err)}`);
    console.log("[10-13] not reached — LLM call did not return");
  }
}

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length === 0) {
    console.error('Usage: tsx scripts/smoke-test-pipeline.ts "<query>" ["<query2>" ...]');
    process.exit(1);
  }
  for (const q of queries) {
    await runQuery(q);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
