import fs from "fs";
import path from "path";
import { embed } from "ai";
import { sql, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { chunks } from "@/db/schema";
import { chunkDocument } from "./chunk";
import { resolveStandardIds, matchesResolvedId } from "./standards-id";
import { embeddingModel } from "./embedding-provider";
import { documentDiversityReranker } from "./ml/reranker";
import type { Reranker, RetrievalCandidate } from "./ml/types";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  standardNumber: string | null;
  title: string;
  sourceUrl: string;
  sourceOrg: string;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  semanticScore: number;
  keywordScore: number;
  identifierMatch: boolean;
  score: number;
  /** Deterministic rerank explanation from the ML layer (src/lib/ml) */
  rerankReason: string;
}

interface ManifestItem {
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

interface SeedChunkItem {
  id: string;
  doc: ManifestItem;
  section: string | null;
  clause: string | null;
  text: string;
}

/**
 * Same slug format the Standard Passport page (src/app/standards/[id]/
 * page.tsx) uses to match a URL id against a seed manifest entry when the
 * database is unreachable. Kept in one place so a seed-fallback link
 * generated here always resolves there.
 */
export function slugifyStandardNumber(standardNumber: string): string {
  return standardNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

let cachedSeedChunks: SeedChunkItem[] | null = null;

export function getLocalSeedChunks(): SeedChunkItem[] {
  if (cachedSeedChunks) return cachedSeedChunks;
  try {
    const manifestPath = path.join(process.cwd(), "data", "seed", "manifest.json");
    if (!fs.existsSync(manifestPath)) return [];
    const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const list: SeedChunkItem[] = [];

    for (const doc of manifest) {
      const rawFile = path.join(process.cwd(), "data", "seed", "raw", doc.file);
      if (!fs.existsSync(rawFile)) continue;
      const raw = fs.readFileSync(rawFile, "utf-8");
      const structured = chunkDocument(raw);
      structured.forEach((c, idx) => {
        list.push({
          id: `${doc.standardNumber}-${idx + 1}`,
          doc,
          section: c.section,
          clause: c.clause,
          text: c.text,
        });
      });
    }
    cachedSeedChunks = list;
    return list;
  } catch (err) {
    console.error("[retrieval] Failed to load local seed chunks:", err);
    return [];
  }
}

/**
 * Fallback retrieval over the local seed dataset when Postgres/Neon is not
 * configured or unreachable. Ensures the app remains completely operational
 * with verified BIS standard documents out of the box.
 */
async function retrieveSeedChunks(
  query: string,
  { limit = 8, reranker = documentDiversityReranker }: { limit?: number; reranker?: Reranker } = {},
): Promise<RetrievedChunk[]> {
  const seedChunks = getLocalSeedChunks();
  if (seedChunks.length === 0) return [];

  const resolvedIds = resolveStandardIds(query);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const scored = seedChunks.map((item) => {
    let kwScore = 0;
    const content = `${item.doc.standardNumber} ${item.doc.title} ${item.text}`.toLowerCase();
    for (const term of queryTerms) {
      if (content.includes(term)) {
        kwScore += 1;
        const re = new RegExp(`\\b${term}\\b`, "gi");
        const count = (content.match(re) || []).length;
        kwScore += count * 0.2;
      }
    }

    const idMatch = resolvedIds.some((r) => matchesResolvedId(item.doc.standardNumber, r));
    if (idMatch) {
      kwScore += 10;
    }

    return { item, kwScore, idMatch };
  });

  const matching = scored.filter((s) => s.kwScore > 0 || s.idMatch);
  matching.sort((a, b) => b.kwScore - a.kwScore);

  const pool = matching.slice(0, limit * 4);
  const candidates: RetrievalCandidate[] = pool.map((m, idx) => ({
    chunkId: m.item.id,
    documentId: slugifyStandardNumber(m.item.doc.standardNumber),
    standardNumber: m.item.doc.standardNumber,
    section: m.item.section,
    clause: m.item.clause,
    text: m.item.text,
    semanticScore: 0,
    keywordScore: 1 / (idx + 1),
    identifierMatch: m.idMatch,
    fusedScore: (m.idMatch ? 1 / RRF_K : 0) + 1 / (RRF_K + (idx + 1)),
  }));

  const reranked = await reranker.rerank(query, candidates);
  const byId = new Map(seedChunks.map((c) => [c.id, c]));

  return reranked.slice(0, limit).map((c) => {
    const orig = byId.get(c.chunkId)!;
    return {
      chunkId: c.chunkId,
      documentId: c.documentId,
      standardNumber: c.standardNumber,
      title: orig.doc.title,
      sourceUrl: orig.doc.sourceUrl,
      sourceOrg: orig.doc.sourceOrg,
      section: c.section,
      clause: c.clause,
      page: null,
      text: c.text,
      semanticScore: c.semanticScore,
      keywordScore: c.keywordScore,
      identifierMatch: c.identifierMatch,
      score: c.rerankScore,
      rerankReason: c.rerankReason,
    } satisfies RetrievedChunk;
  });
}

// Reciprocal Rank Fusion — combines the semantic and keyword rankings
// without needing scores on a common scale. See AGENTS.md sec 11.
const RRF_K = 60;

/**
 * websearch_to_tsquery requires every term (or quoted phrase/AND-group) in
 * the query to match within a single chunk. That's precise for short
 * queries, but a full question sentence — e.g. "What tests are performed
 * on plastic bottles for packaged natural mineral water?" — often has no
 * single chunk containing every one of those words together, so it
 * silently returns zero candidates and keyword search contributes nothing
 * to the fused ranking (measured root cause of a real retrieval miss: see
 * data/evaluation/golden-queries.json Q17).
 *
 * Falling back to an OR-across-lexemes query only when the strict query
 * finds nothing keeps the precise AND/phrase behavior for every query that
 * already works, and only broadens matching for the specific failure mode
 * that caused Q17 — validated against the full 20-query golden set
 * (scripts/experiment-retrieval.ts): unconditional OR gave 12/12 recall
 * and 8/8 on the no-false-match queries, and since every query other than
 * Q17 already had a nonzero AND match, this fallback produces identical
 * results to unconditional OR on that set while leaving already-working
 * queries untouched.
 */
async function keywordSearch(
  db: ReturnType<typeof getDb>,
  query: string,
  limit: number,
): Promise<Array<{ id: string; rank: number }>> {
  const strict = await db.execute(sql`
    SELECT id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC) AS rank
    FROM chunks
    WHERE to_tsvector('english', text) @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(to_tsvector('english', text), websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${limit}
  `);
  const strictRows = strict.rows as unknown as Array<{ id: string; rank: number }>;
  if (strictRows.length > 0) return strictRows;

  const lexemes = await db.execute(sql`SELECT string_agg(lexeme, ' | ') AS q FROM unnest(to_tsvector('english', ${query})) AS lexeme`);
  const orQuery = (lexemes.rows as unknown as Array<{ q: string | null }>)[0]?.q;
  if (!orQuery) return [];

  const broad = await db.execute(sql`
    SELECT id, row_number() OVER (ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', ${orQuery})) DESC) AS rank
    FROM chunks
    WHERE to_tsvector('english', text) @@ to_tsquery('english', ${orQuery})
    ORDER BY ts_rank(to_tsvector('english', text), to_tsquery('english', ${orQuery})) DESC
    LIMIT ${limit}
  `);
  return broad.rows as unknown as Array<{ id: string; rank: number }>;
}

/**
 * Hybrid retrieval: semantic search over embeddings (pgvector cosine
 * distance) fused with keyword search (Postgres full-text ts_rank) via
 * reciprocal rank fusion. Falls back to keyword-only if embedding fails.
 */
export async function retrieveChunks(
  query: string,
  { limit = 8, reranker = documentDiversityReranker }: { limit?: number; reranker?: Reranker } = {},
): Promise<RetrievedChunk[]> {
  if (!process.env.DATABASE_URL) {
    return retrieveSeedChunks(query, { limit, reranker });
  }

  try {
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

    const keywordRows = await keywordSearch(db, query, candidatePoolSize);

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

    // The full fused candidate pool (not just the top `limit`) is fetched so
    // the reranker has enough of the ranking to work with — e.g. the
    // document-diversity reranker needs to see every document's candidates
    // to know which document's best chunk is being crowded out by another
    // document's volume. Bounded by candidatePoolSize (limit * 4), so this
    // stays a small query.
    const poolIds = [...fused.keys()];

    // Fetched via the query builder's inArray + relation, not a raw
    // `= ANY(${array})` SQL template: the neon-http driver expands a JS
    // array into individual $1, $2, ... parameters, which makes
    // `ANY(($1, $2, ...))` a tuple rather than a Postgres array and fails
    // with "op ANY/ALL (array) requires array on right side" — a bug that
    // only surfaced once real chunk ids existed to retrieve.
    const rows = await db.query.chunks.findMany({
      where: inArray(chunks.id, poolIds),
      with: { document: true },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));

    const candidates: RetrievalCandidate[] = poolIds
      .map((id) => {
        const row = byId.get(id);
        const fusion = fused.get(id)!;
        if (!row) return null;
        return {
          chunkId: id,
          documentId: row.documentId,
          standardNumber: row.document.standardNumber,
          section: row.section,
          clause: row.clause,
          text: row.text,
          semanticScore: fusion.semRank ? 1 / fusion.semRank : 0,
          keywordScore: fusion.kwRank ? 1 / fusion.kwRank : 0,
          identifierMatch: identifierChunkIds.has(id),
          fusedScore: fusion.rrf,
        } satisfies RetrievalCandidate;
      })
      .filter((c): c is RetrievalCandidate => c !== null);

    const ranked = await reranker.rerank(query, candidates);

    return ranked.slice(0, limit).map((c) => {
      const row = byId.get(c.chunkId)!;
      return {
        chunkId: c.chunkId,
        documentId: c.documentId,
        standardNumber: c.standardNumber,
        title: row.document.title,
        sourceUrl: row.document.sourceUrl,
        sourceOrg: row.document.sourceOrg,
        section: c.section,
        clause: c.clause,
        page: row.page,
        text: c.text,
        semanticScore: c.semanticScore,
        keywordScore: c.keywordScore,
        identifierMatch: c.identifierMatch,
        score: c.rerankScore,
        rerankReason: c.rerankReason,
      } satisfies RetrievedChunk;
    });
  } catch (dbErr) {
    console.warn("[retrieval] Database query failed, falling back to local seed data:", dbErr);
    return retrieveSeedChunks(query, { limit, reranker });
  }
}
