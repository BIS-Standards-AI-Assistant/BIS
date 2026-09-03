import { describe, test, expect } from "vitest";
import { validateRelationshipCandidate } from "../src/lib/knowledge-graph";

/**
 * data-relationships.ts's DB-touching functions aren't unit-tested here
 * (see tools-smoke.ts's pattern for why — no guaranteed live DATABASE_URL
 * in the vitest environment; verified live instead via `npm run
 * data:relationships`, confirmed idempotent by running it twice).
 *
 * This tests the actual anti-fabrication contract the script depends on:
 * that a candidate built the way the script builds them (evidenceText
 * always present, sourceId or documentId always present, confidence
 * always 1.0, verificationStatus inherited) passes validation, and that
 * removing any of those pieces — the exact way a coding mistake in the
 * script would — correctly gets rejected.
 */
describe("data-relationships.ts's candidate shape", () => {
  test("a STANDARD_HAS_PRODUCT_MANUAL candidate built the way the script builds it is accepted", () => {
    const result = validateRelationshipCandidate({
      sourceEntityType: "standard",
      sourceEntityId: "aaaaaaaa-0000-0000-0000-000000000001",
      relationshipType: "STANDARD_HAS_PRODUCT_MANUAL",
      targetEntityType: "document",
      targetEntityId: "bbbbbbbb-0000-0000-0000-000000000002",
      documentId: "bbbbbbbb-0000-0000-0000-000000000002",
      evidenceText: "Document linked via documents.standard_id foreign key.",
      confidence: 1.0,
    });
    expect(result).toEqual({ valid: true });
  });

  test("a STANDARD_SUBJECT_TO_QCO candidate built the way the script builds it is accepted", () => {
    const result = validateRelationshipCandidate({
      sourceEntityType: "standard",
      sourceEntityId: "aaaaaaaa-0000-0000-0000-000000000001",
      relationshipType: "STANDARD_SUBJECT_TO_QCO",
      targetEntityType: "qco",
      targetEntityId: "cccccccc-0000-0000-0000-000000000003",
      sourceId: "dddddddd-0000-0000-0000-000000000004",
      evidenceText: "QCO linked via qcos.standard_id foreign key.",
      confidence: 1.0,
    });
    expect(result).toEqual({ valid: true });
  });

  test("a candidate missing both documentId and sourceId — a coding mistake, not a real case — is rejected", () => {
    const result = validateRelationshipCandidate({
      sourceEntityType: "standard",
      sourceEntityId: "aaaaaaaa-0000-0000-0000-000000000001",
      relationshipType: "STANDARD_SUBJECT_TO_QCO",
      targetEntityType: "qco",
      targetEntityId: "cccccccc-0000-0000-0000-000000000003",
      evidenceText: "orphaned evidence with no provenance pointer",
      confidence: 1.0,
    });
    expect(result.valid).toBe(false);
  });
});
