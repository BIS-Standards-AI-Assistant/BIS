/**
 * Deterministic query-language handling (PRD §7, FR2).
 *
 * The PRD's multilingual contract is: detect the query language, retrieve
 * against the English-only index (translating the query in first if needed),
 * then answer in the query's original language. This module is the
 * deterministic, no-LLM half of that — script-range detection and language
 * resolution. It never calls a provider, so it works at Tier 0 (see
 * docs/ui/SIH.md §23). Translation itself lives in src/lib/translate.ts.
 *
 * Scope: English and Hindi are the verified, live-tested pair ("Hindi
 * minimum" in the PRD — see docs/PROJECT_STATUS.md's multilingual-parity
 * numbers, 3/5 strict grounding parity). The other six Indic scripts the
 * UI language switcher offers now also get real translate-in and
 * answer-in-language treatment (translate.ts and answer.ts's
 * languageInstruction() were already generic over any UiLanguage — only
 * this function's answerLanguage computation hardcoded them to English).
 * They are unverified in the same way Hindi itself was before it was
 * measured: expect similar or worse parity until each is actually run
 * against real queries. The one place still English-only is refusal.ts's
 * FIXED copy, which only exists reviewed in English and Hindi — see the
 * limitation note query-pipeline.ts adds for the other six.
 */

export type AnswerLanguage = UiLanguage;

/** Every language the UI switcher can be set to — mirrors LANGUAGES in src/lib/i18n.ts. */
export type UiLanguage = "en" | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn";

export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
};

/** Unicode block ranges for the scripts the UI offers, for cheap detection. */
const SCRIPT_RANGES: Array<{ lang: UiLanguage; re: RegExp }> = [
  { lang: "hi", re: /[ऀ-ॿ]/ }, // Devanagari — also Marathi; disambiguated below
  { lang: "bn", re: /[ঀ-৿]/ },
  { lang: "ta", re: /[஀-௿]/ },
  { lang: "te", re: /[ఀ-౿]/ },
  { lang: "gu", re: /[઀-૿]/ },
  { lang: "kn", re: /[ಀ-೿]/ },
];

export interface LanguageDetection {
  /** Best-guess language of the text. */
  language: UiLanguage;
  /** Fraction of letters that belong to the detected non-Latin script (1.0 for pure Latin → "en"). */
  confidence: number;
  method: "script-range" | "latin-default";
}

/**
 * Detects the dominant script of a query. Deliberately simple: it counts
 * letters per script and picks the majority. Devanagari is reported as
 * `hi` (Marathi also uses Devanagari; the two are not separated by script
 * alone, and the UI toggle is the reliable signal when a user wants
 * Marathi specifically — see resolveQueryLanguage).
 */
export function detectLanguage(text: string): LanguageDetection {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters === 0) return { language: "en", confidence: 1, method: "latin-default" };

  let best: { lang: UiLanguage; count: number } | null = null;
  for (const { lang, re } of SCRIPT_RANGES) {
    const g = new RegExp(re.source, "gu");
    const count = (text.match(g) ?? []).length;
    if (count > 0 && (!best || count > best.count)) best = { lang, count };
  }

  if (!best) return { language: "en", confidence: 1, method: "latin-default" };
  return { language: best.lang, confidence: best.count / letters, method: "script-range" };
}

/**
 * Resolves the language the pipeline should treat the query as, given an
 * optional explicit choice from the UI language switcher and the detected
 * script. Explicit choice wins when it's consistent with the script or the
 * text is script-neutral (e.g. a bare "IS 14543"); otherwise detection wins,
 * because a user who typed Devanagari almost certainly wants a Hindi answer
 * regardless of a stale toggle.
 */
export function resolveQueryLanguage(
  explicit: UiLanguage | undefined,
  detection: LanguageDetection,
): { queryLanguage: UiLanguage; answerLanguage: AnswerLanguage; source: "explicit" | "detected" } {
  const scriptNeutral = detection.method === "latin-default" || detection.confidence < 0.15;

  let queryLanguage: UiLanguage;
  let source: "explicit" | "detected";
  if (explicit && (scriptNeutral || explicit === detection.language || (explicit === "mr" && detection.language === "hi"))) {
    queryLanguage = explicit;
    source = "explicit";
  } else if (!scriptNeutral) {
    queryLanguage = detection.language;
    source = "detected";
  } else {
    queryLanguage = explicit ?? "en";
    source = explicit ? "explicit" : "detected";
  }

  // Answer in whatever language the query was resolved to — translate.ts
  // and answer.ts's languageInstruction() are generic over every
  // UiLanguage, not just Hindi. refusal.ts's FIXED copy is the one
  // remaining English/Hindi-only surface; query-pipeline.ts adds an
  // honest limitation note for the other six rather than silently
  // falling back to English refusal text.
  const answerLanguage: AnswerLanguage = queryLanguage;
  return { queryLanguage, answerLanguage, source };
}

/** True when the query must be translated to English before retrieval. */
export function needsTranslationForRetrieval(queryLanguage: UiLanguage): boolean {
  return queryLanguage !== "en";
}
