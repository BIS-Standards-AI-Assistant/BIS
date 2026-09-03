import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { standards, documents } from "@/db/schema";

/**
 * The BIS Reference Registry (prompts/final.md §4) — answers "does this
 * standard exist, and is its authoritative document indexed" from
 * fields that already exist in the `standards`/`documents` tables. This
 * is an architecture/read layer, not new data collection: it never
 * invents a URL, a purchase link, or an access type it can't derive
 * from a value already stored in the database.
 *
 * `accessType` is a heuristic derived ONLY from the domain of an
 * already-real, already-stored `sourceUrl` — "official_download" for a
 * bis.gov.in URL, "external_access" for any other real URL, "unknown"
 * when there is none. This is an inference about a real stored fact
 * (which domain a real URL points at), not a fabricated classification.
 */

export type ReferenceAccessType = "free" | "official_download" | "official_purchase" | "external_access" | "restricted" | "unknown";

export interface ReferenceEntry {
  standardId: string;
  standardNumber: string;
  title: string | null;
  edition: string | null;
  status: string | null;
  bisSourceUrl: string | null;
  officialDocumentUrl: string | null;
  accessType: ReferenceAccessType;
  indexedByNavigator: boolean;
  indexedDocumentId: string | null;
  sourceVerificationStatus: string;
  lastVerified: string | null;
  notes: string[];
}

// Exported for direct unit testing — the DB-touching buildReferenceEntry
// below isn't unit-tested (no guaranteed live DATABASE_URL in the
// vitest environment; verified live instead, see reference-registry
// entries in scripts/tools-smoke.ts).
export function deriveAccessType(sourceUrl: string | null): ReferenceAccessType {
  if (!sourceUrl) return "unknown";
  try {
    const hostname = new URL(sourceUrl).hostname;
    return hostname.endsWith("bis.gov.in") ? "official_download" : "external_access";
  } catch {
    return "unknown";
  }
}

/**
 * Returns null (never a partially-fabricated entry) when the canonical
 * number isn't in the `standards` table at all — the caller's job is to
 * say "this standard is not known to the Navigator," not to construct a
 * registry entry with guessed fields.
 */
export async function buildReferenceEntry(canonicalNumber: string): Promise<ReferenceEntry | null> {
  const db = getDb();
  const standardRow = await db.query.standards.findFirst({ where: eq(standards.canonicalNumber, canonicalNumber) });
  if (!standardRow) return null;

  const documentRow = await db.query.documents.findFirst({ where: eq(documents.standardId, standardRow.id) });

  const notes: string[] = [];
  if (!documentRow) {
    notes.push("The authoritative document for this standard is not currently indexed in the Navigator's knowledge base — technical clause-level content cannot be provided or inferred.");
  }
  if (standardRow.verificationStatus === "needs_review") {
    notes.push("This standard's metadata has not been independently verified against a primary BIS source yet — treat title/edition/scheme details as provisional.");
  }

  return {
    standardId: standardRow.id,
    standardNumber: standardRow.canonicalNumber,
    title: standardRow.title,
    edition: standardRow.editionYear,
    status: standardRow.status,
    bisSourceUrl: standardRow.sourceUrl,
    officialDocumentUrl: documentRow?.sourceUrl ?? null,
    accessType: deriveAccessType(documentRow?.sourceUrl ?? standardRow.sourceUrl),
    indexedByNavigator: documentRow !== undefined,
    indexedDocumentId: documentRow?.id ?? null,
    sourceVerificationStatus: standardRow.verificationStatus,
    lastVerified: standardRow.lastVerifiedAt ? standardRow.lastVerifiedAt.toISOString() : null,
    notes,
  };
}
