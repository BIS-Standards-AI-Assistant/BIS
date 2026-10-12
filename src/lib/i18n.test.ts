import { describe, test, expect } from "vitest";
import { DICTIONARIES, LANGUAGES, type LangCode } from "./i18n";

/** Flattens a dictionary into ["section.key", value] pairs. */
function leaves(obj: object, prefix = ""): [string, unknown][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object" ? leaves(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );
}

const SCRIPT: Record<Exclude<LangCode, "en">, RegExp> = {
  hi: /[ऀ-ॿ]/, // Devanagari
  mr: /[ऀ-ॿ]/, // Devanagari
  bn: /[ঀ-৿]/, // Bengali
  ta: /[஀-௿]/, // Tamil
  te: /[ఀ-౿]/, // Telugu
  gu: /[઀-૿]/, // Gujarati
  kn: /[ಀ-೿]/, // Kannada
};

/** Strings that are legitimately identical in every language (symbols, not words). */
const LANGUAGE_NEUTRAL = new Set(["recent.colHash"]);

const english = new Map(leaves(DICTIONARIES.en));
const nonEnglish = LANGUAGES.filter((l) => l.code !== "en");

describe("LANGUAGES catalog", () => {
  test("codes are unique and each has a dictionary", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.sort()).toEqual(Object.keys(DICTIONARIES).sort());
  });

  test("English is listed first and is available", () => {
    expect(LANGUAGES[0]).toMatchObject({ code: "en", available: true });
  });

  test.each(nonEnglish.map((l) => [l.code, l.nativeLabel] as const))("%s's native label is written in its own script", (code, label) => {
    expect(SCRIPT[code as Exclude<LangCode, "en">].test(label)).toBe(true);
  });
});

describe("dictionaries", () => {
  test.each(Object.keys(DICTIONARIES))("%s has exactly the English key set, all non-empty strings", (code) => {
    const entries = leaves(DICTIONARIES[code as LangCode]);
    expect(entries.map(([k]) => k).sort()).toEqual([...english.keys()].sort());
    for (const [key, value] of entries) {
      expect(typeof value, `${code}.${key}`).toBe("string");
      expect((value as string).trim(), `${code}.${key}`).not.toBe("");
    }
  });

  // The `available` flag is what puts a language in the switcher. A language
  // must not be offered until every string is actually translated.
  test.each(nonEnglish.filter((l) => l.available).map((l) => l.code))(
    "%s is marked available, so every non-symbol string is translated into its script",
    (code) => {
      const untranslated = leaves(DICTIONARIES[code])
        .filter(([key]) => !LANGUAGE_NEUTRAL.has(key))
        .filter(([, value]) => !SCRIPT[code as Exclude<LangCode, "en">].test(value as string))
        .map(([key]) => key);
      expect(untranslated).toEqual([]);
    },
  );

  test.each(nonEnglish.map((l) => l.code))("every %s string that differs from English is in the right script", (code) => {
    const wrongScript = leaves(DICTIONARIES[code])
      .filter(([key, value]) => english.get(key) !== value)
      .filter(([, value]) => !SCRIPT[code as Exclude<LangCode, "en">].test(value as string))
      .map(([key]) => key);
    expect(wrongScript).toEqual([]);
  });

  test("gated languages fall back to English rather than leaving gaps", () => {
    for (const { code } of nonEnglish.filter((l) => !l.available)) {
      const fallbacks = leaves(DICTIONARIES[code]).filter(([key, value]) => english.get(key) === value);
      expect(fallbacks.length, code).toBeGreaterThan(0);
    }
  });
});
