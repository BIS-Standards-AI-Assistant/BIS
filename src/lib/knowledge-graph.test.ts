import { describe, test, expect } from "vitest";
import { validateRelationshipCandidate, isKnownRelationshipType, type RelationshipCandidate } from "./knowledge-graph";

function candidate(overrides: Partial<RelationshipCandidate> = {}): RelationshipCandidate {
  return {
    sourceEntityType: "standard",
    sourceEntityId: "aaaaaaaa-0000-0000-0000-000000000001",
    relationshipType: "STANDARD_REFERENCES_STANDARD",
    targetEntityType: "standard",
    targetEntityId: "aaaaaaaa-0000-0000-0000-000000000002",
    documentId: "doc-1",
    evidenceText: "See IS 269 clause 5.2 for cement grade requirements.",
    confidence: 0.9,
    ...overrides,
  };
}

describe("validateRelationshipCandidate", () => {
  test("accepts a well-formed candidate with a document and evidence text", () => {
    expect(validateRelationshipCandidate(candidate())).toEqual({ valid: true });
  });

  test("rejects an unknown relationship type", () => {
    // @ts-expect-error deliberately invalid for the test
    const result = validateRelationshipCandidate(candidate({ relationshipType: "MADE_UP_RELATIONSHIP" }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/unknown relationship type/i);
  });

  test("rejects a candidate with no document and no source — the core anti-fabrication rule", () => {
    const result = validateRelationshipCandidate(candidate({ documentId: null, sourceId: null }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/cannot be anonymous/i);
  });

  test("accepts a candidate backed by sourceId alone (no documentId)", () => {
    const result = validateRelationshipCandidate(candidate({ documentId: null, sourceId: "src-1" }));
    expect(result.valid).toBe(true);
  });

  test("rejects a candidate with empty evidence text", () => {
    const result = validateRelationshipCandidate(candidate({ evidenceText: "   " }));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/evidence text/i);
  });

  test("rejects a self-referencing relationship", () => {
    const result = validateRelationshipCandidate(
      candidate({ targetEntityId: "aaaaaaaa-0000-0000-0000-000000000001", targetEntityType: "standard" }),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/itself/i);
  });

  test("rejects an out-of-range confidence value", () => {
    expect(validateRelationshipCandidate(candidate({ confidence: 1.5 })).valid).toBe(false);
    expect(validateRelationshipCandidate(candidate({ confidence: -0.1 })).valid).toBe(false);
  });

  test("allows a null confidence (not every extraction method produces a score)", () => {
    expect(validateRelationshipCandidate(candidate({ confidence: null })).valid).toBe(true);
  });
});

describe("isKnownRelationshipType", () => {
  test("recognizes a real type", () => {
    expect(isKnownRelationshipType("STANDARD_HAS_TESTING_REQUIREMENT")).toBe(true);
  });

  test("rejects a fabricated type", () => {
    expect(isKnownRelationshipType("STANDARD_IS_VIBING_WITH_STANDARD")).toBe(false);
  });
});
