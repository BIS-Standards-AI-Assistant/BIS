import { describe, test, expect } from "vitest";
import { LANGUAGES } from "@/lib/i18n";
import { SPEECH_LOCALES, VOICE_LANGUAGES, localeForLanguage } from "./locales";

describe("speech locales", () => {
  test("every app language has an Indian-English-style BCP-47 locale", () => {
    for (const lang of LANGUAGES) {
      expect(SPEECH_LOCALES[lang.code], lang.code).toMatch(/^[a-z]{2}-IN$/);
    }
  });

  test("each locale's language subtag matches the app language code", () => {
    for (const [code, locale] of Object.entries(SPEECH_LOCALES)) {
      expect(locale.split("-")[0]).toBe(code);
    }
  });

  test("VOICE_LANGUAGES mirrors the LANGUAGES catalog order and labels", () => {
    expect(VOICE_LANGUAGES.map((v) => v.code)).toEqual(LANGUAGES.filter((l) => SPEECH_LOCALES[l.code]).map((l) => l.code));
    for (const v of VOICE_LANGUAGES) {
      const lang = LANGUAGES.find((l) => l.code === v.code)!;
      expect(v.label).toBe(lang.label);
      expect(v.nativeLabel).toBe(lang.nativeLabel);
      expect(v.locale).toBe(SPEECH_LOCALES[v.code]);
    }
  });

  test("voice input is offered for every language, whether or not its UI is translated", () => {
    for (const { code } of LANGUAGES) {
      expect(VOICE_LANGUAGES.some((v) => v.code === code), code).toBe(true);
    }
  });

  test("every voice language is understood by the query pipeline", () => {
    for (const v of VOICE_LANGUAGES) expect(v.queryUnderstandingSupported, v.code).toBe(true);
  });

  test("localeForLanguage resolves known codes and falls back to English", () => {
    expect(localeForLanguage("hi")).toBe("hi-IN");
    expect(localeForLanguage("ta")).toBe("ta-IN");
    expect(localeForLanguage("fr")).toBe("en-IN");
    expect(localeForLanguage("")).toBe("en-IN");
  });
});
