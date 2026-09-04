import { getProviderChain, generateTextWithFallback } from "./providers";
import { LANGUAGE_NAMES, type UiLanguage } from "./language";

/**
 * Translate-in step for multilingual retrieval (PRD §7, step 1-2).
 *
 * A non-English query is translated to English here so it can be retrieved
 * against the English-only vector index exactly like any other query. This
 * is the one place a provider call is made for translation — it goes
 * through the same provider chain (src/lib/providers) as intent/answer, so
 * it inherits the local → free → paid fallback and the "no provider at all"
 * degradation.
 *
 * Tier-0 behaviour: if no provider can run the translation, the ORIGINAL
 * query is used for retrieval unchanged and `translated: false` is
 * reported. Hybrid retrieval still contributes something (identifier
 * resolution and any Latin-script tokens in the query), and the pipeline
 * surfaces an honest limitation rather than failing. Translation is an
 * enhancement, never a hard dependency.
 */

export interface TranslationResult {
  /** The query to use for retrieval — English when translation succeeded, otherwise the original text. */
  queryForRetrieval: string;
  /** The user's text, unchanged — kept for answer generation and logging. */
  originalQuery: string;
  translated: boolean;
  method: "llm" | "skipped-no-provider" | "skipped-not-needed";
}

const SYSTEM_PROMPT =
  "You are a translation function for a standards-search engine. Translate the user's product/compliance question into natural English. " +
  "Keep standard identifiers (e.g. 'IS 14543', 'IS 302 Part 1'), numbers, units, and product names intact. " +
  "Output ONLY the translated sentence — no quotes, no notes, no preamble.";

export async function translateQueryToEnglish(
  query: string,
  sourceLanguage: UiLanguage,
): Promise<TranslationResult> {
  if (sourceLanguage === "en") {
    return { queryForRetrieval: query, originalQuery: query, translated: false, method: "skipped-not-needed" };
  }

  const chain = getProviderChain();
  const { response } = await generateTextWithFallback(chain, {
    system: SYSTEM_PROMPT,
    prompt: `Source language: ${LANGUAGE_NAMES[sourceLanguage]}\nQuestion: ${query}`,
    maxOutputTokens: 300,
  });

  const text = response?.text?.trim();
  if (text) {
    return { queryForRetrieval: text, originalQuery: query, translated: true, method: "llm" };
  }
  return { queryForRetrieval: query, originalQuery: query, translated: false, method: "skipped-no-provider" };
}
