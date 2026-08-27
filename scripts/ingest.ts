import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { embedMany } from "ai";
import { getDb } from "../src/db";
import { documents, chunks } from "../src/db/schema";
import { chunkDocument } from "../src/lib/chunk";
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
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

async function main() {
  const manifest: ManifestEntry[] = JSON.parse(
    readFileSync(path.join(SEED_DIR, "manifest.json"), "utf-8"),
  );
  const db = getDb();

  for (const entry of manifest) {
    const rawText = readFileSync(path.join(SEED_DIR, "raw", entry.file), "utf-8");
    const checksum = createHash("sha256").update(rawText).digest("hex");

    const existing = await db.query.documents.findFirst({
      where: eq(documents.standardNumber, entry.standardNumber),
      with: { chunks: { columns: { id: true }, limit: 1 } },
    });
    if (existing && existing.checksum === checksum && existing.chunks.length > 0) {
      console.log(`[skip] ${entry.standardNumber} — unchanged`);
      continue;
    }
    if (existing) {
      await db.delete(documents).where(eq(documents.id, existing.id)); // cascades to chunks
      console.log(`[update] ${entry.standardNumber} — content changed, re-ingesting`);
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
      console.warn(`[warn] ${entry.standardNumber} — no chunks produced`);
      continue;
    }

    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: structured.map((c) => c.text),
    });

    await db.insert(chunks).values(
      structured.map((c, i) => ({
        documentId: doc.id,
        section: c.section,
        clause: c.clause,
        page: c.page,
        text: c.text,
        embedding: embeddings[i],
        metadata: { standardNumber: entry.standardNumber },
      })),
    );

    console.log(`[ok] ${entry.standardNumber} — ${structured.length} chunks ingested`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
