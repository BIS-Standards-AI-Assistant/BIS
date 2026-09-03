import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQueryPipeline } from "@/lib/query-pipeline";
import { classifyChatIntent, resolveScopedContext, buildScopedAnswer } from "@/lib/chat-context";
import { rateLimitOrNull } from "@/lib/rate-limit-http";

/**
 * "Discuss these results" (P0 audit, 2026-09-03). The client sends only
 * stable identifiers (standardNumbers from its last query response) plus
 * the new message — never trusted factual content like a "reason" or
 * evidence string, which the audit found the old chat implementation
 * effectively re-trusted by string-concatenating it into a second global
 * search. Every field in the response below is resolved server-side from
 * `standardNumbers`, or — only when the message explicitly asks for
 * broader discovery — from a fresh run of the same global pipeline
 * /api/v1/query uses. The scope actually used is always reported back in
 * `scope`, so a caller never has to guess which one produced the answer.
 */
const ChatRequestSchema = z.object({
  originalQuery: z.string().min(1).max(2000),
  standardNumbers: z.array(z.string().min(1)).max(10).default([]),
  message: z.string().min(1).max(1000),
});

// Chat can trigger a full pipeline run (wider search) or a handful of DB
// reads (scoped) — budgeted like /query, not like /search.
const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const limited = rateLimitOrNull(req, "chat", RATE_LIMIT);
  if (limited) return limited;

  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { originalQuery, standardNumbers, message } = parsed.data;

  try {
    const subIntent = classifyChatIntent(message);

    if (subIntent === "wider_search") {
      const result = await runQueryPipeline(message);
      return NextResponse.json({
        scope: "global",
        scopeChangeNotice: "This requires searching beyond your current results.",
        subIntent,
        ...result,
      });
    }

    const scoped = await resolveScopedContext(standardNumbers);
    const scopedAnswer = await buildScopedAnswer(subIntent, originalQuery, scoped);

    return NextResponse.json({
      scope: "current_results",
      subIntent,
      answer: scopedAnswer.answer,
      evidence: scopedAnswer.evidence,
      limitations: scopedAnswer.limitations,
      resolvedStandards: scoped.map((s) => s.standardNumber),
    });
  } catch (err) {
    console.error("[api/v1/chat]", err);
    return NextResponse.json(
      { error: "Chat processing failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
