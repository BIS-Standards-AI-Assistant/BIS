// @vitest-environment node
import { describe, test, expect, vi } from "vitest";
import { listReferenceStandards } from "./reference-standards";
import { getStandardDetail } from "./standard-detail";
import { findCertificationSchemeForStandard } from "./certification-schemes";

vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("no database in tests");
  },
}));

describe("listReferenceStandards", () => {
  test("lists every record in the reference dataset with a unique id", async () => {
    const rows = await listReferenceStandards();
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  test("uses the canonical identifier form", async () => {
    const rows = await listReferenceStandards();
    expect(rows.find((r) => r.id === "is-13252-part-1")?.standardNumber).toBe("IS 13252 (Part 1):2010");
    expect(rows.every((r) => !/ Part \d/.test(r.standardNumber ?? "") || /\(Part \d/.test(r.standardNumber ?? ""))).toBe(true);
  });

  test("claims no indexed sections — these records are not in the retrieval index", async () => {
    for (const row of await listReferenceStandards()) expect(row.chunkCount, row.id).toBe(0);
  });

  test("shows scheme and mandatory status from the record", async () => {
    const row = (await listReferenceStandards()).find((r) => r.id === "is-13252-part-1")!;
    expect(row.documentType.startsWith("Scheme-II (CRS) · ")).toBe(true);
    expect(row.version).toBe("Mandatory QCO (Active)");
  });

  // The register links each row to /standards/<id>. That page must open the
  // same standard, and must find its certification scheme.
  test("every row's link opens the same standard, with its scheme", async () => {
    const problems: string[] = [];
    for (const row of await listReferenceStandards()) {
      const detail = await getStandardDetail(row.id);
      if (!detail) problems.push(`${row.id}: 404`);
      else if (detail.standardNumber !== row.standardNumber) problems.push(`${row.id}: opens ${detail.standardNumber}, listed as ${row.standardNumber}`);
      else if (!(await findCertificationSchemeForStandard(detail.standardNumber))) problems.push(`${row.id}: no scheme`);
    }
    expect(problems).toEqual([]);
  });
});
