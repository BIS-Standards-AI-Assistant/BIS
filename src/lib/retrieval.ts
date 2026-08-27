import { embed } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  standardNumber: string | null;
  title: string;
  sourceUrl: string;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  semanticScore: number;
  keywordScore: number;
  score: number;
}

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// Reciprocal Rank Fusion — combines the semantic and keyword rankings
// without needing scores on a common scale. See AGENTS.md sec 11.
const RRF_K = 60;

/**
 * Hybrid retrieval: semantic search over embeddings (pgvector cosine
 * distance) fused with keyword search (Postgres full-text ts_rank) via
 * reciprocal rank fusion. Falls back to keyword-only if embedding fails.
 */
export async function retrieveChunks(
  query: string,
  { limit = 8 }: { limit?: number } = {},
): Promise<RetrievedChunk[]> {
  const db = getDb();
  const candidatePoolSize = limit * 4;

  let semanticRows: Array<{ id: string; rank: number }> = [];
  try {
    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: query });
    const vectorLiteral = `[${embedding.join(",")}]`;
    const result = await db.execute(sql`
      SELECT id, row_number() OVER (ORDER BY embedding <=> ${vectorLiteral}::vector) AS rank
      FROM chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${candidatePoolSize}
    `);
    semanticRows = result.rows as unknown as Array<{ id: string; rank: number }>;
  } catch (err) {
    console.error("[retrieval] semantic search failed, falling back to keyword-only", err);
  }

  const keywordResult = await db.execute(sql`
    SELECT id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC) AS rank
    FROM chunks
    WHERE to_tsvector('english', text) @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${candidatePoolSize}
  `);
  const keywordRows = keywordResult.rows as unknown as Array<{ id: string; rank: number }>;

  const fused = new Map<string, { rrf: number; semRank?: number; kwRank?: number }>();
  for (const row of semanticRows) {
    const entry = fused.get(row.id) ?? { rrf: 0 };
    entry.rrf += 1 / (RRF_K + Number(row.rank));
    entry.semRank = Number(row.rank);
    fused.set(row.id, entry);
  }
  for (const row of keywordRows) {
    const entry = fused.get(row.id) ?? { rrf: 0 };
    entry.rrf += 1 / (RRF_K + Number(row.rank));
    entry.kwRank = Number(row.rank);
    fused.set(row.id, entry);
  }

  if (fused.size === 0) return [];

  const topIds = [...fused.entries()]
    .sort((a, b) => b[1].rrf - a[1].rrf)
    .slice(0, limit)
    .map(([id]) => id);

  const rows = await db.execute(sql`
    SELECT
      c.id AS chunk_id, c.document_id, c.section, c.clause, c.page, c.text,
      d.standard_number, d.title, d.source_url
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.id = ANY(${topIds})
  `);

  const byId = new Map(
    (rows.rows as unknown as Array<Record<string, unknown>>).map((r) => [
      r.chunk_id as string,
      r,
    ]),
  );

  return topIds
    .map((id) => {
      const row = byId.get(id);
      const fusion = fused.get(id)!;
      if (!row) return null;
      return {
        chunkId: id,
        documentId: row.document_id as string,
        standardNumber: row.standard_number as string | null,
        title: row.title as string,
        sourceUrl: row.source_url as string,
        section: row.section as string | null,
        clause: row.clause as string | null,
        page: row.page as number | null,
        text: row.text as string,
        semanticScore: fusion.semRank ? 1 / fusion.semRank : 0,
        keywordScore: fusion.kwRank ? 1 / fusion.kwRank : 0,
        score: fusion.rrf,
      } satisfies RetrievedChunk;
    })
    .filter((r): r is RetrievedChunk => r !== null);
}
