import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractQueryIntent } from "@/lib/intent";
import { retrieveChunks } from "@/lib/retrieval";
import { generateAnswer, type StructuredAnswer } from "@/lib/answer";
import { getDb } from "@/db";
import { queryLogs } from "@/db/schema";

const QueryRequestSchema = z.object({
  query: z.string().min(1).max(2000),
});

/**
 * Drops any evidenceChunkIds the model cited that weren't actually part of
 * the retrieved evidence set — a cheap guard against fabricated citations
 * (AGENTS.md sec 21, "Citation Validation" stage of the RAG architecture).
 */
function validateCitations(
  recommendations: StructuredAnswer["recommendations"],
  validChunkIds: Set<string>,
) {
  return recommendations.map((r) => ({
    ...r,
    evidenceChunkIds: r.evidenceChunkIds.filter((id) => validChunkIds.has(id)),
  }));
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const parsed = QueryRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { query } = parsed.data;

  try {
    const intent = await extractQueryIntent(query);
    const evidence = await retrieveChunks(intent.searchQuery || query, { limit: 8 });
    const validChunkIds = new Set(evidence.map((e) => e.chunkId));

    const structuredAnswer = await generateAnswer(query, intent, evidence);
    const recommendations = validateCitations(structuredAnswer.recommendations, validChunkIds);

    const evidenceById = new Map(evidence.map((e) => [e.chunkId, e]));
    const response = {
      answer: structuredAnswer.answer,
      intent: intent.intent,
      interpretation: {
        product: intent.product,
        material: intent.material,
        useCase: intent.useCase,
        targetUser: intent.targetUser,
        sector: intent.sector,
        certificationRequested: intent.certificationRequested,
        testingRequested: intent.testingRequested,
      },
      clarificationNeeded: intent.missingInformation.length > 0 ? intent.missingInformation : undefined,
      recommendations: recommendations.map((r) => ({
        standardNumber: r.standardNumber,
        title: r.title,
        relevanceScore: r.relevanceScore,
        groundingState: r.groundingState,
        reason: r.reason,
        evidence: r.evidenceChunkIds.map((id) => {
          const c = evidenceById.get(id)!;
          return {
            chunkId: c.chunkId,
            documentId: c.documentId,
            document: c.title,
            standardNumber: c.standardNumber,
            section: c.section,
            clause: c.clause,
            page: c.page,
            text: c.text,
            sourceUrl: c.sourceUrl,
          };
        }),
      })),
      certification: {
        available: structuredAnswer.certificationNotes !== null,
        notes: structuredAnswer.certificationNotes,
      },
      testing: {
        available: structuredAnswer.testingNotes !== null,
        notes: structuredAnswer.testingNotes,
      },
      nextSteps: structuredAnswer.nextSteps,
      confidence: structuredAnswer.confidence,
      limitations: structuredAnswer.limitations,
    };

    const db = getDb();
    await db.insert(queryLogs).values({
      query,
      intent: intent.intent,
      retrievedChunkIds: evidence.map((e) => e.chunkId),
      confidence: structuredAnswer.confidence,
      latencyMs: Date.now() - start,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/v1/query]", err);
    return NextResponse.json(
      { error: "Query processing failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
