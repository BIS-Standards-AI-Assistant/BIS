/**
 * Review queue for user-submitted feedback (src/app/api/v1/feedback/route.ts)
 * — the human gate between raw corrections and the ML training set.
 *
 * prompts/final.md §6 forbids training directly from unreviewed feedback,
 * so `npm run feedback -- promote` is the only path that appends a row to
 * data/ml/datasets/query_document_relevance.jsonl, and it requires a human
 * to supply the 0/1/2 relevance label — it is never inferred from the
 * submitter's free-text reason.
 *
 * Deliberately a SCRIPT, not an HTTP endpoint — same reasoning as
 * scripts/corpus-admin.ts: this app has no authentication, so promoting
 * feedback into the training set (an action that shapes a future model)
 * needs shell access to the deployment's credentials, not an open route.
 *
 * Usage:
 *   npm run feedback -- list
 *   npm run feedback -- show <id>
 *   npm run feedback -- promote <id> --label 0 --category hard_negative
 *   npm run feedback -- reject <id>
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { feedback } from "../src/db/schema";

const DATASET_PATH = path.join(__dirname, "..", "data", "ml", "datasets", "query_document_relevance.jsonl");
const GUIDELINE_VERSION = "1.0"; // matches the existing entry in query_document_relevance.jsonl

const LABEL_NAMES: Record<number, string> = {
  0: "irrelevant",
  1: "related",
  2: "directly_answers",
};

async function listPending() {
  const db = getDb();
  const rows = await db.query.feedback.findMany({
    where: eq(feedback.reviewStatus, "pending"),
    orderBy: [desc(feedback.createdAt)],
  });

  if (rows.length === 0) {
    console.log("No pending feedback.");
    return;
  }
  console.log(`${rows.length} pending feedback item(s):\n`);
  for (const row of rows) {
    console.log(`  ${row.id}`);
    console.log(`    query: "${row.query}"`);
    console.log(`    standard: ${row.standardNumber}${row.standardTitle ? ` — ${row.standardTitle}` : ""}`);
    console.log(`    reason: ${row.reason}${row.comment ? ` — "${row.comment}"` : ""}`);
    console.log(`    submitted: ${row.createdAt.toISOString()}`);
  }
}

async function show(id: string) {
  const db = getDb();
  const row = await db.query.feedback.findFirst({ where: eq(feedback.id, id) });
  if (!row) {
    console.error(`No feedback with id "${id}".`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(row, null, 2));
}

function parseFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function promote(id: string, args: string[]) {
  const db = getDb();
  const row = await db.query.feedback.findFirst({ where: eq(feedback.id, id) });
  if (!row) {
    console.error(`No feedback with id "${id}".`);
    process.exitCode = 1;
    return;
  }
  if (row.reviewStatus !== "pending") {
    console.error(`Feedback ${id} is already "${row.reviewStatus}", not pending.`);
    process.exitCode = 1;
    return;
  }

  const labelRaw = parseFlag(args, "--label");
  const category = parseFlag(args, "--category");
  if (labelRaw === undefined || !["0", "1", "2"].includes(labelRaw)) {
    console.error('promote needs --label 0|1|2 (0=irrelevant, 1=related, 2=directly_answers).');
    process.exitCode = 1;
    return;
  }
  if (!category) {
    console.error("promote needs --category <short-slug>, e.g. hard_negative, applicability_gap, missing_evidence.");
    process.exitCode = 1;
    return;
  }
  const label = Number(labelRaw);
  const reviewedBy = parseFlag(args, "--by") ?? process.env.USER ?? process.env.USERNAME ?? "unknown";

  const datasetEntry = {
    query: row.query,
    candidate_standard: row.standardNumber,
    candidate_title: row.standardTitle ?? null,
    label,
    label_name: LABEL_NAMES[label],
    reason: row.reason,
    category,
    annotator: "human",
    source: "user_feedback",
    created_at: new Date().toISOString().slice(0, 10),
    guideline_version: GUIDELINE_VERSION,
    notes: row.comment ?? null,
  };

  mkdirSync(path.dirname(DATASET_PATH), { recursive: true });
  if (!existsSync(DATASET_PATH)) {
    console.error(`Expected existing dataset at ${DATASET_PATH} — not found. Aborting rather than silently creating a new one.`);
    process.exitCode = 1;
    return;
  }
  appendFileSync(DATASET_PATH, JSON.stringify(datasetEntry) + "\n");

  await db
    .update(feedback)
    .set({
      reviewStatus: "promoted",
      reviewedLabel: label,
      reviewedCategory: category,
      reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(feedback.id, id));

  console.log(`Promoted ${id} -> ${DATASET_PATH} (label=${label} ${LABEL_NAMES[label]}, category=${category}).`);
}

async function reject(id: string, args: string[]) {
  const db = getDb();
  const row = await db.query.feedback.findFirst({ where: eq(feedback.id, id) });
  if (!row) {
    console.error(`No feedback with id "${id}".`);
    process.exitCode = 1;
    return;
  }
  const reviewedBy = parseFlag(args, "--by") ?? process.env.USER ?? process.env.USERNAME ?? "unknown";
  await db
    .update(feedback)
    .set({ reviewStatus: "rejected", reviewedBy, reviewedAt: new Date() })
    .where(eq(feedback.id, id));
  console.log(`Rejected ${id}.`);
}

function usage() {
  console.log(
    [
      "Feedback review queue",
      "",
      "  npm run feedback -- list                                    Show pending feedback",
      "  npm run feedback -- show <id>                               Show one feedback item in full",
      "  npm run feedback -- promote <id> --label 0|1|2 --category X Append to the ML dataset as a reviewed label",
      "  npm run feedback -- reject <id>                             Mark as reviewed but not usable",
      "",
      "label: 0=irrelevant, 1=related, 2=directly_answers (query_document_relevance.jsonl's scale).",
    ].join("\n"),
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — there is no feedback queue to administer.");
    process.exit(1);
  }

  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "list":
      await listPending();
      break;
    case "show":
      if (!rest[0]) return usage();
      await show(rest[0]);
      break;
    case "promote":
      if (!rest[0]) return usage();
      await promote(rest[0], rest.slice(1));
      break;
    case "reject":
      if (!rest[0]) return usage();
      await reject(rest[0], rest.slice(1));
      break;
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
