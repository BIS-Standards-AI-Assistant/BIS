import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { embedMany } from "ai";
import { getDb } from "../src/db";
import { documents, chunks } from "../src/db/schema";
import { chunkDocument } from "../src/lib/chunk";
import { embeddingModel, activeProvider } from "../src/lib/providers";
import { eq } from "drizzle-orm";

interface ManifestEntry {
  file: string;
  standardNumber: string;
  title: string;
  documentType: string;
  sourceUrl: string;
  sourceOrg: string;
  version: string;
  publicationDate: string;
  retrievedAt: string;
}

const SEED_DIR = path.join(__dirname, "..", "data", "seed");

async function main() {
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(path.join(SEED_DIR, "manifest.json"), "utf-8"),
  );
  const db = getDb();
  console.log(`Embedding provider: ${activeProvider}`);
  console.log(`Ingesting ${manifest.length} document(s)\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const label = `[${i + 1}/${manifest.length}] ${entry.standardNumber}`;

    try {
      const rawText = readFileSync(path.join(SEED_DIR, "raw", entry.file), "utf-8");
      const checksum = createHash("sha256").update(rawText).digest("hex");

      const existing = await db.query.documents.findFirst({
        where: eq(documents.standardNumber, entry.standardNumber),
        with: { chunks: { columns: { id: true }, limit: 1 } },
      });
      if (existing && existing.checksum === checksum && existing.chunks.length > 0) {
        console.log(`${label} — unchanged, skipped`);
        skipped++;
        continue;
      }
      if (existing) {
        await db.delete(documents).where(eq(documents.id, existing.id)); // cascades to chunks
        console.log(`${label} — content changed, re-ingesting`);
      }

      const [doc] = await db
        .insert(documents)
        .values({
          standardNumber: entry.standardNumber,
          title: entry.title,
          documentType: entry.documentType,
          sourceUrl: entry.sourceUrl,
          sourceOrg: entry.sourceOrg,
          version: entry.version,
          publicationDate: entry.publicationDate,
          retrievedAt: new Date(entry.retrievedAt),
          checksum,
        })
        .returning();

      const structured = chunkDocument(rawText);
      if (structured.length === 0) {
        console.warn(`${label} — no chunks produced from text, skipping embedding step`);
        failed++;
        continue;
      }
      console.log(`${label} — extracted ${structured.length} chunks, embedding...`);

      const { embeddings } = await embedMany({
        model: embeddingModel(),
        values: structured.map((c) => c.text),
      });

      await db.insert(chunks).values(
        structured.map((c, idx) => ({
          documentId: doc.id,
          section: c.section,
          clause: c.clause,
          page: c.page,
          text: c.text,
          embedding: embeddings[idx],
          metadata: { standardNumber: entry.standardNumber },
        })),
      );

      console.log(`${label} — inserted ${structured.length} chunks with embeddings — status: success`);
      ok++;
    } catch (err) {
      // A failed document must not abort the run or corrupt documents
      // already committed — each entry is its own transaction boundary via
      // the insert calls above, so a failure here just leaves this one
      // document absent/partial and moves on to the next.
      console.error(`${label} — status: FAILED — ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed} / total=${manifest.length}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
