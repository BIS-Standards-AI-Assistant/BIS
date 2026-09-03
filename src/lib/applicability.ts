import type { CoverageResult } from "./coverage-analysis";
import type { GroundingState } from "./grounding";

/**
 * Deterministic applicability assessment — kept separate from retrieval
 * relevance and grounding state on purpose (P0 audit, 2026-09-03):
 * "relevant" (the retrieval engine found supporting text) and "applicable"
 * (this standard actually governs the queried product) are different
 * claims, and conflating them is exactly how a plastics-bottle standard
 * ends up presented as the best match for "steel bottle". This module
 * never changes relevanceScore/groundingState/ranking — it only adds a
 * second, independent signal the UI can show alongside them.
 *
 * Every state here must be justified by a concrete signal computed below;
 * there is no "just trust the LLM" path, and no state is upgraded because
 * a candidate ranked first.
 */

export type ApplicabilityState =
  | "DIRECTLY_APPLICABLE"
  | "POTENTIALLY_APPLICABLE"
  | "RELATED"
  | "MATERIAL_MISMATCH"
  | "SCOPE_UNCLEAR"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE";

export interface ApplicabilityResult {
  state: ApplicabilityState;
  reason: string;
  /** true when a query material and a candidate material were both detected and they conflict — the one deterministic "hard" signal this module currently has. */
  materialConflict: boolean;
}

// A small, deliberately explicit dictionary of mutually-exclusive material
// families. Deterministic and reviewable — not ML, not an LLM guess. Only
// used to detect an outright *conflict* (query says one family, candidate
// title says a different one); absence of a match is never treated as a
// mismatch, only as "no material signal available."
const MATERIAL_FAMILIES: Record<string, string[]> = {
  steel: ["steel", "stainless steel", "mild steel", "metal", "metallic", "iron", "alloy steel", "tin plate", "tinplate"],
  plastic: ["plastic", "pvc", "polyethylene", "polymer", "polypropylene", "hdpe", "ldpe", "pet ", "unplasticized"],
  glass: ["glass", "vitreous"],
  wood: ["wood", "timber", "plywood"],
  rubber: ["rubber", "elastomer", "latex"],
  aluminium: ["aluminium", "aluminum"],
  copper: ["copper", "brass"],
  ceramic: ["ceramic", "porcelain", "china"],
  paper: ["paper", "cardboard", "paperboard"],
  textile: ["textile", "fabric", "cotton", "leather", "yarn"],
};

/** Returns the first material family whose keyword appears in `text`, or null if none does. Deliberately returns at most one family — a text mentioning two is ambiguous, not a signal this function should guess about. */
export function detectMaterialFamily(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = ` ${text.toLowerCase()} `;
  for (const [family, keywords] of Object.entries(MATERIAL_FAMILIES)) {
    if (keywords.some((k) => lower.includes(k))) return family;
  }
  return null;
}

export interface ApplicabilityInput {
  /** The raw or normalized user query text — used as a fallback material signal when structured intent extraction found none (e.g. no LLM provider available). */
  query: string;
  /** Structured material from intent extraction, if any. */
  intentMaterial: string | null;
  /** The candidate standard's title — the most authoritative short text for what it actually covers. */
  candidateTitle: string;
  coverage: CoverageResult;
  groundingState: GroundingState;
}

export function assessApplicability(input: ApplicabilityInput): ApplicabilityResult {
  const { query, intentMaterial, candidateTitle, coverage, groundingState } = input;

  const queryFamily = detectMaterialFamily(intentMaterial) ?? detectMaterialFamily(query);
  const candidateFamily = detectMaterialFamily(candidateTitle);

  if (queryFamily && candidateFamily && queryFamily !== candidateFamily) {
    return {
      state: "MATERIAL_MISMATCH",
      reason: `The query specifies "${queryFamily}", but this standard's title concerns "${candidateFamily}" — applicability to a ${queryFamily} product is not established by the available evidence.`,
      materialConflict: true,
    };
  }

  if (groundingState === "insufficient_evidence") {
    return {
      state: "INSUFFICIENT_EVIDENCE",
      reason: "The available evidence does not clearly establish that this standard applies to the query.",
      materialConflict: false,
    };
  }

  // A candidate whose evidence explicitly does NOT cover the stated
  // product is one whose scope relative to the query is genuinely
  // unclear from what's indexed, not a confirmed match — never upgraded
  // to "applicable" on relevance/ranking alone.
  if (coverage.product === "not_covered") {
    return {
      state: "SCOPE_UNCLEAR",
      reason: "This standard's scope relative to the specific product in the query could not be clearly established from the available evidence.",
      materialConflict: false,
    };
  }

  // DIRECTLY_APPLICABLE requires a REAL, positive signal that the
  // evidence covers the query's product OR that the user named this
  // exact standard (coverage.identifier === "covered") — never merely a
  // high overallCoverageRatio on its own. Live defect found by this
  // session's E2E suite: when no product/material is stated at all
  // (common without an LLM — intent.product is null), analyzeCoverage's
  // ratio defaults to a *vacuous* 1.0 ("nothing to cover, so 100%
  // covered"), which previously satisfied a bare `ratio >= 0.6` check
  // for literally any high-relevance-scoring nonsense query and reported
  // it as high-confidence/directly-applicable.
  if (groundingState === "verified" && (coverage.product === "covered" || coverage.identifier === "covered")) {
    return {
      state: "DIRECTLY_APPLICABLE",
      reason: "Evidence directly supports this standard applying to the query.",
      materialConflict: false,
    };
  }

  if (groundingState === "supported_inference") {
    return {
      state: "POTENTIALLY_APPLICABLE",
      reason: "Evidence is related to the query, but applicability requires interpretation the evidence alone doesn't settle.",
      materialConflict: false,
    };
  }

  // groundingState === "verified" reaches here only when neither the
  // product nor the exact identifier was confirmed against the evidence
  // (e.g. no product/material could be extracted at all) — real,
  // topically-retrieved evidence, but not a confirmed applicability
  // match, so RELATED rather than DIRECTLY_APPLICABLE.
  return {
    state: "RELATED",
    reason: "This standard is topically related to the query, but its applicability has not been specifically established.",
    materialConflict: false,
  };
}
