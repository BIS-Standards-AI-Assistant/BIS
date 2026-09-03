import { z } from "zod";
import { getProviderChain, generateStructuredWithFallback } from "./providers";
import { resolveStandardIds } from "./standards-id";

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
  isRelevant: z
    .boolean()
    .describe("Set to false if this query is completely unrelated to Indian Standards, products, manufacturing, materials, certification, or testing. Otherwise set to true."),
  relevanceMessage: z
    .string()
    .nullable()
    .describe("If isRelevant is false, an informative and friendly explanation guiding the user to enter a product or standard. Null if isRelevant is true."),
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

const SYSTEM_PROMPT = `You extract structured intent from user questions about Indian Standards (BIS) applicability, certification, and testing.
CRITICAL: If the query is completely unrelated to products, materials, manufacturing, Indian Standards, testing, or BIS certification (such as weather forecasts, cooking recipes, coding/programming, general trivia, politics, sports scores, greetings), set isRelevant to false and set relevanceMessage to a clear, professional message explaining that this is not a relevant search for BIS Standards Navigator and guiding them to search for a product (e.g. 'Steel water bottle', 'Cement', 'LED bulb') or standard number.
For relevant queries, set isRelevant to true.
Use null for any field that is not stated or cannot be reasonably inferred from the text — never invent or guess a value.
List every piece of information that, if known, would materially change which standard applies (e.g. target age group, material grade, intended use) in missingInformation.`;

function baseIntent(overrides: Partial<QueryIntent>): QueryIntent {
  return {
    intent: "unclear",
    isRelevant: true,
    relevanceMessage: null,
    product: null,
    material: null,
    useCase: null,
    targetUser: null,
    sector: null,
    certificationRequested: false,
    testingRequested: false,
    searchQuery: "",
    missingInformation: [],
    ...overrides,
  };
}

/**
 * Deterministic fast path (no LLM call): if the query is essentially just
 * a standard identifier with little else in it, an LLM has nothing useful
 * to add — we already know exactly what's being asked. Confident enough to
 * skip the LLM entirely, not just skip it on failure.
 */
export function deterministicIntentFastPath(query: string): QueryIntent | null {
  const identifiers = resolveStandardIds(query);
  if (identifiers.length !== 1) return null;

  const withoutIdentifier = query.replace(identifiers[0].raw, "").trim();
  const remainingWords = withoutIdentifier.split(/\s+/).filter(Boolean);
  if (remainingWords.length > 3) return null; // more than a trivial amount of extra text — let the LLM path handle it

  return baseIntent({ intent: "find_applicable_standard", searchQuery: query });
}

/**
 * Used only when no configured/available provider can perform structured
 * generation. Deliberately conservative: it does not attempt to guess
 * product/material/useCase — a wrong guess would silently steer retrieval
 * in the wrong direction, which is worse than leaving those fields null
 * and letting retrieval's own hybrid search work on the raw query text.
 */
export function deterministicIntentFallback(query: string): QueryIntent {
  const lower = query.toLowerCase();
  const offTopicPattern = /\b(recipe|bake|cook|weather|forecast|movie|song|joke|cricket|football|match score|prime minister|capital of|who is|javascript|python|coding|crypto|bitcoin|horoscope)\b/i;
  if (offTopicPattern.test(lower)) {
    return baseIntent({
      intent: "unclear",
      isRelevant: false,
      relevanceMessage: "This search does not appear to be relevant to Indian Standards (BIS), certification schemes, or regulatory compliance. Please search for a physical product (e.g. 'Steel water bottle', 'Cement', 'LED bulb', 'Pressure cooker'), material, or standard code (e.g. 'IS 14543').",
      searchQuery: query,
    });
  }

  const certificationRequested = /\b(certif|licen[cs]e|scheme|isi mark)\w*\b/.test(lower);
  const testingRequested = /\b(test|testing|tested|sample)\w*\b/.test(lower);
  const intent: QueryIntent["intent"] = certificationRequested
    ? "certification_process"
    : testingRequested
      ? "testing_requirements"
      : "find_applicable_standard";

  return baseIntent({
    intent,
    isRelevant: true,
    certificationRequested,
    testingRequested,
    searchQuery: query,
    missingInformation: [
      "This query was interpreted without AI assistance (no LLM provider was available) — product/material/use-case details were not extracted, so results rely on keyword and semantic retrieval over the raw query text only.",
    ],
  });
}

/**
 * Converts a free-text user query into structured intent. Provider-
 * independent: goes through the provider chain (src/lib/providers), which
 * may resolve to a local model, OpenRouter's free tier, a paid provider, or
 * nothing at all — this function doesn't know or care which, and always
 * returns a usable QueryIntent either way (never throws for a provider
 * failure).
 */
export async function extractQueryIntent(query: string): Promise<QueryIntent> {
  const fastPath = deterministicIntentFastPath(query);
  if (fastPath) return fastPath;

  const chain = getProviderChain();
  const { response } = await generateStructuredWithFallback(chain, {
    schema: QueryIntentSchema,
    system: SYSTEM_PROMPT,
    prompt: query,
    maxOutputTokens: 1024, // this schema is small; no reason to let the default (tens of thousands) burn budget
  });

  if (response?.structuredData) return response.structuredData;
  return deterministicIntentFallback(query);
}
