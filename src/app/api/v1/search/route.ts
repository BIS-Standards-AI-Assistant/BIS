import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { retrieveChunks } from "@/lib/retrieval";

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = SearchRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const results = await retrieveChunks(parsed.data.query, { limit: parsed.data.limit });
    return NextResponse.json({ query: parsed.data.query, results });
  } catch (err) {
    console.error("[api/v1/search]", err);
    return NextResponse.json({ error: "Retrieval failed" }, { status: 500 });
  }
}
