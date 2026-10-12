// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  findApplicableStandardsTool,
  getStandardTool,
  resolveStandardTool,
  searchStandardsTool,
} from "./standards-tools";
import type { standards } from "@/db/schema";
import type { RetrievedChunk } from "../retrieval";

const findMany = vi.fn();
const findFirst = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({ query: { standards: { findMany, findFirst } } }),
}));

const retrieveChunks = vi.fn();
vi.mock("../retrieval", () => ({
  retrieveChunks: (...args: unknown[]) => retrieveChunks(...args),
}));

type StandardRow = typeof standards.$inferSelect;

function row(canonicalNumber: string, overrides: Partial<StandardRow> = {}): StandardRow {
  return {
    id: `id-${canonicalNumber}`,
    canonicalNumber,
    normalizedNumber: canonicalNumber.match(/IS\s*(\d+)/)?.[1] ?? "",
    title: `Title of ${canonicalNumber}`,
    editionYear: "2019",
    status: "active",
    technicalDepartment: "ETD",
    classification: null,
    domain: "electrical",
    sourceUrl: "https://example.test",
    lastVerifiedAt: null,
    verificationStatus: "verified",
    createdAt: new Date(0),
    ...overrides,
  };
}

function chunk(documentId: string, score: number, standardNumber: string | null = documentId): RetrievedChunk {
  return {
    chunkId: `${documentId}-${score}`,
    documentId,
    standardNumber,
    title: `Title ${documentId}`,
    sourceUrl: "",
    sourceOrg: "BIS",
    section: null,
    clause: null,
    page: null,
    text: "",
    semanticScore: 0,
    semanticSimilarity: null,
    keywordScore: 0,
    identifierMatch: false,
    score,
    rerankReason: "",
  };
}

beforeEach(() => {
  findMany.mockReset();
  findFirst.mockReset();
  retrieveChunks.mockReset();
});

describe("resolveStandardTool", () => {
  test("text with no standard identifier is not_found without touching the database", async () => {
    expect(await resolveStandardTool.execute({ query: "steel water bottle" })).toEqual({ status: "not_found" });
    expect(findMany).not.toHaveBeenCalled();
  });

  test("an identifier the database does not know is not_found", async () => {
    findMany.mockResolvedValue([]);
    expect(await resolveStandardTool.execute({ query: "IS 99999:2099" })).toEqual({ status: "not_found" });
  });

  test("known identifiers come back as records with per-row provenance", async () => {
    findMany.mockResolvedValue([row("IS 1293:2019"), row("IS 302:2008", { verificationStatus: "unverified" })]);
    const result = await resolveStandardTool.execute({ query: "compare IS 1293:2019 with IS 302:2008" });
    expect(result.status).toBe("ok");
    expect(result.data!.map((r) => r.canonicalNumber)).toEqual(["IS 1293:2019", "IS 302:2008"]);
    expect(result.provenance).toEqual([
      { source: "standards table", verificationStatus: "verified" },
      { source: "standards table", verificationStatus: "unverified" },
    ]);
  });

  test("records expose only the public StandardRecord fields", async () => {
    findMany.mockResolvedValue([row("IS 1293:2019")]);
    const [record] = (await resolveStandardTool.execute({ query: "IS 1293:2019" })).data!;
    expect(Object.keys(record).sort()).toEqual(
      ["canonicalNumber", "domain", "editionYear", "normalizedNumber", "sourceUrl", "standardId", "status", "title", "verificationStatus"],
    );
  });

  test("rejects an empty query", () => {
    expect(resolveStandardTool.inputSchema.safeParse({ query: "" }).success).toBe(false);
  });
});

describe("getStandardTool", () => {
  test("requires an id or a canonical number, and the id must be a uuid", () => {
    expect(getStandardTool.inputSchema.safeParse({}).success).toBe(false);
    expect(getStandardTool.inputSchema.safeParse({ standardId: "not-a-uuid" }).success).toBe(false);
    expect(getStandardTool.inputSchema.safeParse({ canonicalNumber: "IS 1293:2019" }).success).toBe(true);
    expect(getStandardTool.inputSchema.safeParse({ standardId: "3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f" }).success).toBe(true);
  });

  test("returns the record with provenance when found", async () => {
    findFirst.mockResolvedValue(row("IS 1293:2019"));
    const result = await getStandardTool.execute({ canonicalNumber: "IS 1293:2019" });
    expect(result).toMatchObject({
      status: "ok",
      data: { canonicalNumber: "IS 1293:2019", standardId: "id-IS 1293:2019" },
      provenance: [{ source: "standards table", verificationStatus: "verified" }],
    });
  });

  test("is not_found when there is no row", async () => {
    findFirst.mockResolvedValue(undefined);
    expect(await getStandardTool.execute({ canonicalNumber: "IS 1:2000" })).toEqual({ status: "not_found" });
  });
});

describe.each([
  ["searchStandardsTool", searchStandardsTool],
  ["findApplicableStandardsTool", findApplicableStandardsTool],
])("%s", (_name, tool) => {
  test("over-fetches chunks so aggregation has enough to fill the limit", async () => {
    retrieveChunks.mockResolvedValue([]);
    await tool.execute({ query: "helmet", limit: 4 });
    expect(retrieveChunks).toHaveBeenCalledWith("helmet", { limit: 12 });
  });

  test("defaults the limit to 8 and caps it at 20", () => {
    expect(tool.inputSchema.parse({ query: "helmet" }).limit).toBe(8);
    expect(tool.inputSchema.safeParse({ query: "helmet", limit: 21 }).success).toBe(false);
    expect(tool.inputSchema.safeParse({ query: "helmet", limit: 0 }).success).toBe(false);
  });

  test("no retrieval hits is not_found", async () => {
    retrieveChunks.mockResolvedValue([]);
    expect(await tool.execute({ query: "helmet", limit: 8 })).toEqual({ status: "not_found" });
  });

  test("hits are aggregated per standard, ranked, and trimmed to the limit", async () => {
    retrieveChunks.mockResolvedValue([
      chunk("IS 4151", 0.03),
      chunk("IS 4151", 0.02),
      chunk("IS 2925", 0.025),
      chunk("IS 1", 0.001),
    ]);
    const result = await tool.execute({ query: "helmet", limit: 2 });
    expect(result.status).toBe("ok");
    expect(result.data!.map((h) => [h.standardNumber, h.chunkCount])).toEqual([
      ["IS 4151", 2],
      ["IS 2925", 1],
    ]);
    expect(result.data![0].score).toBeCloseTo(0.03 + 0.02 * 0.5);
    expect(result.provenance).toEqual([{ source: "hybrid retrieval (chunks table)" }]);
  });
});
