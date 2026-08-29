/**
 * Offline experiment harness for the Q17 investigation. Runs the golden
 * query set against several candidate retrieval strategies WITHOUT
 * touching src/lib/retrieval.ts, so results can be compared before any
 * production change is made (per the milestone's Step 4/8 requirement).
 *
 * Usage: npx dotenv-cli -e .env.local -- tsx scripts/experiment-retrieval.ts
 */
import { embed } from "ai";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { embeddingModel } from "../src/lib/embedding-provider";
import { resolveStandardIds, matchesResolvedId } from "../src/lib/standards-id";

const RRF_K = 60;

interface GoldenQuery {
  id: string;
  category: string;
  query: string;
  expectedStandardIds: string[];
  requiresEvidence: boolean;
}

type Strategy = "baseline" | "title_and_or_kw" | "title_or_kw" | "title_top1_or_kw" | "or_kw_only";

async function orLexemes(db: ReturnType<typeof getDb>, query: string): Promise<string | null> {
  const result = await db.execute(sql`SELECT string_agg(lexeme, ' | ') as q FROM unnest(to_tsvector('english', ${query})) AS lexeme`);
  const row = (result.rows as unknown as Array<{ q: string | null }>)[0];
  return row?.q ?? null;
}

async function retrieve(
  db: ReturnType<typeof getDb>,
  query: string,
  strategy: Strategy,
  limit = 8,
): Promise<{ results: { chunkId: string; standard: string }[]; titleMatchedStandards: string[] }> {
  const candidatePoolSize = limit * 4;

  let semanticRows: Array<{ id: string; rank: number }> = [];
  try {
    const { embedding } = await embed({ model: embeddingModel(), value: query });
    const vectorLiteral = `[${embedding.join(",")}]`;
    const result = await db.execute(sql`
      SELECT id, row_number() OVER (ORDER BY embedding <=> ${vectorLiteral}::vector) AS rank
      FROM chunks WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector LIMIT ${candidatePoolSize}
    `);
    semanticRows = result.rows as unknown as Array<{ id: string; rank: number }>;
  } catch {
    // fall through to keyword-only
  }

  let keywordRows: Array<{ id: string; rank: number }> = [];
  if (strategy === "baseline" || strategy === "title_and_or_kw") {
    const r = await db.execute(sql`
      SELECT id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC) AS rank
      FROM chunks WHERE to_tsvector('english', text) @@ websearch_to_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC LIMIT ${candidatePoolSize}
    `);
    keywordRows = r.rows as unknown as Array<{ id: string; rank: number }>;
  }
  if (strategy === "title_or_kw" || strategy === "title_top1_or_kw" || strategy === "or_kw_only") {
    const orQ = await orLexemes(db, query);
    if (orQ) {
      const r = await db.execute(sql`
        SELECT id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', ${orQ})) DESC) AS rank
        FROM chunks WHERE to_tsvector('english', text) @@ to_tsquery('english', ${orQ})
        ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', ${orQ})) DESC LIMIT ${candidatePoolSize}
      `);
      keywordRows = r.rows as unknown as Array<{ id: string; rank: number }>;
    }
  }

  // Standard-identifier boost (unchanged from production)
  const resolvedIds = resolveStandardIds(query);
  const identifierChunkIds = new Set<string>();
  if (resolvedIds.length > 0) {
    const idMatchResult = await db.execute(sql`
      SELECT c.id, d.standard_number FROM chunks c JOIN documents d ON d.id = c.document_id WHERE d.standard_number IS NOT NULL
    `);
    for (const row of idMatchResult.rows as unknown as Array<{ id: string; standard_number: string }>) {
      if (resolvedIds.some((r) => matchesResolvedId(row.standard_number, r))) identifierChunkIds.add(row.id);
    }
  }

  // Title-matching boost: only the SINGLE best-ranked document by title
  // ts_rank gets boosted, not every document sharing any one lexeme with
  // the query — an OR-across-all-lexemes match is too permissive for a
  // 4-document corpus where common words ("water", "steel", "standard")
  // appear in most titles (measured: matched all 4 docs for 2 of 8
  // negative-bucket queries before this restriction).
  let titleChunkIds = new Set<string>();
  let titleMatchedStandards: string[] = [];
  if (strategy.startsWith("title")) {
    const orQ = await orLexemes(db, query);
    if (orQ) {
      const r = await db.execute(sql`
        SELECT d.id AS document_id, d.standard_number,
               ts_rank(to_tsvector('english', d.title), to_tsquery('english', ${orQ})) AS rank
        FROM documents d
        WHERE to_tsvector('english', d.title) @@ to_tsquery('english', ${orQ})
        ORDER BY rank DESC
        LIMIT 1
      `);
      const top = (r.rows as unknown as Array<{ document_id: string; standard_number: string; rank: number }>)[0];
      if (top) {
        titleMatchedStandards = [top.standard_number];
        const chunkRows = await db.execute(sql`SELECT id FROM chunks WHERE document_id = ${top.document_id}`);
        titleChunkIds = new Set((chunkRows.rows as unknown as Array<{ id: string }>).map((x) => x.id));
      }
    }
  }

  const fused = new Map<string, number>();
  for (const id of identifierChunkIds) fused.set(id, (fused.get(id) ?? 0) + 1 / RRF_K);
  for (const id of titleChunkIds) fused.set(id, (fused.get(id) ?? 0) + 1 / RRF_K);
  for (const row of semanticRows) fused.set(row.id, (fused.get(row.id) ?? 0) + 1 / (RRF_K + Number(row.rank)));
  for (const row of keywordRows) fused.set(row.id, (fused.get(row.id) ?? 0) + 1 / (RRF_K + Number(row.rank)));

  if (fused.size === 0) return { results: [], titleMatchedStandards };

  const topIds = [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  if (topIds.length === 0) return { results: [], titleMatchedStandards };

  const rows = await db.execute(sql`
    SELECT c.id, d.standard_number FROM chunks c JOIN documents d ON d.id = c.document_id WHERE c.id = ANY(ARRAY[${sql.join(topIds.map((id) => sql`${id}::uuid`), sql`, `)}])
  `);
  const byId = new Map((rows.rows as unknown as Array<{ id: string; standard_number: string }>).map((r) => [r.id, r.standard_number]));
  return { results: topIds.map((id) => ({ chunkId: id, standard: byId.get(id) ?? "?" })), titleMatchedStandards };
}

async function evaluate(db: ReturnType<typeof getDb>, queries: GoldenQuery[], strategy: Strategy) {
  let hits = 0;
  let totalWithExpectation = 0;
  let correctEmpty = 0;
  let totalExpectEmpty = 0;
  const failures: string[] = [];
  const falseTitleMatches: string[] = [];

  for (const q of queries) {
    const { results, titleMatchedStandards } = await retrieve(db, q.query, strategy, 5);
    const topStandards = [...new Set(results.map((r) => r.standard))];
    if (q.expectedStandardIds.length > 0) {
      totalWithExpectation++;
      const found = q.expectedStandardIds.every((id) => topStandards.includes(id));
      if (found) hits++;
      else failures.push(`${q.id} (expected ${q.expectedStandardIds.join(",")}, got ${topStandards.join(",")})`);
    } else {
      totalExpectEmpty++;
      // A title match on a query that expects NO standard at all (fabricated
      // id, out-of-corpus product, prompt injection) would be a genuine
      // false positive introduced by this new signal — check for it
      // explicitly rather than assuming the boost is always safe.
      if (titleMatchedStandards.length === 0) correctEmpty++;
      else falseTitleMatches.push(`${q.id} (query="${q.query}", title-matched=${titleMatchedStandards.join(",")})`);
    }
  }
  return {
    strategy,
    recall: `${hits}/${totalWithExpectation}`,
    negative: `${correctEmpty}/${totalExpectEmpty}`,
    failures,
    falseTitleMatches,
  };
}

async function main() {
  const queries: GoldenQuery[] = JSON.parse(
    readFileSync(path.join(__dirname, "..", "data", "evaluation", "golden-queries.json"), "utf-8"),
  );
  const db = getDb();

  for (const strategy of ["or_kw_only", "title_top1_or_kw"] as Strategy[]) {
    const result = await evaluate(db, queries, strategy);
    console.log(`\n=== ${strategy} ===`);
    console.log(`Recall: ${result.recall}`);
    console.log(`Negative (no false title match): ${result.negative}`);
    if (result.failures.length > 0) console.log("Recall failures:", result.failures);
    if (result.falseTitleMatches.length > 0) console.log("False title matches:", result.falseTitleMatches);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
