import { describe, expect, test } from "vitest";
import { normalizeQuery } from "./query-normalization";

describe("normalizeQuery: abbreviations at the end of a sentence", () => {
  test.each([
    ["What is the std.", "What is the standard."],
    ["max temp.", "max temperature."],
    ["helmet specs.", "helmet specifications."],
    ["Do I need a cert...", "Do I need a certification..."],
  ])("%j -> %j", (query, expected) => {
    const result = normalizeQuery(query);
    expect(result.normalizedQuery).toBe(expected);
    expect(result.transformations).toContain("abbreviations_expanded");
  });

  test("records the bare word, without the period, as the expanded term", () => {
    expect(normalizeQuery("What is the std.").expandedTerms).toEqual([{ term: "std", expansion: "standard" }]);
  });

  test("dotted dictionary entries still match as written", () => {
    expect(normalizeQuery("w.r.t. helmets").normalizedQuery).toBe("with respect to helmets");
    expect(normalizeQuery("w.r.t helmets").normalizedQuery).toBe("with respect to helmets");
  });

  test("an unknown word with a period is left exactly as typed", () => {
    const result = normalizeQuery("Need cement.");
    expect(result.normalizedQuery).toBe("Need cement.");
    expect(result.expandedTerms).toEqual([]);
  });

  test("spelling unification also ignores a trailing period", () => {
    expect(normalizeQuery("bottle in one litre.").normalizedQuery).toBe("bottle in one liter.");
  });
});

describe("normalizeQuery: existing behaviour", () => {
  test("never expands a word that merely starts with an abbreviation", () => {
    expect(normalizeQuery("temporary standards").normalizedQuery).toBe("temporary standards");
  });

  test("collapses whitespace and normalizes punctuation, recording each step", () => {
    const result = normalizeQuery("  helmets  \u2014  \u201csafety\u201d ");
    expect(result.normalizedQuery).toBe('helmets - "safety"');
    expect(result.transformations).toEqual(["punctuation_normalized", "whitespace_collapsed"]);
  });

  test("identifiers are resolved before expansion and keep the original query", () => {
    const result = normalizeQuery("IS 5522:2014 std");
    expect(result.originalQuery).toBe("IS 5522:2014 std");
    expect(result.normalizedQuery).toBe("IS 5522:2014 standard");
    expect(result.identifiers.map((id) => id.normalized)).toEqual(["IS 5522:2014"]);
  });

  test("a clean query records no transformations", () => {
    expect(normalizeQuery("cement for construction").transformations).toEqual([]);
  });
});
