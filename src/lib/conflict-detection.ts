import type { AggregatedEvidence } from "./evidence-aggregation";

/**
 * Lightweight deterministic conflict detection — flags for human/LLM
 * attention, not proofs. This is explicitly NOT semantic theorem proving:
 * it catches a small set of obvious, well-defined signal patterns and
 * lowers confidence when they fire, rather than trying to resolve the
 * conflict itself.
 */

export type ConflictType = "version_conflict" | "superseded_standard" | "evidence_conflict";

export interface Conflict {
  type: ConflictType;
  description: string;
  affectedStandards: string[];
}

const SUPERSEDED_PATTERN = /\b(superseded|withdrawn|obsolete)\b/i;
const MANDATORY_PATTERN = /\b(mandatory|compulsory)\b/i;
const VOLUNTARY_PATTERN = /\b(voluntary|not mandatory|not compulsory)\b/i;

/** Strips part/section/year to compare the base standard number, e.g. "IS 302 (Part 2/Sec 6):2009" -> "IS 302" */
function baseStandardNumber(standardNumber: string): string | null {
  const match = standardNumber.match(/\bIS\s*(\d{2,6})\b/i);
  return match ? `IS ${match[1]}` : null;
}

export function detectConflicts(candidates: AggregatedEvidence[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // Version conflict: two different documents in the candidate set share
  // the same base standard number (e.g. two editions of "IS 302" both
  // retrieved) but have different full standard_number strings.
  const byBase = new Map<string, Set<string>>();
  for (const c of candidates) {
    if (!c.standardNumber) continue;
    const base = baseStandardNumber(c.standardNumber);
    if (!base) continue;
    const set = byBase.get(base) ?? new Set<string>();
    set.add(c.standardNumber);
    byBase.set(base, set);
  }
  for (const [base, variants] of byBase) {
    if (variants.size > 1) {
      conflicts.push({
        type: "version_conflict",
        description: `Multiple editions/variants of ${base} were retrieved (${[...variants].join(", ")}) — verify which edition is current.`,
        affectedStandards: [...variants],
      });
    }
  }

  for (const c of candidates) {
    if (!c.standardNumber) continue;
    const text = c.chunks.map((chunk) => chunk.text).join(" \n ");

    if (SUPERSEDED_PATTERN.test(text)) {
      conflicts.push({
        type: "superseded_standard",
        description: `Retrieved evidence for ${c.standardNumber} contains language suggesting it may be superseded, withdrawn, or obsolete — verify current validity before relying on it.`,
        affectedStandards: [c.standardNumber],
      });
    }

    // Heuristic, not a proven contradiction: the same standard's evidence
    // containing both "mandatory" and "voluntary" language often means two
    // different things are being described (e.g. a mandatory scheme with a
    // voluntary sub-component) — flagged so the LLM is told to acknowledge
    // the nuance explicitly rather than asserting one or the other as a
    // blanket rule.
    if (MANDATORY_PATTERN.test(text) && VOLUNTARY_PATTERN.test(text)) {
      conflicts.push({
        type: "evidence_conflict",
        description: `Evidence for ${c.standardNumber} contains both "mandatory" and "voluntary" language — this may describe different provisions rather than a contradiction, but it should not be flattened into a single unqualified claim.`,
        affectedStandards: [c.standardNumber],
      });
    }
  }

  return conflicts;
}
