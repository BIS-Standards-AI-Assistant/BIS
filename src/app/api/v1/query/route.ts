import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeQuery } from "@/lib/query-normalization";
import { extractQueryIntent } from "@/lib/intent";
import { runAgent, type AgentRunResult } from "@/lib/agent/orchestrator";
import { retrieveChunks } from "@/lib/retrieval";
import { aggregateEvidence, type AggregatedEvidence } from "@/lib/evidence-aggregation";
import { analyzeCoverage } from "@/lib/coverage-analysis";
import { detectConflicts } from "@/lib/conflict-detection";
import { computeGrounding } from "@/lib/grounding";
import { computeEngineConfidence } from "@/lib/confidence";
import { generateAnswer, validateRecommendationExplanations, type EvidencePackage, type EvidencePackageCandidate } from "@/lib/answer";
import { getDb } from "@/db";
import { queryLogs } from "@/db/schema";

const QueryRequestSchema = z.object({
  query: z.string().min(1).max(2000),
});

// How many top-ranked candidate standards get full coverage/grounding
// analysis and are shown to the LLM. Bounded so the prompt stays small on
// this 4-document corpus while leaving room to grow with the corpus later.
const MAX_CANDIDATES = 4;
const RETRIEVAL_LIMIT = 12;

/**
 * Pipeline: normalize -> intent (LLM #1) -> hybrid retrieval + reranking ->
 * evidence aggregation -> coverage analysis -> conflict detection ->
 * deterministic grounding -> deterministic confidence -> LLM answer (LLM
 * #2, prose only) -> citation/standard validation -> response.
 *
 * Exactly 2 LLM calls per query, same as before this milestone — nothing
 * here adds a call. The engine (everything between retrieval and the LLM
 * answer call) is pure deterministic code: no API key, no network call,
 * fully unit-tested (scripts/test-*.ts).
 *
 * ADDITIVE, not a replacement (2026-09-03): the deterministic query
 * planner (src/lib/query-planner.ts) and bounded tool-calling agent
 * orchestrator (src/lib/agent/orchestrator.ts) — built and tested
 * earlier this session but never called from a live route — now run
 * alongside the pipeline above and contribute a separate `toolEvidence`
 * field. This is deliberately NOT wired into the grounding/confidence/
 * recommendations path: the orchestrator's tool results (e.g.
 * checkMandatoryStatus, getCertificationScheme) are surfaced as their
 * own structured, provenance-carrying block, never reinterpreted by the
 * LLM and never allowed to change engineConfidence or groundingState —
 * changing either of those remains the existing pipeline's job alone,
 * per this project's core rule that the LLM (and now the agent) must
 * not be the source of truth. If the orchestrator fails for any reason,
 * the request still succeeds with `toolEvidence: null` — this is a
 * strictly additive capability, never a new failure mode for the
 * existing pipeline.
 */
