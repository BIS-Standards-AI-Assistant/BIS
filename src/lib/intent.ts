import { generateObject } from "ai";
import { z } from "zod";

export const QueryIntentSchema = z.object({
  intent: z
    .enum([
      "find_applicable_standard",
      "certification_process",
      "testing_requirements",
      "general_information",
      "unclear",
    ])
    .describe("The user's primary goal"),
  product: z.string().nullable().describe("Product or item described, verbatim or lightly normalized"),
  material: z.string().nullable(),
  useCase: z.string().nullable(),
  targetUser: z.string().nullable().describe("e.g. children, general consumer, industrial"),
  sector: z.string().nullable(),
  certificationRequested: z.boolean(),
  testingRequested: z.boolean(),
  searchQuery: z
    .string()
    .describe("A concise keyword/semantic query string optimized for retrieving relevant BIS standards"),
  missingInformation: z
    .array(z.string())
    .describe("Specific fields that are ambiguous or missing and would change which standard applies"),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

const GENERATION_MODEL = "anthropic/claude-sonnet-5";

/**
 * Converts a free-text user query into structured intent (AGENTS.md sec 12).
 * Never invents field values — the model is instructed to use null for
 * anything not stated, rather than guessing.
 */
export async function extractQueryIntent(query: string): Promise<QueryIntent> {
  const { object } = await generateObject({
    model: GENERATION_MODEL,
    schema: QueryIntentSchema,
    system: `You extract structured intent from user questions about Indian Standards (BIS) applicability, certification, and testing.
Use null for any field that is not stated or cannot be reasonably inferred from the text — never invent or guess a value.
List every piece of information that, if known, would materially change which standard applies (e.g. target age group, material grade, intended use) in missingInformation.`,
    prompt: query,
  });
  return object;
}
