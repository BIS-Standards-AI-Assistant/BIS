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
import { assessApplicability, deriveRecommendationStatus } from "@/lib/applicability";
import { buildReferenceEntry } from "@/lib/reference-registry";
import { getNeighbors, type GraphNeighbor } from "@/lib/graph/graph-retrieval";
import { getProductRefinements, isForbiddenGeneric } from "@/lib/product-refinements";
import { detectLanguage, resolveQueryLanguage, LANGUAGE_NAMES, type UiLanguage } from "@/lib/language";
import { translateQueryToEnglish } from "@/lib/translate";
import { refusalCopy, REFUSAL_COPY_LANGUAGES, type RefusalReason } from "@/lib/refusal";
import { evaluateRelevanceFloor } from "@/lib/relevance-floor";
import { buildComplianceMap } from "@/lib/compliance-map";
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

export async function runQueryPipeline(
  query: string,
  opts: { debug?: boolean; language?: UiLanguage } = {},
) {
  const start = Date.now();
  const debug = opts.debug ?? false;

  // PRD FR2/§7: resolve the query language (explicit UI choice vs detected
  // script), then translate a non-English query to English for retrieval
  // against the English-only index. Translation is best-effort — with no
  // provider it falls back to using the original text.
  const detection = detectLanguage(query);
  const { queryLanguage, answerLanguage } = resolveQueryLanguage(opts.language, detection);
  // Only ask the LLM to "translate" text that was actually detected in a
  // non-Latin script. Real bug found live-testing Bengali: a script-neutral
  // query ("stainless steel utensils standard") with the language toggle
  // set to bn/hi/etc. resolves queryLanguage to that toggle value (by
  // design, for bare identifiers like "IS 14543"), but the text itself is
  // already English — telling the LLM "this is Bengali" on real English
  // prose produced a garbled "translation" that retrieved an unrelated
  // standard. The toggle still controls answerLanguage; only the
  // translation-for-retrieval step needs the actual detected script.
  const translationSourceLanguage = detection.method === "script-range" ? queryLanguage : "en";
  const translation = await translateQueryToEnglish(query, translationSourceLanguage);
  const retrievalQuery = translation.queryForRetrieval;
  const languageMeta = {
    language: queryLanguage,
    answerLanguage,
    translated: translation.translated,
    translationMethod: translation.method,
  };

  const normalized = normalizeQuery(retrievalQuery);
  const intent = await extractQueryIntent(normalized.normalizedQuery);
  if (intent.isRelevant === false) {
    const refusal = refusalCopy("out_of_scope", answerLanguage);
    if (process.env.DATABASE_URL) {
      try {
        await getDb().insert(queryLogs).values({
          query,
          intent: intent.intent,
          retrievedChunkIds: [],
          confidence: "none",
          latencyMs: Date.now() - start,
          outcome: "refused_out_of_scope",
          language: queryLanguage,
          translated: translation.translated,
        });
      } catch (logErr) {
        console.warn("[query-pipeline] queryLogs insert (out-of-scope) failed:", logErr);
      }
    }
    return {
      isRelevant: false,
      answer: refusal.answer,
      query,
      ...languageMeta,
      latencyMs: Date.now() - start,
      outcome: "refused_out_of_scope" as const,
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
      limitations: REFUSAL_COPY_LANGUAGES.has(answerLanguage)
        ? [refusal.limitation]
        : [
            `This refusal message is shown in English because a reviewed ${LANGUAGE_NAMES[answerLanguage]} translation of the fixed refusal text does not exist yet.`,
            refusal.limitation,
          ],
    };
  }

  let agentRun: AgentRunResult | null = null;
  try {
    agentRun = await runAgent(normalized.normalizedQuery);
  } catch (err) {
    console.error("[query-pipeline] agent orchestrator failed — continuing without toolEvidence", err);
  }

  const chunks = await retrieveChunks(intent.searchQuery || normalized.normalizedQuery, { limit: RETRIEVAL_LIMIT });

  // PRD §8.1: the post-retrieval relevance floor. Hybrid retrieval always
  // returns *some* nearest neighbours — it has no notion of "nothing here
  // is relevant" — so without this gate an off-corpus query still produces
  // a ranked list, and every downstream stage then reasons about candidates
  // that should never have been considered. Applied to the top-1 cosine
  // similarity, calibrated against real in/out-of-corpus measurements.
  // See src/lib/relevance-floor.ts.
  const relevanceFloor = evaluateRelevanceFloor(chunks);

  const aggregatedAll = aggregateEvidence(chunks);
  const topCandidateScore = aggregatedAll[0]?.weightedScore ?? 0;
  const aggregated = aggregatedAll
    .filter((c, idx) => idx === 0 || c.weightedScore >= topCandidateScore * 0.35)
    .slice(0, MAX_CANDIDATES);

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

  // APPLICABILITY GATE (2026-09-04 fix for the steel-query/PVC-standard
  // bug): computed once, here, BEFORE the LLM ever sees a candidate —
  // previously this ran only after generateAnswer(), so the LLM's
  // evidence package carried no applicability signal at all and a
  // MATERIAL_MISMATCH candidate could still be worded as a confident
  // recommendation. deriveRecommendationStatus is the single
  // authoritative gate (src/lib/applicability.ts) every consumer of
  // this pipeline (this route, /api/v1/chat, /api/v1/analyze-product)
  // now shares — a hard mismatch is a categorical exclusion from
  // `primaryRecommendation`, never a lower score.
  const applicabilityByStandard = new Map(
    aggregated.map((c) => {
      const grounding = groundingByStandard.get(c.documentId)!;
      const coverage = coverageByStandard.get(c.documentId)!;
      const applicability = assessApplicability({
        query,
        intentMaterial: intent.material,
        candidateTitle: c.title,
        coverage,
        groundingState: grounding.state,
      });
      const hasConflict = c.standardNumber
        ? conflicts.some((conflict) => conflict.affectedStandards.includes(c.standardNumber!))
        : false;
      const gate = deriveRecommendationStatus(applicability, grounding.state, hasConflict);
      return [c.documentId, { applicability, gate }] as const;
    }),
  );

  const evidencePackageCandidates: EvidencePackageCandidate[] = aggregated.map((c) => ({
    standardNumber: c.standardNumber,
    title: c.title,
    groundingState: groundingByStandard.get(c.documentId)!.state,
    coverage: coverageByStandard.get(c.documentId)!,
    chunks: c.chunks.map((ch) => ({ chunkId: ch.chunkId, section: ch.section, clause: ch.clause, text: ch.text })),
    // LLM Safety: the LLM sees the same gate result the server enforces
    // below, so its "reason" text is written knowing this candidate is
    // blocked, not by accident agreeing with a mismatch it never saw.
    primaryRecommendation: applicabilityByStandard.get(c.documentId)!.gate.primary,
    applicabilityReason: applicabilityByStandard.get(c.documentId)!.applicability.reason,
  }));

  const evidencePackage: EvidencePackage = {
    query,
    intent,
    candidates: evidencePackageCandidates,
    conflicts,
    engineConfidence,
  };

  // See generateAnswer's `skipSynthesis` note: below the relevance floor
  // the fixed refusal replaces this text anyway, so there is nothing to
  // gain from a provider round trip here.
  const llmAnswer = await generateAnswer(evidencePackage, {
    answerLanguage,
    skipSynthesis: relevanceFloor.decision === "below_floor",
  });

  const validStandardNumbers = new Set(aggregated.map((c) => c.standardNumber));
  const { accepted } = validateRecommendationExplanations(llmAnswer.recommendationExplanations, validStandardNumbers);
  const reasonByStandard = new Map<string | null, string>(accepted.map((exp) => [exp.standardNumber, exp.reason]));

  const recommendationsUnordered = aggregated.map((c) => {
    const grounding = groundingByStandard.get(c.documentId)!;
    const coverage = coverageByStandard.get(c.documentId)!;
    const { applicability, gate } = applicabilityByStandard.get(c.documentId)!;
    return {
      standardNumber: c.standardNumber,
      title: c.title,
      relevanceScore: grounding.score,
      groundingState: grounding.state,
      // Deterministic override, not just a prompt instruction: a
      // non-primary candidate's "reason" is always the engine's own
      // applicability.reason, never the LLM's phrasing — this is the
      // enforcement point for "the LLM cannot override deterministic
      // applicability" regardless of whether it actually followed the
      // system prompt's instruction.
      reason: gate.primary
        ? (reasonByStandard.get(c.standardNumber) ?? "This standard was retrieved as evidence for the query; no further explanation was provided.")
        : applicability.reason,
      coverage,
      applicability,
      recommendationStatus: gate.status,
      primaryRecommendation: gate.primary,
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

  // Partition, not re-sort: primary recommendations first (in their
  // existing relevance order), then everything the gate excluded (also
  // in their existing relevance order) — "filter safety first, rank
  // second," never a blended score that could let a high relevance
  // number pull a blocked candidate back toward the top.
  let recommendations = [
    ...recommendationsUnordered.filter((r) => r.primaryRecommendation),
    ...recommendationsUnordered.filter((r) => !r.primaryRecommendation),
  ];

  const limitations = [...new Set([...engineConfidence.limitingSignals, ...llmAnswer.limitations])];

  // PRD §7 puts translation on the critical path for a non-English query:
  // the index is English-only, so an untranslated Hindi query is embedded
  // as Devanagari against English vectors and retrieves close to noise.
  // When no provider is available to translate (Tier-0 degradation — see
  // src/lib/translate.ts), retrieval still runs on the original text and
  // the relevance floor will usually turn the resulting noise into a
  // refusal. That is the right outcome, but the generic "not found in the
  // indexed corpus" wording would attribute it to the corpus when the
  // actual cause was an unavailable translation step. Say which it was.
  if (translation.method === "skipped-no-provider") {
    limitations.unshift(
      answerLanguage === "hi"
        ? "इस प्रश्न का अंग्रेज़ी में अनुवाद नहीं हो सका (अनुवाद सेवा उपलब्ध नहीं थी)। खोज केवल अंग्रेज़ी सामग्री पर चलती है, इसलिए परिणाम अधूरे हो सकते हैं — अंग्रेज़ी में प्रश्न पूछने पर बेहतर परिणाम मिलेंगे।"
        : "This query could not be translated into English because no translation provider was available. The index is English-only, so retrieval ran against the untranslated text and the results may be incomplete — asking in English will give a more reliable answer.",
    );
  }
  if (intent.testingRequested && /laborator/i.test(query)) {
    limitations.push("No BIS-recognized laboratory data is indexed in this system yet — check bis.gov.in's official laboratory list directly.");
  }

  // PRD FR4 / §8: below the grounding bar, replace the synthesised prose
  // with a FIXED refusal that names the corpus boundary — never a hedged
  // guess. The retrieved candidates still render below as related context;
  // the refusal copy says exactly that. §8c citation gate: if nothing
  // shown to the user carries a citation, that is also a failed answer.
  const topGroundingState = topCandidate ? groundingByStandard.get(topCandidate.documentId)!.state : null;
  const anyEvidenceShown = recommendations.some((r) => r.evidence.length > 0);
  let synthesisAnswer = llmAnswer.answer;
  let outcome:
    | "answered"
    | "refused_insufficient_evidence"
    | "refused_not_in_database" = "answered";

  // "not_in_database" only makes sense when the user actually named a
  // standard — otherwise a fuzzy agent resolution over an empty retrieval
  // set would wrongly tell the user "that standard was identified" when
  // they named none. Everything else that can't be grounded is
  // "insufficient_evidence".
  const queryHasExplicitIdentifier = normalized.identifiers.length > 0;
  const forcedRefusal: RefusalReason | null =
    knowledgeBoundary.state === "NOT_IN_DATABASE" && queryHasExplicitIdentifier
      ? "not_in_database"
      : relevanceFloor.decision === "below_floor" ||
          aggregated.length === 0 ||
          topGroundingState === "insufficient_evidence" ||
          !anyEvidenceShown
        ? "insufficient_evidence"
        : null;

  // Record the floor's own verdict as a limitation whenever it is what
  // caused the refusal, so the reason the user sees is the measured one
  // rather than a generic "not enough evidence".
  if (relevanceFloor.decision === "below_floor" && !limitations.includes(relevanceFloor.reason)) {
    limitations.unshift(relevanceFloor.reason);
  }

  if (forcedRefusal) {
    const r = refusalCopy(forcedRefusal, answerLanguage);
    synthesisAnswer = r.answer;
    outcome = forcedRefusal === "not_in_database" ? "refused_not_in_database" : "refused_insufficient_evidence";
    if (!limitations.includes(r.limitation)) limitations.unshift(r.limitation);
    // refusal.ts only has reviewed fixed copy in English and Hindi — say so
    // rather than silently showing English refusal text under a non-en/hi
    // answerLanguage (queries in the other six UI languages can still
    // reach a refusal via the relevance floor).
    if (!REFUSAL_COPY_LANGUAGES.has(answerLanguage)) {
      limitations.unshift(
        `This refusal message is shown in English because a reviewed ${LANGUAGE_NAMES[answerLanguage]} translation of the fixed refusal text does not exist yet.`,
      );
    }

    // A refusal must not leave candidates standing as primary
    // recommendations. Found by scripts/eval-refusal.ts on 2026-09-09:
    // the out-of-corpus query "turbine blade coatings for aircraft jet
    // engines" correctly returned the fixed "not found in the indexed
    // corpus" answer while STILL marking IS 15636:2012, IS 13428:2005 and
    // IS 14756:2017 as primaryRecommendation — so the prose said "no
    // grounded answer" directly above three confident recommendation
    // cards. That is precisely the "refuse, do not fabricate" failure the
    // PRD guards against, produced by the two decisions being made in
    // different places: the applicability gate runs per candidate and
    // never sees the pipeline-level refusal.
    //
    // Demoting to INSUFFICIENT_EVIDENCE (rather than dropping the
    // candidates) matches what the refusal copy already tells the user —
    // that anything listed below was retrieved as loosely related context
    // and is not confirmed as applicable — and keeps the evidence
    // inspectable instead of hiding it.
    recommendations = recommendations.map((rec) =>
      rec.primaryRecommendation
        ? { ...rec, primaryRecommendation: false, recommendationStatus: "INSUFFICIENT_EVIDENCE" as const }
        : rec,
    );
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
    answer: synthesisAnswer,
    query,
    ...languageMeta,
    latencyMs: Date.now() - start,
    outcome,
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
    clarificationNeeded: (() => {
      const rawMissing = intent.missingInformation ?? [];
      const validSpecific = rawMissing.filter((item) => !isForbiddenGeneric(item));
      const candidateHints = recommendations.map((r) => ({
        standardNumber: r.standardNumber,
        title: r.title,
      }));
      const options =
        validSpecific.length >= 2
          ? validSpecific
          : getProductRefinements(normalized.normalizedQuery, intent.product, candidateHints);
      return options.length > 0 ? options : undefined;
    })(),
    recommendations,
    certification: {
      available: llmAnswer.certificationNotes !== null || deterministicCertificationNotes !== null,
      notes: llmAnswer.certificationNotes ?? deterministicCertificationNotes,
    },
    testing: {
      available: llmAnswer.testingNotes !== null || deterministicTestingNotes !== null,
      notes: llmAnswer.testingNotes ?? deterministicTestingNotes,
    },
    complianceMap: await buildComplianceMap(recommendations),
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
        relevanceFloor,
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
        outcome,
        language: queryLanguage,
        translated: translation.translated,
      });
    } catch (logErr) {
      console.warn("[query-pipeline] queryLogs insert failed:", logErr);
    }
  }

  return response;
}
