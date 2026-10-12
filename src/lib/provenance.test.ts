import { describe, test, expect } from "vitest";
import {
  CONFIDENCE,
  PROVENANCE,
  confidenceFromGrounding,
  isAuthoritative,
  type ConfidenceLevel,
  type Provenance,
} from "./provenance";

const PROVENANCES = Object.keys(PROVENANCE) as Provenance[];
const LEVELS = Object.keys(CONFIDENCE) as ConfidenceLevel[];

describe("PROVENANCE", () => {
  test("covers exactly the four provenance kinds", () => {
    expect(PROVENANCES.sort()).toEqual(["ai", "inference", "official", "user"]);
  });

  test("labels are distinct, so a reader can always tell the kinds apart", () => {
    const labels = PROVENANCES.map((p) => PROVENANCE[p].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("every non-official description warns the reader in some way", () => {
    expect(PROVENANCE.user.description).toMatch(/not verified/i);
    expect(PROVENANCE.ai.description).toMatch(/check the source/i);
    expect(PROVENANCE.inference.description).toMatch(/not stated/i);
  });

  test("only official evidence is authoritative", () => {
    expect(PROVENANCES.filter(isAuthoritative)).toEqual(["official"]);
  });
});

describe("CONFIDENCE", () => {
  test("labels and meanings are present and distinct", () => {
    const labels = LEVELS.map((l) => CONFIDENCE[l].label);
    const meanings = LEVELS.map((l) => CONFIDENCE[l].meaning);
    expect(new Set(labels).size).toBe(LEVELS.length);
    expect(new Set(meanings).size).toBe(LEVELS.length);
  });

  test("no label or meaning expresses confidence as a percentage", () => {
    for (const level of LEVELS) {
      expect(CONFIDENCE[level].label).not.toMatch(/\d\s*%/);
      expect(CONFIDENCE[level].meaning).not.toMatch(/\d\s*%/);
    }
  });

  test("tone gets stricter as confidence falls", () => {
    expect(CONFIDENCE.high.tone).toBe("success");
    expect(CONFIDENCE.likely.tone).toBe("success");
    expect(CONFIDENCE.possible.tone).toBe("warning");
    expect(CONFIDENCE["needs-verification"].tone).toBe("warning");
    expect(CONFIDENCE.insufficient.tone).toBe("danger");
  });
});

describe("confidenceFromGrounding", () => {
  test.each([
    ["verified", "high"],
    ["supported_inference", "likely"],
    ["insufficient_evidence", "insufficient"],
  ] as const)("%s -> %s", (grounding, level) => {
    expect(confidenceFromGrounding(grounding)).toBe(level);
  });

  test("insufficient evidence is never dressed up as a weak answer", () => {
    expect(confidenceFromGrounding("insufficient_evidence")).not.toBe("possible");
    expect(CONFIDENCE[confidenceFromGrounding("insufficient_evidence")].meaning).toMatch(/nothing is being asserted/i);
  });
});
