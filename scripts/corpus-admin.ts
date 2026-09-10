/**
 * PRD FR12 — "Provide a way to add/update/remove documents from the index
 * (script or minimal admin endpoint, not a full CMS for the hackathon)."
 *
 * `npm run ingest` already covers add and update: it inserts new manifest
 * entries and re-ingests changed ones by sha256 checksum. What it has no
 * path for is REMOVE — a document ingested by mistake, withdrawn by BIS,
 * or dropped from the manifest stays in the index forever, and keeps being
 * retrievable and citable. That is the gap this script closes, along with
 * the inspection commands you need to decide what to remove.
 *
 * Deliberately a SCRIPT, not an HTTP endpoint. The PRD allows either, and
 * this app has no authentication: an unauthenticated route that can delete
 * indexed documents would be a far worse defect than the gap it fixes.
 * Running this needs shell access to the deployment's credentials.
 *
 * Usage:
 *   npm run corpus -- list
 *   npm run corpus -- orphans
 *   npm run corpus -- remove "IS 15450:2004"
 *   npm run corpus -- remove "IS 15450:2004" --yes
 *
 * `remove` prints what it is about to delete and requires confirmation;
 * `--yes` skips the prompt for non-interactive use. Deleting a document
 * cascades to its chunks (see the onDelete: "cascade" on chunks.documentId
 * in src/db/schema.ts), so no orphaned chunks or embeddings are left.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { documents } from "../src/db/schema";

interface ManifestEntry {
  standardNumber: string;
  title: string;
}

const SEED_DIR = path.join(__dirname, "..", "data", "seed");

function manifestStandardNumbers(): Set<string> {
  const manifestPath = path.join(SEED_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return new Set();
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));
  return new Set(manifest.map((m) => m.standardNumber));
}

async function listDocuments() {
  const db = getDb();
  const rows = await db.query.documents.findMany({
    with: { chunks: { columns: { id: true } } },
  });
  rows.sort((a, b) => (a.standardNumber ?? "").localeCompare(b.standardNumber ?? ""));

  console.log(`${rows.length} document(s) indexed\n`);
  for (const doc of rows) {
    const withEmbeddings = await db.execute(
      sql`SELECT count(*)::int AS n FROM chunks WHERE document_id = ${doc.id} AND embedding IS NOT NULL`,
    );
    const embedded = (withEmbeddings.rows as unknown as Array<{ n: number }>)[0]?.n ?? 0;
    console.log(`  ${(doc.standardNumber ?? "(no standard number)").padEnd(24)} ${doc.chunks.length} chunks (${embedded} embedded)`);
    console.log(`    ${doc.title}`);
    console.log(`    id=${doc.id}  source=${doc.sourceOrg}  ingested=${doc.createdAt.toISOString().slice(0, 10)}`);
  }
}

/**
 * Documents in the index that no longer appear in the seed manifest —
 * i.e. exactly the set `npm run ingest` can never clean up on its own,
 * because it only ever walks forward from the manifest. Reported, never
 * auto-deleted: a document can legitimately be indexed from outside the
 * seed manifest, so this is a review list, not a delete queue.
 */
async function listOrphans() {
  const db = getDb();
  const inManifest = manifestStandardNumbers();
  const rows = await db.query.documents.findMany();
  const orphans = rows.filter((d) => !d.standardNumber || !inManifest.has(d.standardNumber));

  if (inManifest.size === 0) {
    console.log("No seed manifest found — cannot determine which documents are orphaned.");
    return;
  }
  if (orphans.length === 0) {
    console.log(`All ${rows.length} indexed document(s) are present in the seed manifest.`);
    return;
  }
  console.log(`${orphans.length} of ${rows.length} indexed document(s) are not in the seed manifest:\n`);
  for (const doc of orphans) {
    console.log(`  ${doc.standardNumber ?? "(no standard number)"} — ${doc.title}`);
  }
  console.log(
    "\nThese are not necessarily wrong: a document can be indexed from outside the\n" +
      "seed manifest. Review each one, then remove with:\n" +
      '  npm run corpus -- remove "<standard number>"',
  );
}

async function removeDocument(standardNumber: string, skipPrompt: boolean) {
  const db = getDb();
  const doc = await db.query.documents.findFirst({
    where: eq(documents.standardNumber, standardNumber),
    with: { chunks: { columns: { id: true } } },
  });

  if (!doc) {
    console.error(`No indexed document with standard number "${standardNumber}".`);
    console.error("Run `npm run corpus -- list` to see what is indexed.");
    process.exitCode = 1;
    return;
  }

  console.log("About to permanently remove from the index:\n");
  console.log(`  ${doc.standardNumber}`);
  console.log(`  ${doc.title}`);
  console.log(`  ${doc.chunks.length} chunk(s), including their embeddings`);
  console.log(`  id=${doc.id}\n`);
  console.log("After this, the document cannot be retrieved or cited until it is re-ingested.");

  if (!skipPrompt) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nType the standard number again to confirm: `);
    rl.close();
    if (answer.trim() !== standardNumber) {
      console.log("Confirmation did not match. Nothing was removed.");
      process.exitCode = 1;
      return;
    }
  }

  await db.delete(documents).where(eq(documents.id, doc.id));
  console.log(`\nRemoved ${doc.standardNumber} and its ${doc.chunks.length} chunk(s).`);
  console.log(
    "Note: if this document is still listed in data/seed/manifest.json, the next\n" +
      "`npm run ingest` will index it again. Remove the manifest entry too if the\n" +
      "removal is meant to be permanent.",
  );
}

function usage() {
  console.log(
    [
      "Corpus admin (PRD FR12)",
      "",
      "  npm run corpus -- list                          Show every indexed document and its chunk counts",
      "  npm run corpus -- orphans                       Show indexed documents no longer in the seed manifest",
      '  npm run corpus -- remove "IS 15450:2004"        Remove a document and its chunks (prompts to confirm)',
      '  npm run corpus -- remove "IS 15450:2004" --yes  Remove without the prompt',
      "",
      "Add and update are handled by `npm run ingest`, which inserts new manifest",
      "entries and re-ingests any whose content checksum changed.",
    ].join("\n"),
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — there is no index to administer.");
    process.exit(1);
  }

  const [command, ...rest] = process.argv.slice(2);
  const skipPrompt = rest.includes("--yes");
  const args = rest.filter((a) => a !== "--yes");

  switch (command) {
    case "list":
      await listDocuments();
      break;
    case "orphans":
      await listOrphans();
      break;
    case "remove": {
      const standardNumber = args[0];
      if (!standardNumber) {
        console.error('remove needs a standard number, e.g. remove "IS 15450:2004"');
        process.exit(1);
      }
      await removeDocument(standardNumber, skipPrompt);
      break;
    }
    default:
      usage();
      if (command) process.exitCode = 1;
  }
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
