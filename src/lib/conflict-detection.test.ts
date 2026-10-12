import { describe, test, expect } from "vitest";
import { baseStandardNumber, detectConflicts } from "./conflict-detection";
import type { AggregatedEvidence } from "./evidence-aggregation";
import type { RetrievedChunk } from "./retrieval";

function chunk(text: string): RetrievedChunk {
  return {
    chunkId: "c",
    documentId: "d",
    standardNumber: null,
    title: "",
    sourceUrl: "",
    sourceOrg: "BIS",
    section: null,
    clause: null,
    page: null,
    text,
    semanticScore: 0,
    semanticSimilarity: null,
    keywordScore: 0,
    identifierMatch: false,
    score: 0,
    rerankReason: "",
  };
}

function candidate(standardNumber: string | null, ...texts: string[]): AggregatedEvidence {
  return {
    documentId: standardNumber ?? "unnumbered",
    standardNumber,
    title: "",
    sourceUrl: "",
    sourceOrg: "BIS",
    chunkCount: texts.length,
    bestChunkScore: 0,
    meanChunkScore: 0,
    weightedScore: 0,
    clauseDiversity: 0,
    identifierMatch: false,
    multiSourceChunkCount: 0,
    chunks: texts.map(chunk),
  };
}

describe("baseStandardNumber", () => {
  test.each([
    ["IS 302 (Part 2/Sec 6):2009", "IS 302"],
    ["IS 15410:2003", "IS 15410"],
    ["is 1293", "IS 1293"],
    ["IS2082:2018", "IS 2082"],
  ])("%j -> %j", (input, expected) => {
    expect(baseStandardNumber(input)).toBe(expected);
  });

  test("returns null when there is no IS number to compare on", () => {
    expect(baseStandardNumber("ISO 9001:2015")).toBeNull();
    expect(baseStandardNumber("IEC 60335")).toBeNull();
    expect(baseStandardNumber("")).toBeNull();
  });
});

describe("detectConflicts", () => {
  test("no candidates, no conflicts", () => {
    expect(detectConflicts([])).toEqual([]);
  });

  test("plain, consistent evidence raises nothing", () => {
    expect(detectConflicts([candidate("IS 1293:2019", "Plugs and socket outlets shall be tested.")])).toEqual([]);
  });

  test("two editions of the same base standard are a version conflict naming both", () => {
    const conflicts = detectConflicts([
      candidate("IS 302 (Part 1):2008", "General requirements."),
      candidate("IS 302 (Part 2/Sec 6):2009", "Particular requirements."),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("version_conflict");
    expect(conflicts[0].affectedStandards.sort()).toEqual(["IS 302 (Part 1):2008", "IS 302 (Part 2/Sec 6):2009"]);
    expect(conflicts[0].description).toContain("IS 302");
  });

  test("the same standard retrieved twice is not a version conflict", () => {
    const conflicts = detectConflicts([candidate("IS 1293:2019", "a"), candidate("IS 1293:2019", "b")]);
    expect(conflicts.filter((c) => c.type === "version_conflict")).toEqual([]);
  });

  test("different base standards never conflict with each other", () => {
    const conflicts = detectConflicts([candidate("IS 302:2008", "a"), candidate("IS 3021:2008", "b")]);
    expect(conflicts).toEqual([]);
  });

  test.each(["superseded", "Withdrawn", "OBSOLETE"])("%j language flags a superseded standard", (word) => {
    const conflicts = detectConflicts([candidate("IS 269:2015", `This edition is ${word} by a later revision.`)]);
    expect(conflicts).toEqual([
      expect.objectContaining({ type: "superseded_standard", affectedStandards: ["IS 269:2015"] }),
    ]);
  });

  test("superseded language is matched as a whole word only", () => {
    expect(detectConflicts([candidate("IS 269:2015", "Obsolescence management is out of scope.")])).toEqual([]);
  });

  test("mandatory and voluntary language in the same standard's evidence is flagged, even across chunks", () => {
    const conflicts = detectConflicts([
      candidate("IS 15757:2022", "Certification is compulsory for this product.", "The marking scheme is voluntary."),
    ]);
    expect(conflicts.map((c) => c.type)).toEqual(["evidence_conflict"]);
  });

  test("only one side of mandatory/voluntary is not a conflict", () => {
    expect(detectConflicts([candidate("IS 15757:2022", "Certification is mandatory.")])).toEqual([]);
    expect(detectConflicts([candidate("IS 15757:2022", "Certification is voluntary.")])).toEqual([]);
  });

  test("candidates without a standard number are ignored entirely", () => {
    expect(detectConflicts([candidate(null, "This was withdrawn. It is mandatory but also voluntary.")])).toEqual([]);
  });

  test("several signals on one standard are all reported", () => {
    const conflicts = detectConflicts([
      candidate("IS 14543:2016", "Withdrawn. Registration is mandatory; labelling is voluntary."),
      candidate("IS 14543:2004", "Earlier edition."),
    ]);
    expect(conflicts.map((c) => c.type).sort()).toEqual(["evidence_conflict", "superseded_standard", "version_conflict"]);
  });
});
