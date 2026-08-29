import type { AggregatedEvidence } from "./evidence-aggregation";
import type { CoverageResult } from "./coverage-analysis";
import type { Conflict } from "./conflict-detection";
import type { GroundingResult } from "./grounding";

/**
 * Engine-computed confidence — deliberately separate from, and
 * authoritative over, whatever confidence the LLM might self-report.
 * "engine confidence" (not "calibrated confidence"): the score reflects
 * the measurable signals below, but it has not been statistically
 * calibrated against labeled outcomes — see scripts/calibrate-confidence.ts,
 * which reports "calibration data insufficient" honestly rather than
 * pretending otherwise until enough golden-query data exists.
 */

export type ConfidenceBand = "high" | "medium" | "low" | "none";

export interface EngineConfidence {
  score: number;
  band: ConfidenceBand;
  groundingState: GroundingResult["state"];
  supportingSignals: string[];
  limitingSignals: string[];
}

// Band is a function of BOTH groundingState and score, not score alone —
// found necessary via a real bug: grounding.ts can cap a candidate's state
// at "insufficient_evidence" via a disqualifying rule (e.g. an explicit
// identifier mismatch) without necessarily reducing its raw blended score
// to match. If band were derived from score alone, a disqualified
// candidate could still be reported as "medium confidence" alongside
// "insufficient_evidence" — a directly contradictory, confusing response.
// Gating band by state first means the two can never disagree.
function bandOf(state: GroundingResult["state"], score: number): ConfidenceBand {
  if (state === "insufficient_evidence") return score >= 0.15 ? "low" : "none";
  if (state === "supported_inference") return score >= 0.55 ? "medium" : "low";
  return score >= 0.85 ? "high" : "medium"; // verified
}

export function computeEngineConfidence(
  candidate: AggregatedEvidence | null,
  coverage: CoverageResult | null,
  conflicts: Conflict[],
  grounding: GroundingResult | null,
): EngineConfidence {
  if (!candidate || !coverage || !grounding) {
    return {
      score: 0,
      band: "none",
      groundingState: "insufficient_evidence",
      supportingSignals: [],
      limitingSignals: ["No candidate standard was retrieved for this query."],
    };
  }

  const supportingSignals: string[] = [];
  const limitingSignals: string[] = [];

  if (grounding.signals.identifierStrength === 1.0) {
    supportingSignals.push("Query named an exact standard identifier that matches this candidate.");
  } else if (grounding.signals.identifierStrength === 0.0) {
    limitingSignals.push("Query named a standard identifier that does not match this candidate.");
  }

  if (candidate.multiSourceChunkCount > 0) {
    supportingSignals.push(
      `${candidate.multiSourceChunkCount} chunk(s) confirmed by both semantic and keyword retrieval, not just embedding similarity.`,
    );
  }

  if (candidate.clauseDiversity >= 2) {
    supportingSignals.push(`Evidence spans ${candidate.clauseDiversity} distinct clauses, not one clause repeated.`);
  } else if (candidate.chunkCount === 1) {
    limitingSignals.push("Only a single supporting chunk was found.");
  }

  if (coverage.overallCoverageRatio === 1) {
    supportingSignals.push("All applicable query constraints are addressed by the evidence.");
  } else if (coverage.overallCoverageRatio < 1) {
    const gaps = (Object.keys(coverage) as Array<keyof CoverageResult>).filter(
      (k) => k !== "overallCoverageRatio" && coverage[k] === "not_covered",
    );
    if (gaps.length > 0) {
      limitingSignals.push(`Evidence does not address: ${gaps.join(", ")}.`);
    }
  }

  const affecting = candidate.standardNumber
    ? conflicts.filter((c) => c.affectedStandards.includes(candidate.standardNumber!))
    : [];
  if (affecting.length === 0) {
    supportingSignals.push("No conflicting or superseded-standard signals detected.");
  } else {
    for (const c of affecting) limitingSignals.push(c.description);
  }

  return {
    score: grounding.score,
    band: bandOf(grounding.state, grounding.score),
    groundingState: grounding.state,
    supportingSignals,
    limitingSignals,
  };
}
