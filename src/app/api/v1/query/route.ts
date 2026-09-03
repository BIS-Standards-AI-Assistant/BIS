import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQueryPipeline } from "@/lib/query-pipeline";
import { rateLimitOrNull } from "@/lib/rate-limit-http";

const QueryRequestSchema = z.object({
  query: z.string().min(1).max(2000),
});

/**
 * Thin HTTP wrapper around src/lib/query-pipeline.ts's runQueryPipeline
 * (extracted 2026-09-03, P0 audit, so /api/v1/chat's explicit "wider
 * search" path can reuse the exact same pipeline instead of duplicating
 * it). See that module's doc comment for the full pipeline description —
 * nothing about the pipeline itself changed in this extraction.
 */
// /api/v1/query runs 1-2 LLM calls and multiple DB queries per request —
// the most expensive route in the app — so it gets the tightest budget of
// the three public routes (P0 audit, 2026-09-03).
const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "query", RATE_LIMIT);
  if (limited) return limited;

  const parsed = QueryRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { query } = parsed.data;
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  try {
    const response = await runQueryPipeline(query, { debug });
    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/v1/query]", err);
    return NextResponse.json(
      { error: "Query processing failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
