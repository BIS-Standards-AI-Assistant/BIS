import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { standards } from "@/db/schema";
import { resolveStandardIds } from "../standards-id";
import { retrieveChunks } from "../retrieval";
import { aggregateEvidence } from "../evidence-aggregation";
import type { ToolDefinition, ToolResult } from "./types";

export interface StandardRecord {
  standardId: string;
  canonicalNumber: string;
  normalizedNumber: string;
  title: string | null;
  editionYear: string | null;
  status: string | null;
  domain: string | null;
  sourceUrl: string | null;
  verificationStatus: string;
}

function toRecord(row: typeof standards.$inferSelect): StandardRecord {
  return {
    standardId: row.id,
    canonicalNumber: row.canonicalNumber,
    normalizedNumber: row.normalizedNumber,
    title: row.title,
    editionYear: row.editionYear,
    status: row.status,
    domain: row.domain,
    sourceUrl: row.sourceUrl,
    verificationStatus: row.verificationStatus,
  };
}

const ResolveStandardInput = z.object({ query: z.string().min(1) });

/**
 * Deterministic identifier resolution against the `standards` table
 * (rag.md §7 `resolveStandard()`). Never guesses across editions: a
 * candidate only matches if its canonicalNumber is exactly one of the
 * normalized identifiers the regex resolver found in the query text.
 */
export const resolveStandardTool: ToolDefinition<z.infer<typeof ResolveStandardInput>, StandardRecord[]> = {
  name: "resolveStandard",
  description: "Resolves Indian Standard identifiers mentioned in free text against the canonical standards table.",
  inputSchema: ResolveStandardInput,
  deterministic: true,
  async execute({ query }): Promise<ToolResult<StandardRecord[]>> {
    const resolved = resolveStandardIds(query);
    if (resolved.length === 0) return { status: "not_found" };

    const db = getDb();
    const rows = await db.query.standards.findMany({
      where: or(...resolved.map((r) => eq(standards.canonicalNumber, r.normalized))),
    });

    if (rows.length === 0) return { status: "not_found" };
    return {
      status: "ok",
      data: rows.map(toRecord),
      provenance: rows.map((r) => ({ source: "standards table", verificationStatus: r.verificationStatus })),
    };
  },
};

const GetStandardInput = z.object({ standardId: z.string().uuid().optional(), canonicalNumber: z.string().optional() }).refine(
  (v) => v.standardId || v.canonicalNumber,
  { message: "Provide either standardId or canonicalNumber" },
);

/** Direct lookup by id or exact canonical number — no fuzzy matching (rag.md §7 `getStandard()`). */
export const getStandardTool: ToolDefinition<z.infer<typeof GetStandardInput>, StandardRecord> = {
  name: "getStandard",
  description: "Fetches one standard record by its id or exact canonical number.",
  inputSchema: GetStandardInput,
  deterministic: true,
  async execute({ standardId, canonicalNumber }): Promise<ToolResult<StandardRecord>> {
    const db = getDb();
    const row = await db.query.standards.findFirst({
      where: standardId ? eq(standards.id, standardId) : eq(standards.canonicalNumber, canonicalNumber!),
    });
    if (!row) return { status: "not_found" };
    return { status: "ok", data: toRecord(row), provenance: [{ source: "standards table", verificationStatus: row.verificationStatus }] };
  },
};

export interface StandardSearchHit {
  standardNumber: string | null;
  title: string;
  score: number;
  chunkCount: number;
}

const SearchInput = z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(20).default(8) });

async function searchViaRetrievalEngine(query: string, limit: number): Promise<StandardSearchHit[]> {
  const chunks = await retrieveChunks(query, { limit: limit * 3 });
  const aggregated = aggregateEvidence(chunks).slice(0, limit);
  return aggregated.map((c) => ({
    standardNumber: c.standardNumber,
    title: c.title,
    score: c.weightedScore,
    chunkCount: c.chunkCount,
  }));
}

/**
 * Keyword/semantic discovery over the ingested corpus (rag.md §7
 * `searchStandards()`). Reuses the existing hybrid-retrieval + evidence-
 * aggregation pipeline (src/lib/retrieval.ts, src/lib/evidence-
 * aggregation.ts) rather than re-implementing ranking — see the audit's
 * §5 note on not reimplementing identifier/retrieval logic a second time.
 */
export const searchStandardsTool: ToolDefinition<z.infer<typeof SearchInput>, StandardSearchHit[]> = {
  name: "searchStandards",
  description: "Hybrid keyword+semantic search over ingested standards documents.",
  inputSchema: SearchInput,
  deterministic: true,
  async execute({ query, limit }): Promise<ToolResult<StandardSearchHit[]>> {
    const hits = await searchViaRetrievalEngine(query, limit);
    if (hits.length === 0) return { status: "not_found" };
    return { status: "ok", data: hits, provenance: [{ source: "hybrid retrieval (chunks table)" }] };
  },
};

/**
 * Same underlying retrieval as searchStandards — kept as a separate
 * named tool because the query planner (src/lib/query-planner.ts)
 * distinguishes STANDARD_DISCOVERY/PRODUCT_DISCOVERY intent from
 * GENERAL_INFORMATION, and rag.md §7 lists them separately. Not
 * duplicated logic, just a second name for the planner to route to.
 */
export const findApplicableStandardsTool: ToolDefinition<z.infer<typeof SearchInput>, StandardSearchHit[]> = {
  name: "findApplicableStandards",
  description: "Finds standards applicable to a described product/material/use case.",
  inputSchema: SearchInput,
  deterministic: true,
  async execute({ query, limit }): Promise<ToolResult<StandardSearchHit[]>> {
    const hits = await searchViaRetrievalEngine(query, limit);
    if (hits.length === 0) return { status: "not_found" };
    return { status: "ok", data: hits, provenance: [{ source: "hybrid retrieval (chunks table)" }] };
  },
};
