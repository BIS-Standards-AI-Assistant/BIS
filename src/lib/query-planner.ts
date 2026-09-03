import { resolveStandardIds } from "./standards-id";
import { TESTING_KEYWORDS, CERTIFICATION_KEYWORDS } from "./coverage-analysis";

/**
 * Deterministic query planning (prompts/rag.md Phase 1). Converts a raw
 * query into a structured plan BEFORE any retrieval runs, so the rest of
 * the pipeline knows what it's actually trying to answer.
 *
 * Deliberately regex/heuristic-based, not an LLM call: every signal here
 * (identifier presence, certification/testing keywords, comparison
 * syntax) is a fact about the literal text, not an interpretation of it —
 * consistent with "the planner must NOT invent standards" (rag.md §4).
 * There is no LLM-assisted branch in this pass; the existing
 * `extractQueryIntent` (src/lib/intent.ts) already covers free-text
 * interpretation, and duplicating that behind an LLM call here would be
 * a second, competing source of intent for no benefit.
 */

export const QUERY_PLAN_TYPES = [
  "EXACT_STANDARD",
  "STANDARD_DISCOVERY",
  "PRODUCT_DISCOVERY",
  "CERTIFICATION",
  "TESTING",
  "LABORATORY",
  "QCO",
  "COMPARISON",
  "AMENDMENT_HISTORY",
  "RELATED_STANDARDS",
  "SERVICE_NAVIGATION",
  "GENERAL_INFORMATION",
  "OUT_OF_DOMAIN",
  "AMBIGUOUS",
] as const;

export type QueryPlanType = (typeof QUERY_PLAN_TYPES)[number];

export type QueryComplexity = "SIMPLE" | "MODERATE" | "COMPLEX";

export interface QueryPlan {
  type: QueryPlanType;
  complexity: QueryComplexity;
  identifiers: string[]; // normalized standard identifiers found in the query, e.g. "IS 5522:2014"
  requiresLLM: boolean; // whether extractQueryIntent's LLM call is worth making, vs. the deterministic fast path
  retrievalTasks: string[]; // names only — Phase 2 tools resolve these; the planner does not execute anything
}

const LABORATORY_PATTERN = /\b(laborator(?:y|ies)|test(?:ing)? (?:centre|center|facility|lab))\b/i;
const QCO_PATTERN = /\b(qco|quality control order|mandatory|compulsory)\b/i;
const COMPARISON_PATTERN = /\b(vs\.?|versus|compare|comparison|difference between)\b/i;
const AMENDMENT_PATTERN = /\b(amend(?:ment|ed)?|revis(?:ion|ed)|supersede[sd]?|history|old(?:er)? edition)\b/i;
const SERVICE_PATTERN = /\b(apply|application|licen[cs]e (?:fee|process)|portal|manak online|e-service|renewal)\b/i;
const RELATED_PATTERN = /\b(related|similar|referenced by|references)\b/i;
const OUT_OF_DOMAIN_PATTERN =
  /\b(weather|recipe|movie|song|joke|sports score|stock price|who (?:is|was)|capital of)\b/i;

function wordsOutsideIdentifiers(query: string, identifierRaws: string[]): number {
  let remaining = query;
  for (const raw of identifierRaws) remaining = remaining.replace(raw, " ");
  return remaining.split(/\s+/).filter(Boolean).length;
}

/**
 * Complexity drives retrieval depth and whether an LLM call is
 * worthwhile (rag.md §6/§23): a bare identifier lookup needs neither.
 */
function classifyComplexity(query: string, type: QueryPlanType, identifierCount: number): QueryComplexity {
  if (type === "EXACT_STANDARD" && identifierCount === 1) return "SIMPLE";
  if (type === "OUT_OF_DOMAIN" || type === "AMBIGUOUS") return "SIMPLE";

  const signalCount = [
    QCO_PATTERN.test(query),
    LABORATORY_PATTERN.test(query),
    TESTING_KEYWORDS.test(query),
    CERTIFICATION_KEYWORDS.test(query),
    COMPARISON_PATTERN.test(query),
    AMENDMENT_PATTERN.test(query),
  ].filter(Boolean).length;

  if (signalCount >= 2) return "COMPLEX";
  if (signalCount === 1 || identifierCount > 1) return "MODERATE";
  return query.split(/\s+/).filter(Boolean).length <= 6 ? "SIMPLE" : "MODERATE";
}

