import { embed } from "ai";
import { sql, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { chunks } from "@/db/schema";
import { resolveStandardIds, matchesResolvedId } from "./standards-id";
import { embeddingModel } from "./providers";

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
  identifierMatch: boolean;
  score: number;
}


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
    const { embedding } = await embed({ model: embeddingModel(), value: query });
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

  // Standards Identifier Resolver: if the query names a specific IS number
  // ("IS 5522:2014", "5522:2014", "IS 302 Part 2/Sec 6"), find chunks whose
  // document actually carries a matching standard_number and treat them as
  // rank-1 hits in a third ranking list fused into RRF below. This is a
  // deterministic, no-LLM signal — it works even when the AI Gateway is
  // unavailable, and it never invents a match: matchesResolvedId only
  // returns true when the resolved number/part/section/year are all
  // present in the candidate's actual standard_number string.
  const resolvedIds = resolveStandardIds(query);
  const identifierChunkIds = new Set<string>();
  if (resolvedIds.length > 0) {
    const idMatchResult = await db.execute(sql`
      SELECT c.id, d.standard_number
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE d.standard_number IS NOT NULL
    `);
    for (const row of idMatchResult.rows as unknown as Array<{ id: string; standard_number: string }>) {
      if (resolvedIds.some((r) => matchesResolvedId(row.standard_number, r))) {
        identifierChunkIds.add(row.id);
      }
    }
  }

  const fused = new Map<string, { rrf: number; semRank?: number; kwRank?: number }>();
  for (const id of identifierChunkIds) {
    const entry = fused.get(id) ?? { rrf: 0 };
    entry.rrf += 1 / RRF_K; // equivalent to a rank-1 hit in its own ranking list
    fused.set(id, entry);
  }
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

  // Fetched via the query builder's inArray + relation, not a raw
  // `= ANY(${array})` SQL template: the neon-http driver expands a JS
  // array into individual $1, $2, ... parameters, which makes
  // `ANY(($1, $2, ...))` a tuple rather than a Postgres array and fails
  // with "op ANY/ALL (array) requires array on right side" — a bug that
  // only surfaced once real chunk ids existed to retrieve.
  const rows = await db.query.chunks.findMany({
    where: inArray(chunks.id, topIds),
    with: { document: true },
  });

  const byId = new Map(rows.map((r) => [r.id, r]));

  return topIds
    .map((id) => {
      const row = byId.get(id);
      const fusion = fused.get(id)!;
      if (!row) return null;
      return {
        chunkId: id,
        documentId: row.documentId,
        standardNumber: row.document.standardNumber,
        title: row.document.title,
        sourceUrl: row.document.sourceUrl,
        section: row.section,
        clause: row.clause,
        page: row.page,
        text: row.text,
        semanticScore: fusion.semRank ? 1 / fusion.semRank : 0,
        keywordScore: fusion.kwRank ? 1 / fusion.kwRank : 0,
        identifierMatch: identifierChunkIds.has(id),
        score: fusion.rrf,
      } satisfies RetrievedChunk;
    })
    .filter((r): r is RetrievedChunk => r !== null);
}
