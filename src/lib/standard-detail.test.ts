// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { getStandardDetail, sanitizeOfficialUrl } from "./standard-detail";

// The database is mocked; the QCO dataset and seed manifest are the real
// shipped files, so these tests also catch a dataset change that would
// break a standard's page.
const findFirst = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({ query: { documents: { findFirst } } }),
}));

const BIS_DEFAULT = "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en";

beforeEach(() => {
  findFirst.mockReset();
  findFirst.mockResolvedValue(undefined);
});

describe("sanitizeOfficialUrl", () => {
  test("keeps a normal official URL", () => {
    expect(sanitizeOfficialUrl("https://bis.gov.in/wp-content/uploads/2019/05/PM5522-final.pdf")).toBe(
      "https://bis.gov.in/wp-content/uploads/2019/05/PM5522-final.pdf",
    );
  });

  test.each([
    [undefined],
    [null],
    [""],
    ["https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails/14543"],
    ["https://www.standardsbis.in/Gemini/search/Browse.action"],
  ])("replaces %j with the BIS compulsory-certification page", (url) => {
    expect(sanitizeOfficialUrl(url)).toBe(BIS_DEFAULT);
  });
});

describe("getStandardDetail — database documents", () => {
  test("an ingested document is returned with ISO dates and a sanitized source URL", async () => {
    findFirst.mockResolvedValue({
      id: "doc-1",
      standardNumber: "IS 1293:2019",
      title: "Plugs and Socket-Outlets",
      documentType: "standard",
      sourceUrl: "https://www.standardsbis.in/x",
      sourceOrg: "BIS",
      version: null,
      publicationDate: null,
      retrievedAt: new Date("2026-08-01T00:00:00Z"),
      checksum: "abc",
      createdAt: new Date("2026-08-02T00:00:00Z"),
      chunks: [{ id: "c1", documentId: "doc-1", section: null, clause: "4.1", page: 2, text: "t", metadata: null, createdAt: new Date("2026-08-03T00:00:00Z") }],
    });
    const detail = await getStandardDetail("doc-1");
    expect(detail).toMatchObject({
      id: "doc-1",
      sourceUrl: BIS_DEFAULT,
      retrievedAt: "2026-08-01T00:00:00.000Z",
      createdAt: "2026-08-02T00:00:00.000Z",
    });
    expect(detail!.chunks[0].createdAt).toBe("2026-08-03T00:00:00.000Z");
  });

  test("a database failure falls back to the reference datasets instead of failing the page", async () => {
    findFirst.mockRejectedValue(new Error("connection refused"));
    expect((await getStandardDetail("is-14543"))?.standardNumber).toBe("IS 14543:2024");
  });
});

describe("getStandardDetail — QCO reference dataset", () => {
  test.each(["is-14543", "IS%2014543", "IS 14543", "BIS-STD-001", "std-1"])(
    "%j resolves to the IS 14543 record",
    async (id) => {
      const detail = await getStandardDetail(id);
      expect(detail?.standardNumber).toBe("IS 14543:2024");
      expect(detail?.title).toBe("Packaged Drinking Water (Other than Packaged Natural Mineral Water) - Specification");
    },
  );

  test("builds scope, testing and gazette passages from the record", async () => {
    const detail = (await getStandardDetail("is-14543"))!;
    expect(detail.chunks.map((c) => c.section)).toEqual([
      "Scope & Applicability",
      "Key Testing Parameters",
      "Official Gazette Notification",
    ]);
    expect(detail.chunks[1].text).toContain("• Total Dissolved Solids (TDS)");
    expect(detail.keyTestingParameters).toHaveLength(4);
    expect(detail.legalGazette).not.toBeNull();
    expect(detail.checksum).toBe("reference_dataset_sha256");
    expect(detail.version).toBe("2024");
  });

  test("an unusable BIS_2.0 document link is replaced with the official BIS page", async () => {
    expect((await getStandardDetail("is-14543"))!.sourceUrl).toBe(BIS_DEFAULT);
  });

  test("records with a part number resolve by slug", async () => {
    const detail = await getStandardDetail("is-13252-part-1");
    expect(detail?.title).toBe("Information Technology Equipment - Safety - General Requirements");
  });
});

describe("getStandardDetail — seed manifest", () => {
  test.each(["is-5522-2014", "IS 5522:2014"])("%j resolves to the indexed seed document", async (id) => {
    const detail = await getStandardDetail(id);
    expect(detail).toMatchObject({
      standardNumber: "IS 5522:2014",
      title: "Stainless Steel Sheets and Strips for Utensils",
      sourceUrl: "https://bis.gov.in/wp-content/uploads/2019/05/PM5522-final.pdf",
      checksum: "seed_manifest_verified",
    });
    expect(detail!.chunks.length).toBeGreaterThan(0);
    expect(detail!.chunks.every((c) => c.documentId === id.trim())).toBe(true);
  });
});

describe("getStandardDetail — unknown ids", () => {
  test.each(["nope-123", "IS 99999:2099", ""])("%j is null, so the page 404s", async (id) => {
    expect(await getStandardDetail(id)).toBeNull();
  });
});
