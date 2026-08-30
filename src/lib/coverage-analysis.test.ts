import { describe, test, expect } from "vitest";
import { CERTIFICATION_KEYWORDS, TESTING_KEYWORDS } from "./coverage-analysis";

describe("CERTIFICATION_KEYWORDS", () => {
  // Regression: the original pattern was /\b(certif|licen[cs]e|scheme|mark|registration)\b/i.
  // `\bcertif\b` requires a word boundary immediately after "certif", which
  // never occurs — "certification" and "certificate" continue with more
  // word characters, so the boundary never fires and the word never
  // matched. This silently broke certification-coverage detection
  // wherever evidence text used the word "certification" instead of the
  // literal token "certif" on its own (found via query-planner.test.ts
  // failing against a real-sentence certification query).
  test("matches 'certification' and 'certificate', not just the bare stem", () => {
    expect(CERTIFICATION_KEYWORDS.test("BIS certification for kettles")).toBe(true);
    expect(CERTIFICATION_KEYWORDS.test("A BIS certificate is required")).toBe(true);
  });

  test("still matches licence/license/scheme/mark/registration", () => {
    expect(CERTIFICATION_KEYWORDS.test("apply for a licence")).toBe(true);
    expect(CERTIFICATION_KEYWORDS.test("apply for a license")).toBe(true);
    expect(CERTIFICATION_KEYWORDS.test("under this scheme")).toBe(true);
    expect(CERTIFICATION_KEYWORDS.test("carries the ISI mark")).toBe(true);
    expect(CERTIFICATION_KEYWORDS.test("product registration")).toBe(true);
  });

  test("does not match unrelated text", () => {
    expect(CERTIFICATION_KEYWORDS.test("the bottle is made of stainless steel")).toBe(false);
  });
});

describe("TESTING_KEYWORDS", () => {
  test("matches common testing phrasing", () => {
    expect(TESTING_KEYWORDS.test("this method of test applies")).toBe(true);
    expect(TESTING_KEYWORDS.test("samples must be tested")).toBe(true);
  });
});
