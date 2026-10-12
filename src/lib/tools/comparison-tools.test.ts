// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { compareStandardsTool } from "./comparison-tools";
import type { standards } from "@/db/schema";

// findFirst is called once per standard (A then B); where() once per
// standard's evidence lookup (A then B). Both run via Promise.all in that
// order, so queued mockResolvedValueOnce values line up with A and B.
const findFirst = vi.fn();
const where = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({
    query: { standards: { findFirst } },
    select: () => ({ from: () => ({ innerJoin: () => ({ where }) }) }),
  }),
}));

type StandardRow = typeof standards.$inferSelect;

function row(canonicalNumber: string, overrides: Partial<StandardRow> = {}): StandardRow {
  return {
    id: `id-${canonicalNumber}`,
    canonicalNumber,
    normalizedNumber: canonicalNumber.replace(/\D+(\d+).*/, "$1"),
    title: `Title of ${canonicalNumber}`,
    editionYear: "2015",
    status: "active",
    technicalDepartment: null,
    classification: null,
    domain: "electrical",
    sourceUrl: null,
    lastVerifiedAt: null,
    verificationStatus: "verified",
    createdAt: new Date(0),
    ...overrides,
  };
}

function givenStandards(a: StandardRow | undefined, b: StandardRow | undefined) {
  findFirst.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
}

function givenEvidence(a: string[], b: string[]) {
  where.mockResolvedValueOnce(a.map((text) => ({ text }))).mockResolvedValueOnce(b.map((text) => ({ text })));
}

const compare = (a = "IS 302 (Part 1):2008", b = "IS 302 (Part 2/Sec 6):2009") =>
  compareStandardsTool.execute({ canonicalNumberA: a, canonicalNumberB: b });

beforeEach(() => {
  findFirst.mockReset();
  where.mockReset();
});

describe("compareStandardsTool", () => {
  test("is declared deterministic and rejects empty identifiers", () => {
    expect(compareStandardsTool.deterministic).toBe(true);
    expect(compareStandardsTool.inputSchema.safeParse({ canonicalNumberA: "", canonicalNumberB: "IS 1" }).success).toBe(false);
  });

  test.each([
    ["A", undefined, row("IS 2")],
    ["B", row("IS 1"), undefined],
  ])("an unknown standard %s is not_found, with no data invented", async (_side, a, b) => {
    givenStandards(a, b);
    const result = await compare("IS 1", "IS 2");
    expect(result).toEqual({ status: "not_found" });
    expect(where).not.toHaveBeenCalled();
  });

  test("two parts of the same base standard are a real version relationship", async () => {
    givenStandards(row("IS 302 (Part 1):2008"), row("IS 302 (Part 2/Sec 6):2009"));
    givenEvidence([], []);
    expect((await compare()).data!.sameBaseStandard).toBe(true);
  });

  test("different base standards, or non-IS identifiers, are not", async () => {
    givenStandards(row("IS 302:2008"), row("IS 3021:2008"));
    givenEvidence([], []);
    expect((await compare("IS 302:2008", "IS 3021:2008")).data!.sameBaseStandard).toBe(false);

    givenStandards(row("ISO 9001:2015"), row("ISO 9001:2008"));
    givenEvidence([], []);
    expect((await compare("ISO 9001:2015", "ISO 9001:2008")).data!.sameBaseStandard).toBe(false);
  });

  test("reports only the metadata fields that actually differ", async () => {
    givenStandards(
      row("IS 302 (Part 1):2008", { editionYear: "2008", status: "active", classification: "A" }),
      row("IS 302 (Part 2/Sec 6):2009", { editionYear: "2009", status: "superseded", classification: "A" }),
    );
    givenEvidence([], []);
    expect((await compare()).data!.fieldDifferences).toEqual([
      { field: "editionYear", a: "2008", b: "2009" },
      { field: "status", a: "active", b: "superseded" },
    ]);
  });

  test("overlapping terms are the sorted significant words found in both standards' evidence", async () => {
    givenStandards(row("IS 302 (Part 1):2008"), row("IS 302 (Part 2/Sec 6):2009"));
    givenEvidence(
      ["Household appliances shall withstand the leakage current test.", "Marking and instructions."],
      ["Water heaters are household appliances.", "Leakage current is measured at rated voltage."],
    );
    const { data } = await compare();
    expect(data!.overlappingTerms).toEqual(["appliances", "current", "household", "leakage"]);
    expect(data!.evidenceAvailable).toEqual({ standardA: true, standardB: true });
  });

  test("with evidence missing for either side, overlap is empty and the gap is named", async () => {
    givenStandards(row("IS 302 (Part 1):2008"), row("IS 302 (Part 2/Sec 6):2009"));
    givenEvidence(["Household appliances."], []);
    const { data } = await compare();
    expect(data!.overlappingTerms).toEqual([]);
    expect(data!.evidenceAvailable).toEqual({ standardA: true, standardB: false });
    expect(data!.limitations[0]).toMatch(/No ingested document text is available for IS 302 \(Part 2\/Sec 6\):2009/);
  });

  test("always states that it makes no legal-precedence ruling", async () => {
    givenStandards(row("IS 302 (Part 1):2008"), row("IS 302 (Part 2/Sec 6):2009"));
    givenEvidence(["a"], ["b"]);
    const { data } = await compare();
    expect(data!.limitations.at(-1)).toMatch(/does not determine which standard takes legal precedence/);
  });

  test("returns both records and provenance for every source consulted", async () => {
    givenStandards(row("IS 302 (Part 1):2008"), row("IS 302 (Part 2/Sec 6):2009", { verificationStatus: "unverified" }));
    givenEvidence([], []);
    const result = await compare();
    expect(result.status).toBe("ok");
    expect(result.data!.standardA).toMatchObject({ canonicalNumber: "IS 302 (Part 1):2008", standardId: "id-IS 302 (Part 1):2008" });
    expect(result.data!.standardB.verificationStatus).toBe("unverified");
    expect(result.provenance).toEqual([
      { source: "standards table", verificationStatus: "verified" },
      { source: "standards table", verificationStatus: "unverified" },
      { source: "chunks table (ingested evidence)" },
    ]);
  });
});
