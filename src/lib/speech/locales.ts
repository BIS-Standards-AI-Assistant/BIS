import { LANGUAGES } from "@/lib/i18n";

/**
 * BCP-47 locale tags for the Web Speech API, keyed by the same language
 * codes used throughout the app (src/lib/i18n.ts LANGUAGES). Deliberately
 * separate from `LanguageOption.available`: that flag gates UI-string
 * *translation* (only en/hi have a real Dictionary), but Chrome's
 * cloud-backed SpeechRecognition engine has native support for these Indian
 * languages regardless — so voice input can transcribe more languages than
 * the UI chrome currently displays in. A user can speak Tamil even though
 * the page itself is still shown in English.
 */
export const SPEECH_LOCALES: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  kn: "kn-IN",
};

/**
 * Languages whose *queries* the pipeline actually understands — as opposed
 * to languages the mic can merely transcribe. Speech recognition working
 * for a language does not mean retrieval, intent extraction or answer
 * generation understand it: see src/lib/query-language.ts and
 * docs/AI_ML_STATUS_REPORT.md §26. Keeping these two facts visibly separate
 * is the point; conflating them would overstate what the system does.
 */
const QUERY_UNDERSTOOD_LANGUAGES = new Set(["en", "hi"]);

export interface VoiceLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  locale: string;
  /** false = the mic transcribes it, but the search pipeline does not understand it. */
  queryUnderstandingSupported: boolean;
}

/** Every language the mic can listen for, sourced from the single LANGUAGES catalog. */
export const VOICE_LANGUAGES: VoiceLanguageOption[] = LANGUAGES.filter((l) => SPEECH_LOCALES[l.code]).map((l) => ({
  code: l.code,
  label: l.label,
  nativeLabel: l.nativeLabel,
  locale: SPEECH_LOCALES[l.code],
  queryUnderstandingSupported: QUERY_UNDERSTOOD_LANGUAGES.has(l.code),
}));

export function localeForLanguage(code: string): string {
  return SPEECH_LOCALES[code] ?? SPEECH_LOCALES.en;
}
