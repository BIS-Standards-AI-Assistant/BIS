import { describe, expect, test } from "vitest";
import { DICTIONARIES, LANGUAGES, type LangCode } from "./i18n";

/**
 * Bengali, Tamil, Telugu, Marathi, Gujarati and Kannada used to be offered
 * only as greyed-out "Soon" entries, because their dictionaries covered the
 * navigation chrome and fell back to English everywhere else. Each now has a
 * complete dictionary; these tests keep it that way.
 */

const REGIONAL = {
  bn: /[ঀ-৿]/,
  ta: /[஀-௿]/,
  te: /[ఀ-౿]/,
  mr: /[ऀ-ॿ]/,
  gu: /[઀-૿]/,
  kn: /[ಀ-೿]/,
} as const satisfies Partial<Record<LangCode, RegExp>>;

/** Symbols that are the same in every language. */
const NEUTRAL = new Set(["recent.colHash"]);

function leaves(obj: object, prefix = ""): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object" ? leaves(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]],
  );
}

const english = new Map(leaves(DICTIONARIES.en));

describe.each(Object.entries(REGIONAL))("%s", (code, script) => {
  const entries = leaves(DICTIONARIES[code as LangCode]).filter(([key]) => !NEUTRAL.has(key));

  test("is offered in the language switcher", () => {
    expect(LANGUAGES.find((l) => l.code === code)?.available).toBe(true);
  });

  test("has every key the English dictionary has", () => {
    expect(entries.map(([key]) => key).sort()).toEqual([...english.keys()].filter((k) => !NEUTRAL.has(k)).sort());
  });

  test("falls back to English nowhere", () => {
    expect(entries.filter(([key, value]) => english.get(key) === value).map(([key]) => key)).toEqual([]);
  });

  test("writes every string in its own script", () => {
    expect(entries.filter(([, value]) => !script.test(value)).map(([key]) => key)).toEqual([]);
  });

  test("keeps the trailing space the hero title relies on", () => {
    // titlePre is rendered directly before the highlighted phrase.
    expect(DICTIONARIES[code as LangCode].hero.titlePre).toMatch(/\S $/);
  });
});
