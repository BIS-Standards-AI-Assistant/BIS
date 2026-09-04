import { describe, test, expect } from "vitest";
import { detectLanguage, resolveQueryLanguage, needsTranslationForRetrieval } from "./language";

describe("detectLanguage", () => {
  test("plain English → en with full confidence", () => {
    const d = detectLanguage("Which IS standard applies to LED bulbs for domestic use?");
    expect(d.language).toBe("en");
    expect(d.method).toBe("latin-default");
    expect(d.confidence).toBe(1);
  });

  test("Devanagari question → hi via script range", () => {
    const d = detectLanguage("प्रेशर कुकर के लिए कौन सा भारतीय मानक लागू होता है?");
    expect(d.language).toBe("hi");
    expect(d.method).toBe("script-range");
    expect(d.confidence).toBeGreaterThan(0.5);
  });

  test("bare standard identifier is script-neutral (treated as en)", () => {
    const d = detectLanguage("IS 14543:2016");
    expect(d.language).toBe("en");
  });

  test("mixed Hindi text with a Latin standard number still detects hi", () => {
    const d = detectLanguage("क्या IS 4151 हेलमेट के लिए अनिवार्य है?");
    expect(d.language).toBe("hi");
  });

  test("empty / punctuation-only input does not throw and defaults to en", () => {
    expect(detectLanguage("").language).toBe("en");
    expect(detectLanguage("??? ...").language).toBe("en");
  });

  test("other Indic scripts are distinguished from Devanagari", () => {
    expect(detectLanguage("தமிழில் ஒரு கேள்வி").language).toBe("ta");
    expect(detectLanguage("বাংলায় একটি প্রশ্ন").language).toBe("bn");
  });
});

describe("resolveQueryLanguage", () => {
  test("Devanagari text overrides a stale English toggle", () => {
    const r = resolveQueryLanguage("en", detectLanguage("प्रेशर कुकर मानक"));
    expect(r.queryLanguage).toBe("hi");
    expect(r.answerLanguage).toBe("hi");
    expect(r.source).toBe("detected");
  });

  test("explicit Hindi choice on a script-neutral query is honoured", () => {
    const r = resolveQueryLanguage("hi", detectLanguage("IS 14543"));
    expect(r.queryLanguage).toBe("hi");
    expect(r.answerLanguage).toBe("hi");
    expect(r.source).toBe("explicit");
  });

  test("explicit Marathi with Devanagari text is kept as the query language, answer falls back to English", () => {
    const r = resolveQueryLanguage("mr", detectLanguage("मानक कोणते लागू आहे"));
    expect(r.queryLanguage).toBe("mr");
    expect(r.answerLanguage).toBe("en");
  });

  test("no explicit choice, plain English → en/en", () => {
    const r = resolveQueryLanguage(undefined, detectLanguage("helmet standard"));
    expect(r.queryLanguage).toBe("en");
    expect(r.answerLanguage).toBe("en");
  });
});

describe("needsTranslationForRetrieval", () => {
  test("english does not need translation, hindi does", () => {
    expect(needsTranslationForRetrieval("en")).toBe(false);
    expect(needsTranslationForRetrieval("hi")).toBe(true);
    expect(needsTranslationForRetrieval("bn")).toBe(true);
  });
});
