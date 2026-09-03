import { or, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { relationships } from "@/db/schema";

/**
 * Graph retrieval (prompts/final.md §6) against the real `relationships`
 * table — the table `scripts/data-relationships.ts` populates. This
 * supplements the existing retrieval stack; it never replaces it, and
 * it never invents an edge that isn't already a row in that table.
 *
 * Deliberately minimal: `getNeighbors` is the one operation both of the
 * currently-populated relationship types (STANDARD_HAS_PRODUCT_MANUAL,
 * STANDARD_SUBJECT_TO_QCO) need. A `findPath`/multi-hop traversal is not
 * implemented — with only 2 relationship types and no chained edges yet,
 * there is nothing for a path-finder to traverse that a single
 * neighbor lookup doesn't already cover; building one now would be
 * untestable machinery with no real graph shape to exercise it against.
 */

export interface GraphNeighbor {
  relationshipId: string;
  relationshipType: string;
  direction: "outgoing" | "incoming";
  /** The entity on the OTHER side of the relationship from the one queried. */
  otherEntityType: string;
  otherEntityId: string;
  evidenceText: string | null;
  confidence: number | null;
  verificationStatus: string;
  documentId: string | null;
  sourceId: string | null;
}

/**
 * Finds every relationship row touching (entityType, entityId), in
 * either direction — a QCO row's edge to a standard is stored as
 * standard -> qco, so a lookup by the QCO's own id must still find it.
 * Returns [] (never throws, never fabricates) when the entity has no
 * relationships, which — per the live-verified state at the time this
 * was written — is true for most standards (only 2 relationship types
 * exist, covering 4 documents and 46 QCOs out of 51 standards).
 */
export async function getNeighbors(entityType: string, entityId: string): Promise<GraphNeighbor[]> {
  const db = getDb();
  const rows = await db.query.relationships.findMany({
    where: or(
      eq(relationships.sourceEntityId, entityId),
      eq(relationships.targetEntityId, entityId),
    ),
  });

  return rows
    .filter((r) => (r.sourceEntityId === entityId && r.sourceEntityType === entityType) || (r.targetEntityId === entityId && r.targetEntityType === entityType))
    .map((r) => {
      const outgoing = r.sourceEntityId === entityId && r.sourceEntityType === entityType;
      return {
        relationshipId: r.id,
        relationshipType: r.relationshipType,
        direction: outgoing ? "outgoing" : "incoming",
        otherEntityType: outgoing ? r.targetEntityType : r.sourceEntityType,
        otherEntityId: outgoing ? r.targetEntityId : r.sourceEntityId,
        evidenceText: r.evidenceText,
        confidence: r.confidence,
        verificationStatus: r.verificationStatus,
        documentId: r.documentId,
        sourceId: r.sourceId,
      } satisfies GraphNeighbor;
    });
}
