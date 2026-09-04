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
 * Scope for this pass: English and Hindi are the fully-supported pair
 * ("Hindi minimum" in the PRD). The other Indic scripts the UI language
 * switcher offers are detected here too so the pipeline can label them and
 * degrade honestly, but only `hi` gets the translate-in / answer-in-language
 * treatment until each is verified end to end.
 */

export type AnswerLanguage = "en" | "hi";

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

  // Only en/hi are wired end to end this pass; anything else answers in
  // English (the pipeline adds an honest limitation note when it does).
  const answerLanguage: AnswerLanguage = queryLanguage === "hi" ? "hi" : "en";
  return { queryLanguage, answerLanguage, source };
}

/** True when the query must be translated to English before retrieval. */
export function needsTranslationForRetrieval(queryLanguage: UiLanguage): boolean {
  return queryLanguage !== "en";
}
