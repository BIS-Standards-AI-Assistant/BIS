import { describe, test, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const findFirst = vi.fn();
let dbRequested = 0;
vi.mock("@/db", () => ({
  getDb: () => {
    dbRequested++;
    return { query: { standards: { findMany, findFirst } } };
  },
}));

const resolveScopedContext = vi.fn();
vi.mock("./chat-context", () => ({ resolveScopedContext: (n: string[]) => resolveScopedContext(n) }));

import { analyzeDocumentText } from "./document-analyzer";

beforeEach(() => {
  dbRequested = 0;
  findMany.mockReset();
  findFirst.mockReset();
  resolveScopedContext.mockReset().mockResolvedValue([]);
});

const PREAMBLE = "This test report covers the following normative references for the product. ";

describe("analyzeDocumentText — identifier lookup", () => {
  test("looks every cited standard up in a single query, not one query per standard", async () => {
    const cited = Array.from({ length: 40 }, (_, i) => `IS ${1000 + i}:2015`);
    findMany.mockResolvedValue([{ id: "std-1", canonicalNumber: "IS 1003:2015", title: "Indexed one" }]);

    const result = await analyzeDocumentText(PREAMBLE + cited.join(", ") + ".");

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findFirst).not.toHaveBeenCalled();
    expect(result.identifiersFound).toHaveLength(40);
    const indexed = result.identifiersFound.filter((m) => m.inDatabase);
    expect(indexed).toEqual([
      { identifierText: expect.any(String), resolvedNumber: "IS 1003:2015", inDatabase: true, standardId: "std-1", title: "Indexed one" },
    ]);
    expect(resolveScopedContext).toHaveBeenCalledWith(["IS 1003:2015"]);
  });

  test("a standard cited twice is looked up and reported once", async () => {
    findMany.mockResolvedValue([]);
    const result = await analyzeDocumentText(`${PREAMBLE}IS 5522:2014 applies. See also IS 5522:2014, clause 4.`);
    expect(result.identifiersFound.map((m) => m.resolvedNumber)).toEqual(["IS 5522:2014"]);
    expect(result.identifiersFound[0]).toMatchObject({ inDatabase: false, standardId: null, title: null });
  });

  test("a document citing no standards needs no database at all", async () => {
    const result = await analyzeDocumentText(`${PREAMBLE}It names no Indian Standard anywhere in its text at all.`);
    expect(dbRequested).toBe(0);
    expect(result.identifiersFound).toEqual([]);
    expect(result.limitations[0]).toMatch(/no indian standard identifiers were found/i);
  });
});
