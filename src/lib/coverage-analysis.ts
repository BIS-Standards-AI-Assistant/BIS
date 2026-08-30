import type { QueryIntent } from "./intent";
import type { AggregatedEvidence } from "./evidence-aggregation";
import { matchesResolvedId, type ResolvedStandardId } from "./standards-id";

/**
 * Deterministic coverage analysis: for a candidate standard, does the
 * retrieved evidence actually address each constraint the user asked
 * about, or is the system just returning "a plausible standard" without
 * evidence for the specific thing that was asked (material, use case,
 * testing, certification, ...)?
 *
 * This never calls an LLM — it's a keyword/term-overlap check against text
 * the retrieval stage already fetched, which is enough to answer "was this
 * constraint even mentioned in the evidence" without needing language
 * understanding.
 */

export type CoverageStatus = "covered" | "not_covered" | "unknown";

export interface CoverageResult {
  product: CoverageStatus;
  material: CoverageStatus;
  application: CoverageStatus;
  targetUser: CoverageStatus;
  sector: CoverageStatus;
  testing: CoverageStatus;
  certification: CoverageStatus;
  identifier: CoverageStatus;
  /** Fraction of *applicable* (non-"unknown") dimensions that are "covered". 1.0 if no dimension applied — there is nothing evidence needed to cover. */
  overallCoverageRatio: number;
}

const STOPWORDS = new Set([
  "the", "a", "an", "for", "and", "or", "of", "to", "in", "on", "with", "this",
  "that", "used", "use", "product", "item", "general", "general-purpose",
]);

// Exported for reuse by src/lib/tools/comparison-tools.ts, which needs
// the same "meaningful word, not a stopword" definition to find genuine
// textual overlap between two standards' evidence — one definition, not
// a second copy.
export function significantTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function termCoverage(value: string | null, haystack: string): CoverageStatus {
  if (!value) return "unknown";
  const terms = significantTerms(value);
  if (terms.length === 0) return "unknown";
  const lowerHaystack = haystack.toLowerCase();
  const matched = terms.filter((t) => new RegExp(`\\b${t}\\b`).test(lowerHaystack));
  return matched.length / terms.length >= 0.5 ? "covered" : "not_covered";
}

// Exported so other consumers (e.g. the Standard Passport page) can group
// evidence chunks by the same testing/certification signal this module
// uses for coverage scoring — one definition, not a second copy.
export const TESTING_KEYWORDS = /\b(test|testing|tested|sample|inspection|method of test)\b/i;
export const CERTIFICATION_KEYWORDS = /\b(certif\w*|licen[cs]e\w*|scheme|mark|registration)\b/i;

function keywordCoverage(requested: boolean, pattern: RegExp, haystack: string): CoverageStatus {
  if (!requested) return "unknown";
  return pattern.test(haystack) ? "covered" : "not_covered";
}

function identifierCoverage(
  identifiers: ResolvedStandardId[],
  candidateStandardNumber: string | null,
): CoverageStatus {
  if (identifiers.length === 0) return "unknown";
  const matches = identifiers.some((r) => matchesResolvedId(candidateStandardNumber, r));
  return matches ? "covered" : "not_covered";
}

export function analyzeCoverage(
  intent: QueryIntent,
  candidate: AggregatedEvidence,
  identifiers: ResolvedStandardId[],
): CoverageResult {
  const haystack = candidate.chunks.map((c) => c.text).join(" \n ");

  const result: CoverageResult = {
    product: termCoverage(intent.product, haystack),
    material: termCoverage(intent.material, haystack),
    application: termCoverage(intent.useCase, haystack),
    targetUser: termCoverage(intent.targetUser, haystack),
    sector: termCoverage(intent.sector, haystack),
    testing: keywordCoverage(intent.testingRequested, TESTING_KEYWORDS, haystack),
    certification: keywordCoverage(intent.certificationRequested, CERTIFICATION_KEYWORDS, haystack),
    identifier: identifierCoverage(identifiers, candidate.standardNumber),
    overallCoverageRatio: 1,
  };

  const applicable = ([
    result.product,
    result.material,
    result.application,
    result.targetUser,
    result.sector,
    result.testing,
    result.certification,
    result.identifier,
  ] as CoverageStatus[]).filter((s) => s !== "unknown");

  result.overallCoverageRatio =
    applicable.length === 0 ? 1 : applicable.filter((s) => s === "covered").length / applicable.length;

  return result;
}
