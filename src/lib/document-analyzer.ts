import { getDb } from "@/db";
import { standards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveStandardIds } from "./standards-id";
import { resolveScopedContext } from "./chat-context";
import { assessApplicability } from "./applicability";
import type { ApplicabilityState } from "@/types/api";

/**
 * Document Analyzer (pfinal.md §8). Deliberately reuses existing,
 * already-tested pieces rather than a new parallel engine:
 * resolveStandardIds (the same deterministic identifier parser retrieval
 * uses), resolveScopedContext (P0's real DB-backed chunk lookup — no
 * fuzzy/global search), and assessApplicability (P0's applicability
 * engine). The uploaded document's text is DATA throughout this module —
 * it is never concatenated into an LLM prompt or otherwise treated as
 * instructions (§8.5).
 */

const MIN_EXTRACTABLE_CHARS = 50;
const EXCERPT_LENGTH_FOR_APPLICABILITY = 4000; // bounded — this is a material/product signal, not the whole document re-sent anywhere

export interface DocumentIdentifierMatch {
  identifierText: string; // exact substring found in the document
  resolvedNumber: string; // normalized "IS X:Y" form
  inDatabase: boolean;
  standardId: string | null;
  title: string | null;
}

export interface DocumentAnalysisResult {
  extractedChars: number;
  identifiersFound: DocumentIdentifierMatch[];
  standards: Array<{
    standardNumber: string;
    title: string | null;
    label: "VERIFIED" | "POTENTIAL" | "RELATED" | "UNKNOWN";
    applicabilityState: ApplicabilityState;
    applicabilityReason: string;
    evidenceCount: number;
  }>;
  limitations: string[];
}

const APPLICABILITY_TO_LABEL: Record<ApplicabilityState, "VERIFIED" | "POTENTIAL" | "RELATED" | "UNKNOWN"> = {
  DIRECTLY_APPLICABLE: "VERIFIED",
  POTENTIALLY_APPLICABLE: "POTENTIAL",
  RELATED: "RELATED",
  MATERIAL_MISMATCH: "RELATED",
  SCOPE_UNCLEAR: "UNKNOWN",
  INSUFFICIENT_EVIDENCE: "UNKNOWN",
  NOT_APPLICABLE: "UNKNOWN",
};

/**
 * Analyzes already-extracted document text (the upload route does the
 * file-type/size/parsing work — this function only ever sees plain text,
 * already validated). Never fabricates a standard match: every
 * `inDatabase: true` entry comes from an exact `canonicalNumber` lookup,
 * never a fuzzy/normalized-only match (the same rule this session's data
 * acquisition batch already enforced when quarantining edition
 * mismatches).
 */
export async function analyzeDocumentText(text: string): Promise<DocumentAnalysisResult> {
  const trimmed = text.trim();
  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    return {
      extractedChars: trimmed.length,
      identifiersFound: [],
      standards: [],
      limitations: ["Not enough extractable text was found in this document to identify any standards."],
    };
  }

  const resolved = resolveStandardIds(trimmed);
  const uniqueByNumber = new Map<string, (typeof resolved)[number]>();
  for (const r of resolved) {
    if (!uniqueByNumber.has(r.normalized)) uniqueByNumber.set(r.normalized, r);
  }

  const db = getDb();
  const identifiersFound: DocumentIdentifierMatch[] = [];
  for (const [normalized, r] of uniqueByNumber) {
    const row = await db.query.standards.findFirst({ where: eq(standards.canonicalNumber, normalized) });
    identifiersFound.push({
      identifierText: r.raw,
      resolvedNumber: normalized,
      inDatabase: !!row,
      standardId: row?.id ?? null,
      title: row?.title ?? null,
    });
  }

  const matchedNumbers = identifiersFound.filter((m) => m.inDatabase).map((m) => m.resolvedNumber);
  const scoped = await resolveScopedContext(matchedNumbers);
  const applicabilityQueryText = trimmed.slice(0, EXCERPT_LENGTH_FOR_APPLICABILITY);

  const standardsOut = scoped.map((s) => {
    const applicability = assessApplicability({
      query: applicabilityQueryText,
      intentMaterial: null,
      candidateTitle: s.title ?? "",
      coverage: {
        product: "unknown",
        material: "unknown",
        application: "unknown",
        targetUser: "unknown",
        sector: "unknown",
        testing: "unknown",
        certification: "unknown",
        identifier: "covered", // the document literally names this standard
        overallCoverageRatio: 1,
      },
      groundingState: s.chunks.length > 0 ? "supported_inference" : "insufficient_evidence",
    });
    return {
      standardNumber: s.standardNumber,
      title: s.title,
      label: APPLICABILITY_TO_LABEL[applicability.state],
      applicabilityState: applicability.state,
      applicabilityReason: applicability.reason,
      evidenceCount: s.chunks.length,
    };
  });

  const limitations: string[] = [];
  if (identifiersFound.length === 0) {
    limitations.push("No Indian Standard identifiers were found mentioned in this document's text.");
  }
  const unresolvedCount = identifiersFound.filter((m) => !m.inDatabase).length;
  if (unresolvedCount > 0) {
    limitations.push(
      `${unresolvedCount} identifier(s) were found in the document text but do not match a standard currently in this system's knowledge base — this does not mean the standard doesn't exist, only that it is not yet indexed here.`,
    );
  }

  return { extractedChars: trimmed.length, identifiersFound, standards: standardsOut, limitations };
}
