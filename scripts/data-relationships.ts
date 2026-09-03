/**
 * The knowledge-graph foundation milestone (prompts/dataAcquisition.md,
 * src/lib/knowledge-graph.ts) built the `relationships` table and its
 * anti-fabrication validator, but no script ever populated it — this is
 * that script, for the first two edge types this project already has
 * real, structural evidence for:
 *
 *   STANDARD_HAS_PRODUCT_MANUAL — from documents.standard_id (set when
 *     an ingested document is linked to its standard master record;
 *     src/db/schema.ts's own comment already describes documents this
 *     way for the "product_manual" documentType)
 *   STANDARD_SUBJECT_TO_QCO     — from qcos.standard_id (set for every
 *     row in the qcos table by definition — a QCO row only exists
 *     because it was linked to a standard)
 *
 * Deliberately NOT an LLM-driven extraction: both edges already exist as
 * real foreign keys in the database, populated by
 * scripts/data-migrate-existing.ts from a fact-checked source. This
 * script does not discover anything new — it materializes structural
 * facts that already exist into the relationships table's explicit,
 * provenance-carrying shape, per rag.md §7's own instruction that
 * deterministic extraction ("if a document is explicitly associated
 * with IS 1234, create Document -> describes -> Standard") comes before
 * any LLM-assisted extraction.
 *
 * verificationStatus is inherited from the underlying row, never
 * upgraded — a relationship materialized from a needs_review QCO stays
 * needs_review.
 *
 * Idempotent: checks for an existing row with the same
 * (sourceEntityId, targetEntityId, relationshipType) before inserting.
 *
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/data-relationships.ts
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { standards, relationships } from "../src/db/schema";
import { validateRelationshipCandidate, type RelationshipCandidate } from "../src/lib/knowledge-graph";

async function relationshipExists(
  db: ReturnType<typeof getDb>,
  sourceEntityId: string,
  targetEntityId: string,
  relationshipType: string,
): Promise<boolean> {
  const existing = await db.query.relationships.findFirst({
    where: and(
      eq(relationships.sourceEntityId, sourceEntityId),
      eq(relationships.targetEntityId, targetEntityId),
      eq(relationships.relationshipType, relationshipType),
    ),
  });
  return existing !== undefined;
}

async function insertIfValid(
  db: ReturnType<typeof getDb>,
  candidate: RelationshipCandidate & { verificationStatus: string },
): Promise<"inserted" | "skipped_exists" | "rejected"> {
  const validation = validateRelationshipCandidate(candidate);
  if (!validation.valid) {
    console.error(`  REJECTED (${candidate.relationshipType}, ${candidate.sourceEntityId} -> ${candidate.targetEntityId}): ${validation.reason}`);
    return "rejected";
  }

  if (await relationshipExists(db, candidate.sourceEntityId, candidate.targetEntityId, candidate.relationshipType)) {
    return "skipped_exists";
  }

  await db.insert(relationships).values({
    sourceEntityType: candidate.sourceEntityType,
    sourceEntityId: candidate.sourceEntityId,
    relationshipType: candidate.relationshipType,
    targetEntityType: candidate.targetEntityType,
    targetEntityId: candidate.targetEntityId,
    documentId: candidate.documentId ?? null,
    sourceId: candidate.sourceId ?? null,
    evidenceText: candidate.evidenceText ?? null,
    confidence: candidate.confidence ?? null,
    verificationStatus: candidate.verificationStatus as "verified" | "corrected" | "needs_review" | "unverified",
  });
  return "inserted";
}

async function materializeDocumentStandardEdges(db: ReturnType<typeof getDb>) {
  const docs = await db.query.documents.findMany({ where: (d, { isNotNull }) => isNotNull(d.standardId) });
  let inserted = 0;
  let skipped = 0;
  let rejected = 0;

  for (const doc of docs) {
    if (!doc.standardId) continue;
    const outcome = await insertIfValid(db, {
      sourceEntityType: "standard",
      sourceEntityId: doc.standardId,
      relationshipType: "STANDARD_HAS_PRODUCT_MANUAL",
      targetEntityType: "document",
      targetEntityId: doc.id,
      documentId: doc.id,
      evidenceText: `Document "${doc.title}" (documentType="${doc.documentType}", sourceUrl=${doc.sourceUrl}) is linked to this standard via the documents.standard_id foreign key, set by scripts/data-migrate-existing.ts from the document's own already-validated ingest metadata (checksum, source URL).`,
      confidence: 1.0, // structural fact — the FK link itself, not an inference
      verificationStatus: "verified", // the underlying document row already passed the ingest pipeline's own validation
    });
    if (outcome === "inserted") inserted++;
    else if (outcome === "skipped_exists") skipped++;
    else rejected++;
  }
  return { inserted, skipped, rejected, total: docs.length };
}

async function materializeQcoStandardEdges(db: ReturnType<typeof getDb>) {
  const rows = await db.query.qcos.findMany({ where: (q, { isNotNull }) => isNotNull(q.standardId) });
  let inserted = 0;
  let skipped = 0;
  let rejected = 0;

  for (const qco of rows) {
    if (!qco.standardId) continue;
    const standardRow = await db.query.standards.findFirst({ where: eq(standards.id, qco.standardId) });
    const outcome = await insertIfValid(db, {
      sourceEntityType: "standard",
      sourceEntityId: qco.standardId,
      relationshipType: "STANDARD_SUBJECT_TO_QCO",
      targetEntityType: "qco",
      targetEntityId: qco.id,
      sourceId: qco.sourceId,
      evidenceText: `QCO "${qco.title}" (mandatory=${qco.mandatory}, applicability="${qco.applicability ?? "n/a"}") is linked to standard ${standardRow?.canonicalNumber ?? qco.standardId} via the qcos.standard_id foreign key, set by scripts/data-migrate-existing.ts from data/bis-standards-dataset/qco-standards.json.`,
      confidence: 1.0,
      // Inherited, never upgraded: a QCO row itself carries its own
      // verificationStatus (verified for the original 22 fact-checked
      // entries, needs_review for the 26 pulled from an unverified
      // upstream update) — the relationship built from it must not
      // claim more certainty than the fact it's built on.
      verificationStatus: qco.verificationStatus,
    });
    if (outcome === "inserted") inserted++;
    else if (outcome === "skipped_exists") skipped++;
    else rejected++;
  }
  return { inserted, skipped, rejected, total: rows.length };
}

async function main() {
  const db = getDb();

  console.log("Materializing STANDARD_HAS_PRODUCT_MANUAL edges from documents.standard_id...");
  const docResult = await materializeDocumentStandardEdges(db);
  console.log(`  ${docResult.inserted} inserted, ${docResult.skipped} already present, ${docResult.rejected} rejected (of ${docResult.total} linked documents)`);

  console.log("\nMaterializing STANDARD_SUBJECT_TO_QCO edges from qcos.standard_id...");
  const qcoResult = await materializeQcoStandardEdges(db);
  console.log(`  ${qcoResult.inserted} inserted, ${qcoResult.skipped} already present, ${qcoResult.rejected} rejected (of ${qcoResult.total} linked QCOs)`);

  const totalRows = await db.query.relationships.findMany({ columns: { id: true } });
  console.log(`\nDone. ${totalRows.length} relationship row(s) total in the table.`);
  console.log("Run again any time — every step above is idempotent.");
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
