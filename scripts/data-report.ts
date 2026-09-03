/**
 * prompts/dataAcquisition.md §40 — "Data team dashboard... A CSV/JSON/
 * Markdown report is enough." Generates a plain Markdown coverage report
 * from the actual live database, never from assumed/projected numbers.
 *
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/data-report.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { standards, documents, chunks, certificationSchemes, qcos, relationships, sources } from "../src/db/schema";

async function main() {
  const db = getDb();

  const [standardRows, documentRows, chunkRows, schemeRows, qcoRows, relationshipRows, sourceRows] = await Promise.all([
    db.select().from(standards),
    db.select().from(documents),
    db.select().from(chunks),
    db.select().from(certificationSchemes),
    db.select().from(qcos),
    db.select().from(relationships),
    db.select().from(sources),
  ]);

  const verifiedStandards = standardRows.filter((s) => s.verificationStatus === "verified").length;
  const needsReviewStandards = standardRows.filter((s) => s.verificationStatus === "needs_review").length;
  const standardsWithDocuments = new Set(documentRows.map((d) => d.standardId).filter(Boolean)).size;
  const standardsWithQco = new Set(qcoRows.map((q) => q.standardId).filter(Boolean)).size;
  const verifiedRelationships = relationshipRows.filter((r) => r.verificationStatus === "verified").length;
  const needsReviewRelationships = relationshipRows.filter((r) => r.verificationStatus === "needs_review").length;

  const report = `# BIS Knowledge Graph — Coverage Report

Generated: ${new Date().toISOString()}

Every number below is a live count from the database at generation time —
none of this is projected or estimated.

## Totals

| Entity | Count |
|---|---|
| Standards | ${standardRows.length} |
| Documents (ingested, retrieval-indexed) | ${documentRows.length} |
| Chunks | ${chunkRows.length} |
| Certification schemes | ${schemeRows.length} |
| QCOs | ${qcoRows.length} |
| Relationships | ${relationshipRows.length} |
| Sources | ${sourceRows.length} |

## Verification status

| Metric | Value |
|---|---|
| Verified standards | ${verifiedStandards} / ${standardRows.length} |
| Standards needing review | ${needsReviewStandards} / ${standardRows.length} |
| Verified relationships | ${verifiedRelationships} / ${relationshipRows.length} |
| Relationships needing review | ${needsReviewRelationships} / ${relationshipRows.length} |

## Graph density (§39 — which standards are worth prioritizing next)

| Metric | Value |
|---|---|
| Standards with at least one ingested document | ${standardsWithDocuments} / ${standardRows.length} |
| Standards with at least one QCO relationship | ${standardsWithQco} / ${standardRows.length} |
| Standards with zero documents AND zero QCOs (lowest graph density) | ${standardRows.length - new Set([...documentRows.map((d) => d.standardId), ...qcoRows.map((q) => q.standardId)].filter(Boolean)).size} |

## Coverage by classification/domain

${(() => {
  const byDomain = new Map<string, number>();
  for (const s of standardRows) {
    const key = s.domain ?? "(unclassified)";
    byDomain.set(key, (byDomain.get(key) ?? 0) + 1);
  }
  return [...byDomain.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `- ${domain}: ${count}`)
    .join("\n");
})()}

## Known gaps (stated honestly, not glossed over)

- No laboratory data collected yet (\`laboratories\` table does not exist).
- No committee data collected yet.
- No amendment/revision graph populated yet — all ${standardRows.length} standards are single, undated edition records.
- Relationship count above (${relationshipRows.length}) comes from two sources: \`scripts/data-relationships.ts\` materializes structural FK-mirror edges (STANDARD_HAS_PRODUCT_MANUAL, STANDARD_SUBJECT_TO_QCO), and \`scripts/data-relationships-extract.ts\` (added P1-A, 2026-09-03) does real text-based extraction — STANDARD_RELATED_TO_STANDARD from shared base identifiers, STANDARD_REFERENCES_STANDARD from ingested chunk text naming another real standard — both kept at \`needs_review\`, never auto-verified. No amendment/supersession evidence exists in the corpus yet, so STANDARD_SUPERSEDES_STANDARD/DOCUMENT_AMENDS_DOCUMENT remain unpopulated — that is a data gap, not a missing script.
- \`data/manifests/discovered-sources.json\` contains candidate URLs found via sitemap crawling, all \`needs_review\` — none have been downloaded, confirmed, or extracted from.
`;

  const outDir = path.join(__dirname, "..", "data", "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "coverage-report.md");
  writeFileSync(outPath, report);
  console.log(report);
  console.log(`\nWritten to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
