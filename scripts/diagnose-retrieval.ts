/**
 * Diagnostic script for the Q17 retrieval investigation. Not part of the
 * application — mirrors retrieval.ts's logic step by step with full
 * intermediate output, so the semantic/keyword/RRF contribution of every
 * candidate chunk is visible instead of only the final fused ranking.
 *
 * Usage: npx dotenv-cli -e .env.local -- tsx scripts/diagnose-retrieval.ts "<query>"
 */
import { embed } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { embeddingModel } from "../src/lib/providers";

const RRF_K = 60;

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Usage: tsx scripts/diagnose-retrieval.ts \"<query>\"");
    process.exit(1);
  }
  console.log(`Query: ${JSON.stringify(query)}\n`);

  const db = getDb();
  const limit = 8;
  const candidatePoolSize = limit * 4;

  const { embedding } = await embed({ model: embeddingModel(), value: query });
  const vectorLiteral = `[${embedding.join(",")}]`;
  const semanticResult = await db.execute(sql`
    SELECT c.id, d.standard_number, row_number() OVER (ORDER BY c.embedding <=> ${vectorLiteral}::vector) AS rank,
           1 - (c.embedding <=> ${vectorLiteral}::vector) AS cosine_sim
    FROM chunks c JOIN documents d ON d.id = c.document_id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${candidatePoolSize}
  `);
  const semanticRows = semanticResult.rows as unknown as Array<{
    id: string; standard_number: string; rank: number; cosine_sim: number;
  }>;

  const keywordResult = await db.execute(sql`
    SELECT c.id, d.standard_number,
           row_number() OVER (ORDER BY ts_rank(to_tsvector('english', c.text), websearch_to_tsquery('english', ${query})) DESC) AS rank,
           ts_rank(to_tsvector('english', c.text), websearch_to_tsquery('english', ${query})) AS ts_score
    FROM chunks c JOIN documents d ON d.id = c.document_id
    WHERE to_tsvector('english', c.text) @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(to_tsvector('english', c.text), websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${candidatePoolSize}
  `);
  const keywordRows = keywordResult.rows as unknown as Array<{
    id: string; standard_number: string; rank: number; ts_score: number;
  }>;

  console.log(`Semantic candidates: ${semanticRows.length}`);
  console.log(`Keyword candidates (FTS match): ${keywordRows.length}\n`);

  const fused = new Map<string, {
    standard: string; rrf: number; semRank?: number; semSim?: number; kwRank?: number; kwScore?: number;
  }>();
  for (const row of semanticRows) {
    const e = fused.get(row.id) ?? { standard: row.standard_number, rrf: 0 };
    e.rrf += 1 / (RRF_K + Number(row.rank));
    e.semRank = Number(row.rank);
    e.semSim = Number(row.cosine_sim);
    fused.set(row.id, e);
  }
  for (const row of keywordRows) {
    const e = fused.get(row.id) ?? { standard: row.standard_number, rrf: 0 };
    e.rrf += 1 / (RRF_K + Number(row.rank));
    e.kwRank = Number(row.rank);
    e.kwScore = Number(row.ts_score);
    fused.set(row.id, e);
  }

  const ranked = [...fused.entries()].sort((a, b) => b[1].rrf - a[1].rrf);

  console.log("Full fused ranking (all candidates, before top-8 slice):");
  console.log(
    ranked
      .map(([id, e], i) => ({
        rank: i + 1,
        standard: e.standard,
        chunk: id.slice(0, 8),
        semRank: e.semRank ?? "-",
        cosineSim: e.semSim?.toFixed(4) ?? "-",
        kwRank: e.kwRank ?? "-",
        tsScore: e.kwScore?.toFixed(5) ?? "-",
        rrf: e.rrf.toFixed(5),
      }))
      .slice(0, 20),
  );

  // Per-standard aggregate: how many candidate chunks does each standard
  // contribute to the fused pool, and what's its best single-chunk RRF?
  const byStandard = new Map<string, { count: number; bestRrf: number; totalRrf: number }>();
  for (const [, e] of ranked) {
    const s = byStandard.get(e.standard) ?? { count: 0, bestRrf: 0, totalRrf: 0 };
    s.count++;
    s.bestRrf = Math.max(s.bestRrf, e.rrf);
    s.totalRrf += e.rrf;
    byStandard.set(e.standard, s);
  }
  console.log("\nPer-standard contribution to the candidate pool:");
  console.log(
    [...byStandard.entries()].map(([standard, s]) => ({
      standard,
      candidateChunks: s.count,
      bestChunkRrf: s.bestRrf.toFixed(5),
      totalRrf: s.totalRrf.toFixed(5),
    })),
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
