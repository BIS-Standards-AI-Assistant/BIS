import type { AggregatedEvidence } from "./evidence-aggregation";
import type { CoverageResult } from "./coverage-analysis";
import type { Conflict } from "./conflict-detection";

/**
 * Deterministic grounding decision — replaces the previous design where
 * the LLM alone decided groundingState. The engine now derives it from
 * measurable retrieval/coverage/conflict signals; the LLM only writes the
 * explanation text (see src/lib/answer.ts) and cannot override this value.
 *
 * IMPORTANT: the weights and thresholds below are a reasoned starting
 * point, not a calibrated model. They're justified by the unit tests in
 * scripts/test-grounding.ts (which check the scoring behaves sensibly at
 * the boundaries and that no single signal can dominate), not by a
 * statistical fit — there isn't enough golden-query data yet to calibrate
 * against (see scripts/calibrate-confidence.ts). Treat GROUNDING_WEIGHTS
 * as a tunable, inspectable constant, not a fixed law.
 */

export type GroundingState = "verified" | "supported_inference" | "insufficient_evidence";

export interface GroundingSignals {
  /** This candidate's evidence strength relative to the strongest candidate in the set (1.0 = the leader) */
  retrievalStrength: number;
  /** 1.0 exact identifier match, 0.6 no identifier was asked for (neutral), 0.0 an identifier was asked for and this candidate doesn't match it */
  identifierStrength: number;
  /** CoverageResult.overallCoverageRatio */
  coverageStrength: number;
  /** 1.0 for BIS-sourced documents, lower for anything else */
  sourceAuthority: number;
  /** Reduced by evidence_conflict findings that affect this standard */
  consistency: number;
  /** Reduced by superseded_standard / version_conflict findings that affect this standard */
  versionValidity: number;
}

export interface GroundingResult {
  state: GroundingState;
  score: number;
  signals: GroundingSignals;
}

export const GROUNDING_WEIGHTS = {
  retrievalStrength: 0.3,
  identifierStrength: 0.2,
  coverageStrength: 0.2,
  sourceAuthority: 0.1,
  consistency: 0.1,
  versionValidity: 0.1,
} as const;

const VERIFIED_THRESHOLD = 0.7;
const SUPPORTED_INFERENCE_THRESHOLD = 0.4;

// A rank-1 hit confirmed by both semantic and keyword retrieval (RRF_K=60
// in retrieval.ts, so 1/60 per source) aggregated with the evidence layer's
// 2x diminishing-returns bound (src/lib/evidence-aggregation.ts) gives
// roughly 2 * 2/60 ≈ 0.067 for genuinely strong, well-corroborated
// evidence. Used as an absolute reference point so a lone weak candidate
// (score 0.001) can't score retrievalStrength=1.0 just because it has no
// peers to be relatively compared against — see
// scripts/test-grounding-pipeline.ts for the case this fixes.
const STRONG_ABSOLUTE_SCORE = 0.067;

function sourceAuthorityOf(sourceOrg: string): number {
  return sourceOrg.trim().toUpperCase() === "BIS" ? 1.0 : 0.6;
}

export function computeGrounding(
  candidate: AggregatedEvidence,
  allCandidates: AggregatedEvidence[],
  coverage: CoverageResult,
  conflicts: Conflict[],
): GroundingResult {
  const leadScore = Math.max(...allCandidates.map((c) => c.weightedScore), candidate.weightedScore, 1e-9);
  const relativeStrength = candidate.weightedScore / leadScore;
  const absoluteStrength = Math.min(candidate.weightedScore / STRONG_ABSOLUTE_SCORE, 1);
  // Being the strongest candidate in a weak field shouldn't read as strong
  // evidence — both must hold.
  const retrievalStrength = Math.min(relativeStrength, absoluteStrength);

  const identifierStrength =
    coverage.identifier === "covered" ? 1.0 : coverage.identifier === "unknown" ? 0.6 : 0.0;

  const affecting = candidate.standardNumber
    ? conflicts.filter((c) => c.affectedStandards.includes(candidate.standardNumber!))
    : [];
  const hasEvidenceConflict = affecting.some((c) => c.type === "evidence_conflict");
  const hasVersionIssue = affecting.some((c) => c.type === "version_conflict" || c.type === "superseded_standard");

  const signals: GroundingSignals = {
    retrievalStrength,
    identifierStrength,
    coverageStrength: coverage.overallCoverageRatio,
    sourceAuthority: sourceAuthorityOf(candidate.sourceOrg),
    consistency: hasEvidenceConflict ? 0.5 : 1.0,
    versionValidity: hasVersionIssue ? 0.2 : 1.0,
  };

  const score =
    signals.retrievalStrength * GROUNDING_WEIGHTS.retrievalStrength +
    signals.identifierStrength * GROUNDING_WEIGHTS.identifierStrength +
    signals.coverageStrength * GROUNDING_WEIGHTS.coverageStrength +
    signals.sourceAuthority * GROUNDING_WEIGHTS.sourceAuthority +
    signals.consistency * GROUNDING_WEIGHTS.consistency +
    signals.versionValidity * GROUNDING_WEIGHTS.versionValidity;

  // Deterministic disqualifying rule, found via a real end-to-end smoke
  // test (not a synthetic case): after reranking, RetrievedChunk.score is
  // a position-based value (1/(1+rank)), not a relevance magnitude — a
  // single dominant candidate in a small corpus can score near the
  // reranker's maximum even when it has nothing to do with the query,
  // simply for having no real competition. That let a fabricated-identifier
  // query ("IS 99999:2099") clear the supported_inference threshold,
  // because retrievalStrength + the "nothing detected as wrong" floor
  // (sourceAuthority + consistency + versionValidity, none of which
  // require actual relevance) summed past 0.4 on their own.
  //
  // When the query names a specific standard identifier and this candidate
  // is confirmed NOT to be it, that is a stronger disqualifying fact than
  // any blended score should be able to override — the user asked about a
  // specific standard, and this isn't it. `score`/`signals` stay as
  // computed above for full inspectability; only the final state is capped.
  const explicitIdentifierMismatch = coverage.identifier === "not_covered";

  const state: GroundingState = explicitIdentifierMismatch
    ? "insufficient_evidence"
    : score >= VERIFIED_THRESHOLD
      ? "verified"
      : score >= SUPPORTED_INFERENCE_THRESHOLD
        ? "supported_inference"
        : "insufficient_evidence";

  return { state, score, signals };
}
