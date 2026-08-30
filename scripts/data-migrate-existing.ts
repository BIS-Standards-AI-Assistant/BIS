/**
 * Migrates already-verified data into the new knowledge-graph schema
 * (src/db/schema.ts: standards, sources, certification_schemes, qcos).
 *
 * This is NOT new data collection — everything here is already real and
 * already fact-checked:
 *   - data/bis-standards-dataset/qco-standards.json (22 entries, each with
 *     its own verification_status and source_url — see that directory's
 *     README for the correction history)
 *   - the documents already ingested into the retrieval index
 *     (scripts/ingest.ts's output, 4 real seed standards)
 *
 * This script only re-homes those already-verified facts into the
 * structured tables so the rest of the knowledge-graph pipeline
 * (relationships, laboratories, etc.) has a real `standards` table to
 * point at, instead of starting from zero.
 *
 * Idempotent: safe to re-run. Standards are upserted by canonicalNumber;
 * certification schemes and QCOs are only inserted if an equivalent row
 * doesn't already exist.
 *
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/data-migrate-existing.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import { getDb } from "../src/db";
import { standards, sources, certificationSchemes, qcos, documents } from "../src/db/schema";
import { resolveStandardIds } from "../src/lib/standards-id";

interface QcoEntry {
  is_number: string;
  title?: string;
  category?: string;
  scheme?: string;
  mandatory_qco?: boolean;
  scope_summary?: string;
  certification_route?: string;
  verification_status?: string;
  source_url?: string;
  retrieved_at?: string;
}

export function normalizedNumberOf(canonicalNumber: string): string {
  const [resolved] = resolveStandardIds(canonicalNumber);
  return resolved?.number ?? canonicalNumber.replace(/\D/g, "");
}

async function upsertStandard(db: ReturnType<typeof getDb>, entry: QcoEntry) {
  const canonicalNumber = entry.is_number;
  const existing = await db.query.standards.findFirst({ where: eq(standards.canonicalNumber, canonicalNumber) });
  if (existing) {
    console.log(`  standard already present: ${canonicalNumber}`);
    return existing.id;
  }

  const [row] = await db
    .insert(standards)
    .values({
      canonicalNumber,
      normalizedNumber: normalizedNumberOf(canonicalNumber),
      title: entry.title ?? null,
      status: null, // never inferred — the qco dataset does not carry a reliable current-status field
      technicalDepartment: null,
      classification: entry.category ?? null,
      domain: entry.category ?? null,
      sourceUrl: entry.source_url ?? null,
      lastVerifiedAt: entry.retrieved_at ? new Date(entry.retrieved_at) : null,
      verificationStatus: entry.verification_status === "verified_accurate" || entry.verification_status === "corrected" ? "verified" : "needs_review",
    })
    .returning({ id: standards.id });
  console.log(`  inserted standard: ${canonicalNumber}`);
  return row.id;
}

async function upsertSource(db: ReturnType<typeof getDb>, entry: QcoEntry): Promise<string | null> {
  if (!entry.source_url) return null;
  const existing = await db.query.sources.findFirst({ where: eq(sources.url, entry.source_url) });
  if (existing) return existing.id;

  let domain = "bis.gov.in";
  try {
    domain = new URL(entry.source_url).hostname;
  } catch {
    // keep default
  }
  const [row] = await db
    .insert(sources)
    .values({
      url: entry.source_url,
      domain,
      documentType: "product_manual",
      title: entry.title ?? null,
      verificationStatus: entry.verification_status === "verified_accurate" || entry.verification_status === "corrected" ? "verified" : "needs_review",
    })
    .returning({ id: sources.id });
  return row.id;
}

async function upsertCertificationScheme(db: ReturnType<typeof getDb>, entry: QcoEntry, sourceId: string | null) {
  if (!entry.scheme) return;
  const existing = await db.query.certificationSchemes.findFirst({ where: eq(certificationSchemes.schemeCode, entry.scheme) });
  if (existing) return;

  await db.insert(certificationSchemes).values({
    schemeCode: entry.scheme,
    name: entry.scheme,
    description: entry.certification_route ?? null,
    sourceId,
    verificationStatus: "verified", // this scheme name is drawn directly from a fact-checked entry's own field, not inferred
  });
  console.log(`  inserted certification scheme: ${entry.scheme}`);
}

async function upsertQco(db: ReturnType<typeof getDb>, entry: QcoEntry, standardId: string, sourceId: string | null) {
  if (!entry.mandatory_qco) return; // absence of a QCO row IS the "voluntary" signal — see schema.ts's qcos table doc comment
  const existing = await db.query.qcos.findFirst({ where: and(eq(qcos.standardId, standardId)) });
  if (existing) return;

  await db.insert(qcos).values({
    title: `Mandatory QCO for ${entry.is_number}`,
    standardId,
    applicability: entry.category ?? null,
    mandatory: true,
    sourceId,
    verificationStatus: entry.verification_status === "verified_accurate" || entry.verification_status === "corrected" ? "verified" : "needs_review",
  });
  console.log(`  inserted QCO for: ${entry.is_number}`);
}

/**
 * For each already-ingested document (scripts/ingest.ts's real output —
 * not new data), either link it to an existing `standards` row or create
 * one from the document's own already-verified metadata. This is not
 * fabrication: `documents` rows only exist because they were already
 * ingested and validated by the existing pipeline (checksum, real
 * source_url, etc.) — this just gives them a master `standards` record
 * too, the same as the qco-standards.json entries above.
 */
