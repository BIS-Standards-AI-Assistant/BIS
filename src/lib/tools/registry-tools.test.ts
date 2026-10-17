// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { getGraphNeighborsTool, getReferenceEntryTool } from "./registry-tools";
import type { ReferenceEntry } from "../reference-registry";
import type { GraphNeighbor } from "../graph/graph-retrieval";

const buildReferenceEntry = vi.fn();
vi.mock("../reference-registry", () => ({
  buildReferenceEntry: (...args: unknown[]) => buildReferenceEntry(...args),
}));

const getNeighbors = vi.fn();
vi.mock("../graph/graph-retrieval", () => ({
  getNeighbors: (...args: unknown[]) => getNeighbors(...args),
}));

const STANDARD_ID = "3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f";

function entry(overrides: Partial<ReferenceEntry> = {}): ReferenceEntry {
  return {
    standardId: STANDARD_ID,
    standardNumber: "IS 1293:2019",
    title: "Plugs and Socket-Outlets",
    edition: "2019",
    status: "active",
    bisSourceUrl: null,
    officialDocumentUrl: null,
    accessType: "unknown",
    indexedByNavigator: false,
    indexedDocumentId: null,
    sourceVerificationStatus: "verified",
    lastVerified: null,
    notes: [],
    ...overrides,
  };
}

function neighbor(overrides: Partial<GraphNeighbor> = {}): GraphNeighbor {
  return {
    relationshipId: "rel-1",
    relationshipType: "STANDARD_SUBJECT_TO_QCO",
    direction: "outgoing",
    otherEntityType: "qco",
    otherEntityId: "qco-1",
    evidenceText: null,
    confidence: 1,
    verificationStatus: "verified",
    documentId: null,
    sourceId: null,
    ...overrides,
  };
}

beforeEach(() => {
  buildReferenceEntry.mockReset();
  getNeighbors.mockReset();
});

describe("getReferenceEntryTool", () => {
  test("an unknown standard is not_found", async () => {
    buildReferenceEntry.mockResolvedValue(null);
    expect(await getReferenceEntryTool.execute({ canonicalNumber: "IS 99999:2099" })).toEqual({ status: "not_found" });
    expect(buildReferenceEntry).toHaveBeenCalledWith("IS 99999:2099");
  });

  test("a known standard returns its entry with the entry's own verification status as provenance", async () => {
    buildReferenceEntry.mockResolvedValue(entry({ sourceVerificationStatus: "needs_review" }));
    const result = await getReferenceEntryTool.execute({ canonicalNumber: "IS 1293:2019" });
    expect(result.status).toBe("ok");
    expect(result.data!.standardNumber).toBe("IS 1293:2019");
    expect(result.provenance).toEqual([{ source: "standards table", verificationStatus: "needs_review" }]);
  });

  test("rejects an empty canonical number", () => {
    expect(getReferenceEntryTool.inputSchema.safeParse({ canonicalNumber: "" }).success).toBe(false);
  });
});

describe("getGraphNeighborsTool", () => {
  test("requires an entity type and a uuid entity id", () => {
    expect(getGraphNeighborsTool.inputSchema.safeParse({ entityType: "standard", entityId: STANDARD_ID }).success).toBe(true);
    expect(getGraphNeighborsTool.inputSchema.safeParse({ entityType: "", entityId: STANDARD_ID }).success).toBe(false);
    expect(getGraphNeighborsTool.inputSchema.safeParse({ entityType: "standard", entityId: "IS 1293" }).success).toBe(false);
  });

  test("an entity with no relationships is not_found", async () => {
    getNeighbors.mockResolvedValue([]);
    expect(await getGraphNeighborsTool.execute({ entityType: "standard", entityId: STANDARD_ID })).toEqual({ status: "not_found" });
    expect(getNeighbors).toHaveBeenCalledWith("standard", STANDARD_ID);
  });

  test("returns neighbors with one provenance entry per relationship", async () => {
    getNeighbors.mockResolvedValue([neighbor(), neighbor({ relationshipId: "rel-2", verificationStatus: "needs_review" })]);
    const result = await getGraphNeighborsTool.execute({ entityType: "standard", entityId: STANDARD_ID });
    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(2);
    expect(result.provenance).toEqual([
      { source: "relationships table", verificationStatus: "verified" },
      { source: "relationships table", verificationStatus: "needs_review" },
    ]);
  });

  test("both tools declare themselves deterministic", () => {
    expect(getReferenceEntryTool.deterministic).toBe(true);
    expect(getGraphNeighborsTool.deterministic).toBe(true);
  });
});
