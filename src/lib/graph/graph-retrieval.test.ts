// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { getNeighbors } from "./graph-retrieval";
import type { relationships } from "@/db/schema";

const findMany = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({ query: { relationships: { findMany } } }),
}));

type RelationshipRow = typeof relationships.$inferSelect;

const STANDARD = "11111111-1111-1111-1111-111111111111";
const QCO = "22222222-2222-2222-2222-222222222222";
const MANUAL = "33333333-3333-3333-3333-333333333333";

function edge(overrides: Partial<RelationshipRow>): RelationshipRow {
  return {
    id: "rel-1",
    sourceEntityType: "standard",
    sourceEntityId: STANDARD,
    relationshipType: "STANDARD_SUBJECT_TO_QCO",
    targetEntityType: "qco",
    targetEntityId: QCO,
    documentId: null,
    sourceId: "source-1",
    evidenceText: "Covered by the QCO notification.",
    confidence: 1,
    verificationStatus: "verified",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

beforeEach(() => {
  findMany.mockReset();
});

describe("getNeighbors", () => {
  test("no relationship rows means no neighbors, never a fabricated edge", async () => {
    findMany.mockResolvedValue([]);
    expect(await getNeighbors("standard", STANDARD)).toEqual([]);
  });

  test("an edge stored from this entity is outgoing and names the other side", async () => {
    findMany.mockResolvedValue([edge({})]);
    expect(await getNeighbors("standard", STANDARD)).toEqual([
      {
        relationshipId: "rel-1",
        relationshipType: "STANDARD_SUBJECT_TO_QCO",
        direction: "outgoing",
        otherEntityType: "qco",
        otherEntityId: QCO,
        evidenceText: "Covered by the QCO notification.",
        confidence: 1,
        verificationStatus: "verified",
        documentId: null,
        sourceId: "source-1",
      },
    ]);
  });

  test("the same edge looked up from the QCO side is incoming and points back at the standard", async () => {
    findMany.mockResolvedValue([edge({})]);
    const [neighbor] = await getNeighbors("qco", QCO);
    expect(neighbor).toMatchObject({ direction: "incoming", otherEntityType: "standard", otherEntityId: STANDARD });
  });

  test("a row whose id matches but whose entity type does not is excluded", async () => {
    // The query filters by id only; an id collision across entity types must not leak through.
    findMany.mockResolvedValue([edge({})]);
    expect(await getNeighbors("product", STANDARD)).toEqual([]);
    expect(await getNeighbors("document", QCO)).toEqual([]);
  });

  test("mixed directions are all returned, in row order", async () => {
    findMany.mockResolvedValue([
      edge({ id: "rel-qco" }),
      edge({
        id: "rel-manual",
        relationshipType: "STANDARD_HAS_PRODUCT_MANUAL",
        sourceEntityType: "document",
        sourceEntityId: MANUAL,
        targetEntityType: "standard",
        targetEntityId: STANDARD,
        documentId: MANUAL,
        confidence: null,
        verificationStatus: "needs_review",
      }),
    ]);
    const neighbors = await getNeighbors("standard", STANDARD);
    expect(neighbors.map((n) => [n.relationshipId, n.direction, n.otherEntityId])).toEqual([
      ["rel-qco", "outgoing", QCO],
      ["rel-manual", "incoming", MANUAL],
    ]);
    expect(neighbors[1]).toMatchObject({ confidence: null, verificationStatus: "needs_review", documentId: MANUAL });
  });

  test("database errors propagate to the caller rather than being reported as 'no neighbors'", async () => {
    findMany.mockImplementation(async () => {
      throw new Error("connection refused");
    });
    await expect(getNeighbors("standard", STANDARD)).rejects.toThrow("connection refused");
  });
});