async function linkExistingDocuments(db: ReturnType<typeof getDb>) {
  const docs = await db.query.documents.findMany();
  let linked = 0;
  let created = 0;
  for (const doc of docs) {
    if (!doc.standardNumber || doc.standardId) continue;

    let target = await db.query.standards.findFirst({ where: eq(standards.canonicalNumber, doc.standardNumber) });
    if (!target) {
      const [row] = await db
        .insert(standards)
        .values({
          canonicalNumber: doc.standardNumber,
          normalizedNumber: normalizedNumberOf(doc.standardNumber),
          title: doc.title,
          classification: doc.documentType,
          sourceUrl: doc.sourceUrl,
          lastVerifiedAt: doc.retrievedAt,
          verificationStatus: "verified", // this document already went through the existing ingest pipeline's checksum/source validation
        })
        .returning();
      target = row;
      created++;
      console.log(`  created standard from ingested document: ${doc.standardNumber}`);
    }

    await db.update(documents).set({ standardId: target.id }).where(eq(documents.id, doc.id));
    linked++;
    console.log(`  linked document ${doc.standardNumber} -> standards.id ${target.id}`);
  }
  return { linked, created };
}

async function main() {
  const db = getDb();
  const filePath = path.join(__dirname, "..", "data", "bis-standards-dataset", "qco-standards.json");
  const entries: QcoEntry[] = JSON.parse(readFileSync(filePath, "utf-8"));

  console.log(`Migrating ${entries.length} fact-checked entries from qco-standards.json...`);
  for (const entry of entries) {
    if (!entry.is_number) continue;
    const sourceId = await upsertSource(db, entry);
    const standardId = await upsertStandard(db, entry);
    await upsertCertificationScheme(db, entry, sourceId);
    await upsertQco(db, entry, standardId, sourceId);
  }

  console.log("\nLinking already-ingested documents to their standard master record...");
  const { linked, created } = await linkExistingDocuments(db);

  const allStandards = await db.query.standards.findMany({ columns: { id: true } });
  console.log(
    `\nDone. ${allStandards.length} standard(s) total in the table, ${linked} document(s) linked this run (${created} new standard(s) created from ingested documents).`,
  );
  console.log("Run again any time — every step above is idempotent.");
  process.exit(0);
}

// Guarded so scripts/data-migrate-existing.test.ts can import the pure
// normalizedNumberOf() helper without connecting to the database.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
