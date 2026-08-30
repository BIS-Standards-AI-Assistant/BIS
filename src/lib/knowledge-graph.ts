/**
 * Shared vocabulary and guard rails for the knowledge-graph tables
 * (standards, sources, certification_schemes, qcos, relationships — see
 * src/db/schema.ts). Kept as application-level validation rather than a
 * Postgres enum so a new relationship type doesn't require a migration.
 *
 * See prompts/dataAcquisition.md §9, §17, §24.
 */

export const RELATIONSHIP_TYPES = [
  "STANDARD_APPLIES_TO_PRODUCT",
  "STANDARD_HAS_PRODUCT_MANUAL",
  "STANDARD_HAS_CERTIFICATION_SCHEME",
  "STANDARD_HAS_TESTING_REQUIREMENT",
  "STANDARD_TESTED_BY_LAB",
  "PRODUCT_REQUIRES_CERTIFICATION",
  "PRODUCT_SUBJECT_TO_QCO",
  "DOCUMENT_AMENDS_DOCUMENT",
  "DOCUMENT_REVISES_STANDARD",
  "STANDARD_REFERENCES_STANDARD",
  "STANDARD_SUPERSEDES_STANDARD",
  "STANDARD_PART_OF_STANDARD",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function isKnownRelationshipType(value: string): value is RelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

export interface RelationshipCandidate {
  sourceEntityType: string;
  sourceEntityId: string;
  relationshipType: RelationshipType;
  targetEntityType: string;
  targetEntityId: string;
  documentId?: string | null;
  sourceId?: string | null;
  evidenceText?: string | null;
  confidence?: number | null;
}

export interface RelationshipValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * The single enforcement point for prompts/dataAcquisition.md §43 ("NEVER
 * FABRICATE") and §9 ("Do NOT create a relationship unless supported by a
 * source"). Every insertion path (scripts/data-relationships.ts and any
 * future one) must call this before writing a row — a relationship with
 * no evidence and no source is not a degraded-but-acceptable record, it's
 * exactly the failure mode this schema exists to prevent.
 */
export function validateRelationshipCandidate(candidate: RelationshipCandidate): RelationshipValidationResult {
  if (!isKnownRelationshipType(candidate.relationshipType)) {
    return { valid: false, reason: `Unknown relationship type: ${candidate.relationshipType}` };
  }
  if (!candidate.documentId && !candidate.sourceId) {
    return { valid: false, reason: "A relationship must cite a document or a source — evidence cannot be anonymous." };
  }
  if (!candidate.evidenceText || candidate.evidenceText.trim().length === 0) {
    return { valid: false, reason: "A relationship must carry the actual evidence text it was extracted from." };
  }
  if (candidate.sourceEntityId === candidate.targetEntityId && candidate.sourceEntityType === candidate.targetEntityType) {
    return { valid: false, reason: "A relationship cannot point an entity at itself." };
  }
  if (candidate.confidence !== null && candidate.confidence !== undefined && (candidate.confidence < 0 || candidate.confidence > 1)) {
    return { valid: false, reason: "confidence must be between 0 and 1." };
  }
  return { valid: true };
}
