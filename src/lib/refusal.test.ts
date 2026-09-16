import { describe, test, expect } from "vitest";
import { refusalCopy, REFUSAL_COPY_LANGUAGES } from "./refusal";

describe("refusalCopy", () => {
  test("every reason has distinct English copy that names the corpus boundary or the gap", () => {
    const oos = refusalCopy("out_of_scope", "en");
    const ins = refusalCopy("insufficient_evidence", "en");
    const nid = refusalCopy("not_in_database", "en");

    expect(oos.answer).not.toBe(ins.answer);
    expect(ins.answer).not.toBe(nid.answer);
    // insufficient-evidence refusal must state the corpus limit explicitly
    expect(ins.answer.toLowerCase()).toContain("indexed");
    expect(ins.answer.toLowerCase()).toContain("does not");
  });

  test("Hindi copy is actually in Devanagari and differs from English", () => {
    const en = refusalCopy("insufficient_evidence", "en");
    const hi = refusalCopy("insufficient_evidence", "hi");
    expect(hi.answer).not.toBe(en.answer);
    expect(/[ऀ-ॿ]/.test(hi.answer)).toBe(true);
  });

  test("REFUSAL_COPY_LANGUAGES is exactly the reviewed set — English and Hindi, nothing else", () => {
    expect(REFUSAL_COPY_LANGUAGES.has("en")).toBe(true);
    expect(REFUSAL_COPY_LANGUAGES.has("hi")).toBe(true);
    for (const lang of ["mr", "bn", "ta", "te", "gu", "kn"] as const) {
      expect(REFUSAL_COPY_LANGUAGES.has(lang)).toBe(false);
    }
  });

  test("a language with no reviewed copy (e.g. Marathi, Tamil) honestly falls back to the English text, never an unreviewed translation", () => {
    const en = refusalCopy("insufficient_evidence", "en");
    for (const lang of ["mr", "bn", "ta", "te", "gu", "kn"] as const) {
      expect(refusalCopy("insufficient_evidence", lang)).toEqual(en);
    }
  });

  test("every reason has copy for every AnswerLanguage — reviewed languages get their own text, everything else gets the English fallback", () => {
    for (const lang of ["en", "hi", "mr", "bn", "ta", "te", "gu", "kn"] as const) {
      for (const reason of ["out_of_scope", "insufficient_evidence", "not_in_database"] as const) {
        const copy = refusalCopy(reason, lang);
        expect(copy.answer.length).toBeGreaterThan(0);
        expect(copy.limitation.length).toBeGreaterThan(0);
      }
    }
  });

  test("copy is fixed — same input yields byte-identical output", () => {
    expect(refusalCopy("out_of_scope", "en")).toEqual(refusalCopy("out_of_scope", "en"));
  });

  test("each reason carries a one-line limitation string", () => {
    for (const reason of ["out_of_scope", "insufficient_evidence", "not_in_database"] as const) {
      expect(refusalCopy(reason, "en").limitation.length).toBeGreaterThan(0);
    }
  });
});