function retrievalTasksFor(type: QueryPlanType): string[] {
  switch (type) {
    case "EXACT_STANDARD":
      return ["resolveStandard", "getStandard"];
    case "STANDARD_DISCOVERY":
    case "PRODUCT_DISCOVERY":
      return ["findApplicableStandards", "searchStandards"];
    case "CERTIFICATION":
      return ["findApplicableStandards", "getCertificationScheme", "checkMandatoryStatus"];
    case "TESTING":
      // findTestingRequirements/findLaboratories are not implemented (no
      // laboratories table — see src/lib/tools/index.ts's doc comment).
      // getCertificationScheme IS implemented and already carries real
      // testingParameters (src/lib/certification-schemes.ts) for
      // standards that have a certification scheme record — reusing it
      // here, rather than depending on an LLM to surface the same data,
      // is the P0 "testing reachability" fix (2026-09-03 audit).
      return ["findApplicableStandards", "findTestingRequirements", "getCertificationScheme"];
    case "LABORATORY":
      return ["findApplicableStandards", "findTestingRequirements", "findLaboratories"];
    case "QCO":
      return ["resolveStandard", "checkMandatoryStatus", "findQCO"];
    case "COMPARISON":
      return ["resolveStandard", "compareStandards"];
    case "AMENDMENT_HISTORY":
      return ["resolveStandard", "getStandardHistory"];
    case "RELATED_STANDARDS":
      return ["resolveStandard", "findRelatedStandards", "findReferencedStandards"];
    case "SERVICE_NAVIGATION":
      return ["getBISService"];
    case "GENERAL_INFORMATION":
      return ["searchStandards"];
    case "OUT_OF_DOMAIN":
    case "AMBIGUOUS":
      return [];
  }
}

/**
 * Builds a structured plan from raw query text. Never throws, never
 * returns an empty type — an unrecognized query becomes AMBIGUOUS rather
 * than silently defaulting to a plan type that implies more understanding
 * than the planner actually has.
 */
export function planQuery(query: string): QueryPlan {
  const trimmed = query.trim();
  const resolved = resolveStandardIds(trimmed);
  const identifiers = resolved.map((r) => r.normalized);

  let type: QueryPlanType;

  if (OUT_OF_DOMAIN_PATTERN.test(trimmed) && identifiers.length === 0) {
    type = "OUT_OF_DOMAIN";
  } else if (trimmed.length === 0) {
    type = "AMBIGUOUS";
  } else if (identifiers.length >= 1 && COMPARISON_PATTERN.test(trimmed) && identifiers.length >= 2) {
    type = "COMPARISON";
  } else if (identifiers.length === 1 && AMENDMENT_PATTERN.test(trimmed)) {
    type = "AMENDMENT_HISTORY";
  } else if (identifiers.length === 1 && RELATED_PATTERN.test(trimmed)) {
    type = "RELATED_STANDARDS";
  } else if (identifiers.length === 1 && QCO_PATTERN.test(trimmed)) {
    type = "QCO";
  } else if (identifiers.length === 1 && wordsOutsideIdentifiers(trimmed, resolved.map((r) => r.raw)) <= 3) {
    // The smallest plan capable of answering an exact-identifier lookup
    // (rag.md §5): the resolver already recognized the standard, so
    // discovery/certification/testing detection below is unnecessary.
    type = "EXACT_STANDARD";
  } else if (LABORATORY_PATTERN.test(trimmed)) {
    type = "LABORATORY";
  } else if (SERVICE_PATTERN.test(trimmed)) {
    type = "SERVICE_NAVIGATION";
  } else if (TESTING_KEYWORDS.test(trimmed)) {
    type = "TESTING";
  } else if (CERTIFICATION_KEYWORDS.test(trimmed) || QCO_PATTERN.test(trimmed)) {
    type = "CERTIFICATION";
  } else if (identifiers.length >= 1) {
    type = "STANDARD_DISCOVERY";
  } else if (/\b(what|which|find|need|require|applicable|standard)\b/i.test(trimmed)) {
    type = "PRODUCT_DISCOVERY";
  } else if (trimmed.split(/\s+/).filter(Boolean).length >= 3) {
    type = "GENERAL_INFORMATION";
  } else {
    type = "AMBIGUOUS";
  }

  const complexity = classifyComplexity(trimmed, type, identifiers.length);

  // The identifier fast path in intent.ts already skips the LLM for a
  // lone bare identifier; mirror that condition here so planner and
  // intent extraction never disagree about whether an LLM call is
  // worthwhile for the same query.
  const requiresLLM = !(type === "EXACT_STANDARD" && complexity === "SIMPLE") && type !== "OUT_OF_DOMAIN";

  return {
    type,
    complexity,
    identifiers,
    requiresLLM,
    retrievalTasks: retrievalTasksFor(type),
  };
}