export async function POST(req: NextRequest) {
  const start = Date.now();
  const parsed = QueryRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { query } = parsed.data;
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  try {
    const normalized = normalizeQuery(query);
    const intent = await extractQueryIntent(normalized.normalizedQuery);

    // See the module doc above: additive only, never allowed to affect
    // grounding/confidence/recommendations below. A failure here must
    // never fail the whole request.
    let agentRun: AgentRunResult | null = null;
    try {
      agentRun = await runAgent(normalized.normalizedQuery);
    } catch (err) {
      console.error("[api/v1/query] agent orchestrator failed — continuing without toolEvidence", err);
    }

    const chunks = await retrieveChunks(intent.searchQuery || normalized.normalizedQuery, { limit: RETRIEVAL_LIMIT });
    const aggregated = aggregateEvidence(chunks).slice(0, MAX_CANDIDATES);

    const coverageByStandard = new Map(
      aggregated.map((c) => [c.documentId, analyzeCoverage(intent, c, normalized.identifiers)]),
    );
    const conflicts = detectConflicts(aggregated);
    const groundingByStandard = new Map(
      aggregated.map((c) => [c.documentId, computeGrounding(c, aggregated, coverageByStandard.get(c.documentId)!, conflicts)]),
    );

    const topCandidate: AggregatedEvidence | null = aggregated[0] ?? null;
    const engineConfidence = computeEngineConfidence(
      topCandidate,
      topCandidate ? coverageByStandard.get(topCandidate.documentId)! : null,
      conflicts,
      topCandidate ? groundingByStandard.get(topCandidate.documentId)! : null,
    );

    const evidencePackageCandidates: EvidencePackageCandidate[] = aggregated.map((c) => ({
      standardNumber: c.standardNumber,
      title: c.title,
      groundingState: groundingByStandard.get(c.documentId)!.state,
      coverage: coverageByStandard.get(c.documentId)!,
      chunks: c.chunks.map((ch) => ({ chunkId: ch.chunkId, section: ch.section, clause: ch.clause, text: ch.text })),
    }));

    const evidencePackage: EvidencePackage = {
      query,
      intent,
      candidates: evidencePackageCandidates,
      conflicts,
      engineConfidence,
    };

    const llmAnswer = await generateAnswer(evidencePackage);

    // The LLM may only explain candidates the engine already selected —
    // any standardNumber it mentions that isn't in the engine's candidate
    // list is dropped rather than surfaced, regardless of how the LLM
    // phrased it.
    const validStandardNumbers = new Set(aggregated.map((c) => c.standardNumber));
    const { accepted } = validateRecommendationExplanations(llmAnswer.recommendationExplanations, validStandardNumbers);
    const reasonByStandard = new Map<string | null, string>(accepted.map((exp) => [exp.standardNumber, exp.reason]));

    const recommendations = aggregated.map((c) => {
      const grounding = groundingByStandard.get(c.documentId)!;
      const coverage = coverageByStandard.get(c.documentId)!;
      return {
        standardNumber: c.standardNumber,
        title: c.title,
        relevanceScore: grounding.score,
        groundingState: grounding.state,
        reason: reasonByStandard.get(c.standardNumber) ?? "This standard was retrieved as evidence for the query; no further explanation was provided.",
        coverage,
        evidence: c.chunks.map((ch) => ({
          chunkId: ch.chunkId,
          documentId: ch.documentId,
          document: ch.title,
          standardNumber: ch.standardNumber,
          section: ch.section,
          clause: ch.clause,
          page: ch.page,
          text: ch.text,
          sourceUrl: ch.sourceUrl,
        })),
      };
    });

    // Engine-derived limiting signals are authoritative facts about missing
    // coverage/conflicts — they're always included regardless of whether
    // the LLM's free-text limitations happen to mention the same thing.
    const limitations = [...new Set([...engineConfidence.limitingSignals, ...llmAnswer.limitations])];

    const response = {
      answer: llmAnswer.answer,
      intent: intent.intent,
      interpretation: {
        product: intent.product,
        material: intent.material,
        useCase: intent.useCase,
        targetUser: intent.targetUser,
        sector: intent.sector,
        certificationRequested: intent.certificationRequested,
        testingRequested: intent.testingRequested,
      },
      clarificationNeeded: intent.missingInformation.length > 0 ? intent.missingInformation : undefined,
      recommendations,
      certification: {
        available: llmAnswer.certificationNotes !== null,
        notes: llmAnswer.certificationNotes,
      },
      testing: {
        available: llmAnswer.testingNotes !== null,
        notes: llmAnswer.testingNotes,
      },
      nextSteps: llmAnswer.nextSteps,
      confidence: engineConfidence.band,
      engineConfidence,
      conflicts,
      limitations,
      // Supplementary, tool-derived evidence (rag.md Phase 3) — additive
      // only, see the module doc above. `null` whenever the orchestrator
      // found no applicable tools or failed; never a placeholder for
      // missing data.
      toolEvidence: agentRun && agentRun.steps.some((s) => s.result.status === "ok")
        ? {
            planType: agentRun.plan.type,
            complexity: agentRun.plan.complexity,
            resolvedStandard: agentRun.resolvedStandard,
            stopReason: agentRun.stopReason,
            skippedTasks: agentRun.skippedTasks,
            results: agentRun.steps
              .filter((s) => s.result.status === "ok")
              .map((s) => ({ tool: s.tool, data: s.result.data, provenance: s.result.provenance ?? [] })),
          }
        : null,
      ...(debug && {
        _debug: {
          normalizedQuery: normalized,
          retrievedChunkCount: chunks.length,
          aggregatedEvidence: aggregated.map((c) => ({
            documentId: c.documentId,
            standardNumber: c.standardNumber,
            chunkCount: c.chunkCount,
            bestChunkScore: c.bestChunkScore,
            weightedScore: c.weightedScore,
            clauseDiversity: c.clauseDiversity,
            multiSourceChunkCount: c.multiSourceChunkCount,
          })),
          groundingByStandard: Object.fromEntries(
            [...groundingByStandard.entries()].map(([docId, g]) => [docId, g]),
          ),
          agentRun,
        },
      }),
    };

    const db = getDb();
    await db.insert(queryLogs).values({
      query,
      intent: intent.intent,
      retrievedChunkIds: chunks.map((c) => c.chunkId),
      confidence: engineConfidence.band,
      latencyMs: Date.now() - start,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/v1/query]", err);
    return NextResponse.json(
      { error: "Query processing failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
