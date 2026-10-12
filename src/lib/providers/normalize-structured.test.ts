import { describe, test, expect } from "vitest";
import { parseJsonFromText, normalizeStructuredObject } from "./normalize-structured";

describe("parseJsonFromText", () => {
  test("parses plain JSON, ignoring surrounding whitespace", () => {
    expect(parseJsonFromText('  {"a": 1}\n')).toEqual({ a: 1 });
  });

  test("extracts JSON from a ```json fenced block", () => {
    expect(parseJsonFromText('Here you go:\n```json\n{"a": [1, 2]}\n```\nThanks!')).toEqual({ a: [1, 2] });
  });

  test("extracts JSON from an unlabelled fenced block", () => {
    expect(parseJsonFromText('```\n{"ok": true}\n```')).toEqual({ ok: true });
  });

  test("extracts the outermost object from surrounding prose", () => {
    expect(parseJsonFromText('Sure! {"answer": "IS 1293", "nested": {"x": 1}} Hope this helps.')).toEqual({
      answer: "IS 1293",
      nested: { x: 1 },
    });
  });

  test("tolerates trailing commas, a common model mistake", () => {
    expect(parseJsonFromText('{"a": 1, "b": [1, 2,],}')).toEqual({ a: 1, b: [1, 2] });
  });

  test("throws a descriptive error when there is no JSON to recover", () => {
    expect(() => parseJsonFromText("I could not find a standard.")).toThrow(/Failed to parse JSON/);
    expect(() => parseJsonFromText("{ not json at all }")).toThrow(/Failed to parse JSON/);
  });

  test("the error message is truncated rather than echoing a huge response", () => {
    const huge = "x".repeat(5000);
    try {
      parseJsonFromText(huge);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message.length).toBeLessThan(250);
    }
  });
});

describe("normalizeStructuredObject", () => {
  test("non-objects become an empty record", () => {
    expect(normalizeStructuredObject(null)).toEqual({});
    expect(normalizeStructuredObject("text")).toEqual({});
    expect(normalizeStructuredObject(42)).toEqual({});
  });

  describe("answer fields", () => {
    test.each(["summary", "directAnswer", "response", "text"])("uses %j as the answer when answer is missing", (key) => {
      expect(normalizeStructuredObject({ [key]: "IS 1293 applies." }).answer).toBe("IS 1293 applies.");
    });

    test("an existing answer is never overwritten", () => {
      expect(normalizeStructuredObject({ answer: "original", summary: "other" }).answer).toBe("original");
    });

    test.each(["standards", "recommendations", "candidates"])("maps %j onto recommendationExplanations", (key) => {
      const out = normalizeStructuredObject({ answer: "a", [key]: [{ standard_number: "IS 302", explanation: "covers it" }] });
      expect(out.recommendationExplanations).toEqual([{ standardNumber: "IS 302", reason: "covers it" }]);
    });

    test("recommendation key aliases resolve in priority order, with a neutral default reason", () => {
      const out = normalizeStructuredObject({
        answer: "a",
        recommendationExplanations: [{ standardNumber: "A", id: "B" }, { id: "C", description: "d" }, {}],
      });
      expect(out.recommendationExplanations).toEqual([
        { standardNumber: "A", reason: "Relevant standard identified from BIS evidence." },
        { standardNumber: "C", reason: "d" },
        { standardNumber: null, reason: "Relevant standard identified from BIS evidence." },
      ]);
    });

    test("a non-array recommendationExplanations is reset to empty", () => {
      expect(normalizeStructuredObject({ answer: "a", recommendationExplanations: "IS 302" }).recommendationExplanations).toEqual([]);
    });

    test("a missing answer is built from the standards named, never invented", () => {
      const out = normalizeStructuredObject({ standards: [{ standardNumber: "IS 1293" }, { standardNumber: "IS 302" }] });
      expect(out.answer).toBe("Based on BIS evidence, IS 1293, IS 302 applies to your query.");
      expect(normalizeStructuredObject({}).answer).toBe("Information retrieved from the indexed BIS evidence.");
    });

    test("snake_case and alternate keys are mapped, and list fields default to arrays", () => {
      const out = normalizeStructuredObject({
        answer: "a",
        next_steps: ["apply"],
        uncertainty: ["edition unclear"],
        certification_notes: "Scheme-I",
        testing_notes: "Type test",
      });
      expect(out.nextSteps).toEqual(["apply"]);
      expect(out.limitations).toEqual(["edition unclear"]);
      expect(out.certificationNotes).toBe("Scheme-I");
      expect(out.testingNotes).toBe("Type test");

      const empty = normalizeStructuredObject({ answer: "a", nextSteps: "apply", limitations: null });
      expect(empty.nextSteps).toEqual([]);
      expect(empty.limitations).toEqual([]);
      expect(empty.certificationNotes).toBeNull();
      expect(empty.testingNotes).toBeNull();
    });
  });

  describe("intent fields", () => {
    test.each([
      ["Certification", "certification_process"],
      ["product-testing", "testing_requirements"],
      ["find standard", "find_applicable_standard"],
      ["chit-chat", "general_information"],
    ])("an unknown intent %j is coerced to %j", (raw, expected) => {
      expect(normalizeStructuredObject({ intent: raw }).intent).toBe(expected);
    });

    test("a valid intent is kept and a missing one defaults to find_applicable_standard", () => {
      expect(normalizeStructuredObject({ intent: "unclear" }).intent).toBe("unclear");
      expect(normalizeStructuredObject({}).intent).toBe("find_applicable_standard");
    });

    test("missing intent fields get safe defaults; present ones are untouched", () => {
      const out = normalizeStructuredObject({ product: "helmet", isRelevant: false });
      expect(out).toMatchObject({
        product: "helmet",
        isRelevant: false,
        relevanceMessage: null,
        material: null,
        useCase: null,
        targetUser: null,
        sector: null,
        certificationRequested: false,
        testingRequested: false,
        searchQuery: "",
        missingInformation: [],
      });
    });
  });
});
