import type { AggregatedEvidence } from "./evidence-aggregation";
import type { CoverageResult } from "./coverage-analysis";
import type { Conflict } from "./conflict-detection";
import type { GroundingResult } from "./grounding";

/**
 * The knowledge boundary (prompts/final.md §3) — a hard, deterministic
 * classification of what the system actually knows for this query,
 * computed as a thin adapter over signals the existing pipeline already
 * produces (grounding.ts, coverage-analysis.ts, conflict-detection.ts).
 * It does NOT recompute anything — it only interprets outputs that were
 * already deterministic before this module existed, per the project's
 * standing rule against rewriting working systems.
 *
 * This is the enforcement point for "if the authoritative document is
 * not indexed, say so — never let the LLM fill the gap with semantic
 * similarity." A KnowledgeBoundaryState of NOT_IN_DATABASE or
 * UNVERIFIED_SOURCE is a hard signal to the answer layer, not a
 * suggestion the LLM can talk its way around.
 */

export type KnowledgeBoundaryState =
  | "VERIFIED"
  | "PARTIALLY_SUPPORTED"
  | "NOT_IN_DATABASE"
  | "CONFLICTING_EVIDENCE"
  | "UNVERIFIED_SOURCE";

export interface KnowledgeBoundaryResult {
  state: KnowledgeBoundaryState;
  answerable: boolean;
  /** True when the requested technical detail genuinely isn't in the indexed corpus — the system must not guess, infer, or ask the LLM to fill this in. */
  knowledgeGap: boolean;
  reason: string;
}

/**
 * Classifies answerability for the TOP candidate only — the same
 * candidate confidence.ts already treats as authoritative for this
 * query. A query with no candidate at all is the clearest possible
 * NOT_IN_DATABASE case.
 */
export function classifyKnowledgeBoundary(
  candidate: AggregatedEvidence | null,
  coverage: CoverageResult | null,
  conflicts: Conflict[],
  grounding: GroundingResult | null,
): KnowledgeBoundaryResult {
  if (!candidate || !coverage || !grounding) {
    return {
      state: "NOT_IN_DATABASE",
      answerable: false,
      knowledgeGap: true,
      reason: "No indexed evidence was retrieved for this query — the Navigator has no verified information to draw from.",
    };
  }

  const affectingConflicts = candidate.standardNumber
    ? conflicts.filter((c) => c.affectedStandards.includes(candidate.standardNumber!))
    : [];
  if (affectingConflicts.some((c) => c.type === "evidence_conflict" || c.type === "version_conflict")) {
    return {
      state: "CONFLICTING_EVIDENCE",
      answerable: false,
      knowledgeGap: false,
      reason: `Multiple retrieved sources disagree: ${affectingConflicts.map((c) => c.description).join(" ")}`,
    };
  }

  // A candidate whose source isn't BIS itself (sourceAuthority < 1.0 in
  // grounding.ts's own scale) is evidence the system found, but not
  // evidence it can treat as authoritative without flagging that fact.
  if (grounding.signals.sourceAuthority < 1.0 && grounding.state !== "verified") {
    return {
      state: "UNVERIFIED_SOURCE",
      answerable: true,
      knowledgeGap: false,
      reason: "Relevant information was found, but it did not come from an official BIS source and has not been independently verified.",
    };
  }

  if (grounding.state === "insufficient_evidence") {
    return {
      state: "NOT_IN_DATABASE",
      answerable: false,
      knowledgeGap: true,
      reason: "A standard was identified, but the authoritative document or the specific technical detail requested is not currently indexed in the Navigator's knowledge base.",
    };
  }

  if (coverage.overallCoverageRatio < 1) {
    return {
      state: "PARTIALLY_SUPPORTED",
      answerable: true,
      knowledgeGap: true,
      reason: "Some metadata/evidence exists for this standard, but not every detail the query asked about is covered by the indexed evidence.",
    };
  }

  return {
    state: "VERIFIED",
    answerable: true,
    knowledgeGap: false,
    reason: "Evidence from an indexed, authoritative source directly supports this candidate.",
  };
}
