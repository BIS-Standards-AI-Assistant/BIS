import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { rateLimitOrNull } from "@/lib/rate-limit-http";

/**
 * Captures a user correction on a query/standard pairing. This is intake
 * only — every row lands as reviewStatus "pending" and is NOT training
 * data until a human reviews and promotes it via
 * `npm run feedback -- promote` (see scripts/feedback-admin.ts and
 * prompts/final.md §6: "Do not train directly from unreviewed feedback").
 */
const FeedbackRequestSchema = z.object({
  queryLogId: z.string().uuid().optional(),
  query: z.string().min(1).max(1000),
  standardNumber: z.string().min(1).max(100),
  standardTitle: z.string().max(500).optional(),
  reason: z.enum([
    "wrong_standard",
    "wrong_applicability",
    "missing_evidence",
    "poor_explanation",
    "outdated_information",
    "other",
  ]),
  comment: z.string().max(2000).optional(),
});

// Feedback is low-volume, human-driven input, not a retrieval/generation
// path — a tight budget is enough to deter spam without needing more.
const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "feedback", RATE_LIMIT);
  if (limited) return limited;

  const parsed = FeedbackRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(feedback)
      .values({
        queryLogId: parsed.data.queryLogId,
        query: parsed.data.query,
        standardNumber: parsed.data.standardNumber,
        standardTitle: parsed.data.standardTitle,
        reason: parsed.data.reason,
        comment: parsed.data.comment,
      })
      .returning({ id: feedback.id });

    return NextResponse.json({ id: row.id, status: "pending" }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/feedback]", err);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}
