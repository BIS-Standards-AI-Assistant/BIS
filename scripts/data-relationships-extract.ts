/**
 * P1-A "real standards relationships" (prompts/p1.md), first deterministic
 * extraction pass beyond the FK-mirror edges scripts/data-relationships.ts
 * already materializes (STANDARD_HAS_PRODUCT_MANUAL, STANDARD_SUBJECT_TO_QCO
 * — both structural facts, not extraction). This script adds two new,
 * evidence-carrying edge types the P1 audit found the vocabulary already
 * defines (src/lib/knowledge-graph.ts) but nothing ever populated:
 *
 *   STANDARD_RELATED_TO_STANDARD — siblings sharing a base identifier
 *     (same normalizedNumber, e.g. "IS 302 (Part 2/Sec 6):2009" and
 *     "IS 302 (Part 2/Sec 3):2007"). Deliberately NOT PART_OF: no single
 *     umbrella "IS 302" row exists in this database for either to be a
 *     part *of* — RELATED_TO says exactly what's actually known.
 *
 *   STANDARD_REFERENCES_STANDARD — a chunk of standard A's own ingested
 *     text names standard B's identifier (via the same deterministic
 *     src/lib/standards-id.ts resolver the rest of the pipeline uses, not
 *     an LLM). Only counted when B matches a real row in `standards` by
 *     exact canonicalNumber — a fuzzy/normalizedNumber-only match is
 *     rejected rather than risk citing the wrong edition (the exact
 *     mistake docs/DATA_ACQUISITION_PLAN.md's PM batch caught and
 *     quarantined this session).
 *
 * Both edge types require a real documentId (the chunk's own document, or
 * the standard's own linked document for the sibling case) — no edge is
 * ever inserted without it, enforced by src/lib/knowledge-graph.ts's
 * validateRelationshipCandidate, the same anti-fabrication gate
 * scripts/data-relationships.ts already uses. verificationStatus is
 * "needs_review", never "verified" — this is candidate extraction (P1-A3:
 * "Candidate relationships MUST pass evidence validation before becoming
 * verified graph edges"), not a fact-checked source like the QCO dataset.
 *
 * Idempotent — safe to re-run.
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/data-relationships-extract.ts
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { relationships } from "../src/db/schema";
import { validateRelationshipCandidate, type RelationshipCandidate } from "../src/lib/knowledge-graph";
import { resolveStandardIds } from "../src/lib/standards-id";

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

async function extractSiblingRelated(db: ReturnType<typeof getDb>) {
  const all = await db.query.standards.findMany({ columns: { id: true, canonicalNumber: true, normalizedNumber: true } });
  const allDocs = await db.query.documents.findMany({ where: (d, { isNotNull }) => isNotNull(d.standardId), columns: { id: true, standardId: true } });
  const docByStandardId = new Map(allDocs.map((d) => [d.standardId as string, d.id]));

  const byNorm = new Map<string, typeof all>();
  for (const s of all) {
    if (!byNorm.has(s.normalizedNumber)) byNorm.set(s.normalizedNumber, []);
    byNorm.get(s.normalizedNumber)!.push(s);
  }

  let inserted = 0, skipped = 0, rejected = 0, pairs = 0;
  for (const [, family] of byNorm) {
    if (family.length < 2) continue;
    for (let i = 0; i < family.length; i++) {
      for (let j = 0; j < family.length; j++) {
        if (i === j) continue;
        pairs++;
        const a = family[i];
        const b = family[j];
        const docId = docByStandardId.get(a.id);
        if (!docId) continue; // no evidence to cite — never fabricate one
        const outcome = await insertIfValid(db, {
          sourceEntityType: "standard",
          sourceEntityId: a.id,
          relationshipType: "STANDARD_RELATED_TO_STANDARD",
          targetEntityType: "standard",
          targetEntityId: b.id,
          documentId: docId,
          evidenceText: `"${a.canonicalNumber}" and "${b.canonicalNumber}" share the same base identifier number in the standards table (normalizedNumber match) — both are parts/sections of the same base Indian Standard.`,
          confidence: 1.0,
          verificationStatus: "needs_review",
        });
        if (outcome === "inserted") inserted++;
        else if (outcome === "skipped_exists") skipped++;
        else rejected++;
      }
    }
  }
  return { inserted, skipped, rejected, pairs };
}

async function extractReferences(db: ReturnType<typeof getDb>) {
  const allStandards = await db.query.standards.findMany({ columns: { id: true, canonicalNumber: true } });
  const byCanonical = new Map(allStandards.map((s) => [s.canonicalNumber, s.id]));

  const allDocs = await db.query.documents.findMany({
    where: (d, { isNotNull }) => isNotNull(d.standardId),
    columns: { id: true, standardId: true },
    with: { chunks: { columns: { id: true, text: true } } },
  });

  let inserted = 0, skipped = 0, rejected = 0, mentionsFound = 0;
  for (const doc of allDocs) {
    if (!doc.standardId) continue;
    for (const chunk of doc.chunks) {
      const resolved = resolveStandardIds(chunk.text);
      for (const r of resolved) {
        const targetId = byCanonical.get(r.normalized);
        if (!targetId || targetId === doc.standardId) continue; // no fuzzy match, no self-reference
        mentionsFound++;
        const excerptStart = Math.max(0, chunk.text.indexOf(r.raw) - 80);
        const excerpt = chunk.text.slice(excerptStart, excerptStart + r.raw.length + 160).trim();
        const outcome = await insertIfValid(db, {
          sourceEntityType: "standard",
          sourceEntityId: doc.standardId,
          relationshipType: "STANDARD_REFERENCES_STANDARD",
          targetEntityType: "standard",
          targetEntityId: targetId,
          documentId: doc.id,
          evidenceText: `Chunk text names "${r.raw}" (resolved to ${r.normalized}): "...${excerpt}..."`,
          confidence: 1.0,
          verificationStatus: "needs_review",
        });
        if (outcome === "inserted") inserted++;
        else if (outcome === "skipped_exists") skipped++;
        else rejected++;
      }
    }
  }
  return { inserted, skipped, rejected, mentionsFound };
}

async function main() {
  const db = getDb();

  console.log("Extracting STANDARD_RELATED_TO_STANDARD edges (shared base identifier, sibling parts/sections)...");
  const sibling = await extractSiblingRelated(db);
  console.log(`  ${sibling.inserted} inserted, ${sibling.skipped} already present, ${sibling.rejected} rejected (of ${sibling.pairs} candidate pairs)`);

  console.log("\nExtracting STANDARD_REFERENCES_STANDARD edges (chunk text naming another real standard)...");
  const refs = await extractReferences(db);
  console.log(`  ${refs.inserted} inserted, ${refs.skipped} already present, ${refs.rejected} rejected (of ${refs.mentionsFound} exact-identifier mentions found)`);

  const totalRows = await db.query.relationships.findMany({ columns: { id: true } });
  console.log(`\nDone. ${totalRows.length} relationship row(s) total in the table.`);
  console.log("Run again any time — idempotent.");
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
