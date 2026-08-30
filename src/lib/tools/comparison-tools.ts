import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { standards, chunks, documents } from "@/db/schema";
import { significantTerms } from "../coverage-analysis";
import { baseStandardNumber } from "../conflict-detection";
import type { ToolDefinition, ToolResult } from "./types";
import type { StandardRecord } from "./standards-tools";

/**
 * rag.md §7 `compareStandards()` / §35 "Standard Comparison" — the first
 * concrete piece of "Standard Reasoning" the user asked for
 * (2026-08-30). Deliberately does NOT attempt a legal-precedence ruling
 * ("which standard governs a hybrid product") — that would require the
 * LLM to assert a legal conclusion with no grounding, which is exactly
 * the fabrication rag.md §9 and CLAUDE.md's "never manufacture
 * certainty" forbid. What this tool CAN honestly report, from real data
 * only:
 *
 * - factual metadata differences (edition, status, domain) from the
 *   `standards` table
 * - a genuine version relationship when both identifiers share the same
 *   base standard number (reuses conflict-detection.ts's own definition)
 * - term-level textual overlap between the two standards' actually
 *   ingested evidence chunks — a signal that both standards discuss the
 *   same subject matter, not a claim that their clauses are legally
 *   equivalent
 * - an explicit `evidenceAvailable` flag per standard, since only 4 of
 *   25 standards in this database have any ingested document text as of
 *   this session — most comparisons will honestly report "insufficient
 *   evidence to compare content" rather than inventing an overlap.
 */

const CompareInput = z.object({ canonicalNumberA: z.string().min(1), canonicalNumberB: z.string().min(1) });

export interface FieldDifference {
  field: string;
  a: string | null;
  b: string | null;
}

export interface StandardComparisonResult {
  standardA: StandardRecord;
  standardB: StandardRecord;
  /** True only when both identifiers resolve to the same base IS number (e.g. "IS 302") with a different part/section/edition — a real version relationship, not an inference. */
  sameBaseStandard: boolean;
  fieldDifferences: FieldDifference[];
  /** Significant terms present in BOTH standards' ingested evidence text. Empty whenever either standard has no ingested evidence — never backfilled from metadata or a guess. */
  overlappingTerms: string[];
  evidenceAvailable: { standardA: boolean; standardB: boolean };
  limitations: string[];
}

function toRecord(row: typeof standards.$inferSelect): StandardRecord {
  return {
    standardId: row.id,
    canonicalNumber: row.canonicalNumber,
    normalizedNumber: row.normalizedNumber,
    title: row.title,
    editionYear: row.editionYear,
    status: row.status,
    domain: row.domain,
    sourceUrl: row.sourceUrl,
    verificationStatus: row.verificationStatus,
  };
}

function diffField(field: string, a: string | null, b: string | null): FieldDifference | null {
  if (a === b) return null;
  return { field, a, b };
}

async function evidenceTermsFor(canonicalNumber: string): Promise<{ terms: Set<string>; hasEvidence: boolean }> {
  const db = getDb();
  const rows = await db
    .select({ text: chunks.text })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(eq(documents.standardNumber, canonicalNumber));

  if (rows.length === 0) return { terms: new Set(), hasEvidence: false };
  const terms = new Set(rows.flatMap((r) => significantTerms(r.text)));
  return { terms, hasEvidence: true };
}

export const compareStandardsTool: ToolDefinition<z.infer<typeof CompareInput>, StandardComparisonResult> = {
  name: "compareStandards",
  description: "Compares two standards' metadata and ingested evidence — factual differences and textual overlap only, never a legal-precedence ruling.",
  inputSchema: CompareInput,
  deterministic: true,
  async execute({ canonicalNumberA, canonicalNumberB }): Promise<ToolResult<StandardComparisonResult>> {
    const db = getDb();
    const [rowA, rowB] = await Promise.all([
      db.query.standards.findFirst({ where: eq(standards.canonicalNumber, canonicalNumberA) }),
      db.query.standards.findFirst({ where: eq(standards.canonicalNumber, canonicalNumberB) }),
    ]);

    if (!rowA || !rowB) return { status: "not_found" };

    const sameBaseStandard =
      baseStandardNumber(rowA.canonicalNumber) !== null &&
      baseStandardNumber(rowA.canonicalNumber) === baseStandardNumber(rowB.canonicalNumber);

    const fieldDifferences = [
      diffField("editionYear", rowA.editionYear, rowB.editionYear),
      diffField("status", rowA.status, rowB.status),
      diffField("domain", rowA.domain, rowB.domain),
      diffField("classification", rowA.classification, rowB.classification),
    ].filter((d): d is FieldDifference => d !== null);

    const [evidenceA, evidenceB] = await Promise.all([
      evidenceTermsFor(rowA.canonicalNumber),
      evidenceTermsFor(rowB.canonicalNumber),
    ]);

    const overlappingTerms =
      evidenceA.hasEvidence && evidenceB.hasEvidence
        ? [...evidenceA.terms].filter((t) => evidenceB.terms.has(t)).sort()
        : [];

    const limitations: string[] = [];
    if (!evidenceA.hasEvidence) limitations.push(`No ingested document text is available for ${rowA.canonicalNumber} — content overlap could not be assessed.`);
    if (!evidenceB.hasEvidence) limitations.push(`No ingested document text is available for ${rowB.canonicalNumber} — content overlap could not be assessed.`);
    limitations.push(
      "This comparison reports factual metadata differences and shared terminology only. It does not determine which standard takes legal precedence for a hybrid or overlapping product — that determination requires a verified BIS ruling or QCO, not an automated inference.",
    );

    return {
      status: "ok",
      data: {
        standardA: toRecord(rowA),
        standardB: toRecord(rowB),
        sameBaseStandard,
        fieldDifferences,
        overlappingTerms,
        evidenceAvailable: { standardA: evidenceA.hasEvidence, standardB: evidenceB.hasEvidence },
        limitations,
      },
      provenance: [
        { source: "standards table", verificationStatus: rowA.verificationStatus },
        { source: "standards table", verificationStatus: rowB.verificationStatus },
        { source: "chunks table (ingested evidence)" },
      ],
    };
  },
};
