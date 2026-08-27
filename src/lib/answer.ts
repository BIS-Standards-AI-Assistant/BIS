import { generateObject } from "ai";
import { z } from "zod";
import type { RetrievedChunk } from "./retrieval";
import type { QueryIntent } from "./intent";

const RecommendationSchema = z.object({
  standardNumber: z.string().nullable(),
  title: z.string(),
  relevanceScore: z.number().min(0).max(1),
  reason: z.string().describe("Why this standard appears relevant to the query, grounded in the evidence"),
  evidenceChunkIds: z.array(z.string()).describe("chunkId values from the provided evidence that support this recommendation"),
});

export const AnswerSchema = z.object({
  answer: z.string().describe("Direct answer to the user, written for a non-expert"),
  recommendations: z.array(RecommendationSchema),
  certificationNotes: z.string().nullable().describe("Certification-related information found in the evidence, or null if none"),
  testingNotes: z.string().nullable().describe("Testing-related information found in the evidence, or null if none"),
  nextSteps: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low", "none"]),
  limitations: z.array(z.string()).describe("Explicit uncertainty, gaps, or things that could not be verified from the evidence"),
});

export type StructuredAnswer = z.infer<typeof AnswerSchema>;

const GENERATION_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM_PROMPT = `You are a BIS (Bureau of Indian Standards) information assistant. You answer ONLY from the evidence chunks provided below — you have no other source of truth about Indian Standards.

Rules (non-negotiable):
- Never state a standard number, clause, requirement, or certification fact that is not present in the evidence chunks.
- If the evidence does not support a confident answer, say so explicitly in "limitations" and set confidence to "low" or "none" — do not fill the gap with plausible-sounding but unverified content.
- Every recommendation must cite the chunkId(s) of the evidence that supports it.
- If evidence is empty or irrelevant to the query, return an empty recommendations array, confidence "none", and explain in "limitations" that no relevant BIS evidence was found.
- Do not treat semantic similarity as certainty: a chunk merely mentioning a related material or product is not proof that standard applies to the user's specific case — reflect that nuance in "reason" and "limitations".`;

export async function generateAnswer(
  query: string,
  intent: QueryIntent,
  evidence: RetrievedChunk[],
): Promise<StructuredAnswer> {
  if (evidence.length === 0) {
    return {
      answer:
        "I could not verify this from the available BIS sources. No relevant evidence was found in the current knowledge base for this query.",
      recommendations: [],
      certificationNotes: null,
      testingNotes: null,
      nextSteps: [
        "Try rephrasing with the specific product name or material.",
        "Consult the official BIS website (bis.gov.in) or BIS Care portal directly for standards not yet in this system's knowledge base.",
      ],
      confidence: "none",
      limitations: ["No relevant BIS evidence was found in the knowledge base for this query."],
    };
  }

  const evidenceBlock = evidence
    .map(
      (c, i) =>
        `[${i + 1}] chunkId=${c.chunkId} | standard=${c.standardNumber ?? "n/a"} | title="${c.title}" | section="${c.section ?? "n/a"}" | clause="${c.clause ?? "n/a"}"\n${c.text}`,
    )
    .join("\n\n");

  const { object } = await generateObject({
    model: GENERATION_MODEL,
    schema: AnswerSchema,
    system: SYSTEM_PROMPT,
    prompt: `User query: ${query}\n\nExtracted intent: ${JSON.stringify(intent)}\n\nEvidence chunks:\n${evidenceBlock}`,
  });
  return object;
}
