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
import { classifyKnowledgeBoundary } from "@/lib/knowledge-boundary";
import { assessApplicability } from "@/lib/applicability";
import { buildReferenceEntry } from "@/lib/reference-registry";
import { getNeighbors, type GraphNeighbor } from "@/lib/graph/graph-retrieval";
import { getDb } from "@/db";
import { queryLogs } from "@/db/schema";

/**
 * The full query pipeline (normalize -> intent -> retrieval -> grounding
 * -> confidence -> LLM answer -> knowledge boundary -> applicability),
 * extracted from src/app/api/v1/query/route.ts (2026-09-03, P0 audit)
 * purely so /api/v1/chat's explicit "wider search" path can call the
 * exact same logic instead of duplicating it — no pipeline behavior
 * changed in this extraction, byte-for-byte the same steps in the same
 * order as before. route.ts is now a thin HTTP wrapper around this.
 */

const MAX_CANDIDATES = 4;
const RETRIEVAL_LIMIT = 12;

export async function runQueryPipeline(query: string, opts: { debug?: boolean } = {}) {
  const start = Date.now();
  const debug = opts.debug ?? false;

  const normalized = normalizeQuery(query);
  const intent = await extractQueryIntent(normalized.normalizedQuery);
  if (intent.isRelevant === false) {
    return {
      isRelevant: false,
      answer:
        intent.relevanceMessage ||
        "This search does not appear to be relevant to Indian Standards (BIS), product compliance, or certification schemes. BIS Standards Navigator is dedicated to helping discover applicable Indian Standards, product testing requirements, and ISI/CRS certification schemes. Please search for a physical product (e.g., 'Steel water bottle', 'Cement', 'LED bulb'), material, or standard code (e.g., 'IS 14543').",
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
      clarificationNeeded: undefined,
      recommendations: [],
      certification: { available: false, notes: null },
      testing: { available: false, notes: null },
      nextSteps: [
        "Enter a specific manufactured product (e.g., 'Helmets', 'Pressure cooker', 'Electric iron').",
        "Search directly by Indian Standard number (e.g., 'IS 5522', 'IS 14543').",
        "Browse standard classifications using the top navigation menu.",
      ],
      confidence: "none" as const,
      engineConfidence: {
        score: 0,
        band: "none" as const,
        supportingSignals: [],
        limitingSignals: ["Query is out of scope for Indian Standards compliance."],
        groundingState: "insufficient_evidence" as const,
      },
      conflicts: [],
      limitations: ["This query is not related to products, materials, or Indian Standards."],
    };
  }

  let agentRun: AgentRunResult | null = null;
  try {
    agentRun = await runAgent(normalized.normalizedQuery);
  } catch (err) {
    console.error("[query-pipeline] agent orchestrator failed — continuing without toolEvidence", err);
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

  let knowledgeBoundary = classifyKnowledgeBoundary(
    topCandidate,
    topCandidate ? coverageByStandard.get(topCandidate.documentId)! : null,
    conflicts,
    topCandidate ? groundingByStandard.get(topCandidate.documentId)! : null,
  );

  const referenceStandardNumber = agentRun?.resolvedStandard ?? topCandidate?.standardNumber ?? null;
  let referenceEntry: Awaited<ReturnType<typeof buildReferenceEntry>> = null;
  let graphNeighbors: GraphNeighbor[] = [];
  if (referenceStandardNumber) {
    try {
      referenceEntry = await buildReferenceEntry(referenceStandardNumber);
      if (referenceEntry) {
        graphNeighbors = await getNeighbors("standard", referenceEntry.standardId);
      }
    } catch (err) {
      console.error("[query-pipeline] reference registry / graph lookup failed — continuing without it", err);
    }
  }

  if (
    referenceEntry &&
    !referenceEntry.indexedByNavigator &&
    referenceStandardNumber !== topCandidate?.standardNumber
  ) {
    knowledgeBoundary = {
      state: "NOT_IN_DATABASE",
      answerable: false,
      knowledgeGap: true,
      reason: `${referenceStandardNumber} was identified, but its authoritative document is not currently indexed in the Navigator's knowledge base. Any other evidence shown above belongs to a different standard and does not answer this question.`,
    };
  }

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

  const validStandardNumbers = new Set(aggregated.map((c) => c.standardNumber));
  const { accepted } = validateRecommendationExplanations(llmAnswer.recommendationExplanations, validStandardNumbers);
  const reasonByStandard = new Map<string | null, string>(accepted.map((exp) => [exp.standardNumber, exp.reason]));

  const recommendations = aggregated.map((c) => {
    const grounding = groundingByStandard.get(c.documentId)!;
    const coverage = coverageByStandard.get(c.documentId)!;
    const applicability = assessApplicability({
      query,
      intentMaterial: intent.material,
      candidateTitle: c.title,
      coverage,
      groundingState: grounding.state,
    });
    return {
      standardNumber: c.standardNumber,
      title: c.title,
      relevanceScore: grounding.score,
      groundingState: grounding.state,
      reason: reasonByStandard.get(c.standardNumber) ?? "This standard was retrieved as evidence for the query; no further explanation was provided.",
      coverage,
      applicability,
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

  const limitations = [...new Set([...engineConfidence.limitingSignals, ...llmAnswer.limitations])];
  if (intent.testingRequested && /laborator/i.test(query)) {
    limitations.push("No BIS-recognized laboratory data is indexed in this system yet — check bis.gov.in's official laboratory list directly.");
  }

  const certSchemeStep = agentRun?.steps.find(
    (s) => s.tool === "getCertificationScheme" && s.result.status === "ok",
  );
  const certSchemeData =
    certSchemeStep?.result.status === "ok"
      ? (certSchemeStep.result.data as {
          scheme: string;
          certificationRoute: string | null;
          testingParameters: string[];
        })
      : null;
  const deterministicCertificationNotes = certSchemeData
    ? `Certification scheme: ${certSchemeData.scheme}.${certSchemeData.certificationRoute ? ` Route: ${certSchemeData.certificationRoute}.` : ""}`
    : null;
  const deterministicTestingNotes =
    certSchemeData && certSchemeData.testingParameters.length > 0
      ? `Key testing parameters (from the applicable certification scheme): ${certSchemeData.testingParameters.join(", ")}.`
      : null;

  const response = {
    isRelevant: true,
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
      available: llmAnswer.certificationNotes !== null || deterministicCertificationNotes !== null,
      notes: llmAnswer.certificationNotes ?? deterministicCertificationNotes,
    },
    testing: {
      available: llmAnswer.testingNotes !== null || deterministicTestingNotes !== null,
      notes: llmAnswer.testingNotes ?? deterministicTestingNotes,
    },
    nextSteps: llmAnswer.nextSteps,
    confidence: engineConfidence.band,
    engineConfidence,
    conflicts,
    limitations,
    knowledgeBoundary,
    referenceEntry,
    graphNeighbors,
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

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      await db.insert(queryLogs).values({
        query,
        intent: intent.intent,
        retrievedChunkIds: chunks.map((c) => c.chunkId),
        confidence: engineConfidence.band,
        latencyMs: Date.now() - start,
      });
    } catch (logErr) {
      console.warn("[query-pipeline] queryLogs insert failed:", logErr);
    }
  }

  return response;
}
