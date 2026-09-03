// Types mirror the actual route handlers in src/app/api/v1/* — kept by hand
// rather than generated, since the routes are small and stable. If a field
// is added/removed in a route, update it here in the same change.

export interface EvidenceRef {
  chunkId: string;
  documentId: string;
  document: string;
  standardNumber: string | null;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  sourceUrl: string;
}

export type GroundingState = "verified" | "supported_inference" | "insufficient_evidence";

export type CoverageStatus = "covered" | "not_covered" | "unknown";

export interface CoverageResult {
  product: CoverageStatus;
  material: CoverageStatus;
  application: CoverageStatus;
  targetUser: CoverageStatus;
  sector: CoverageStatus;
  testing: CoverageStatus;
  certification: CoverageStatus;
  identifier: CoverageStatus;
  overallCoverageRatio: number;
}

export type ApplicabilityState =
  | "DIRECTLY_APPLICABLE"
  | "POTENTIALLY_APPLICABLE"
  | "RELATED"
  | "MATERIAL_MISMATCH"
  | "SCOPE_UNCLEAR"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE";

export interface Applicability {
  state: ApplicabilityState;
  reason: string;
  materialConflict: boolean;
}

export interface Recommendation {
  standardNumber: string | null;
  title: string;
  relevanceScore: number;
  groundingState: GroundingState;
  reason: string;
  coverage: CoverageResult;
  evidence: EvidenceRef[];
  /** Deterministic, separate from relevanceScore/groundingState — "relevant" is not the same claim as "applicable". See src/lib/applicability.ts. */
  applicability: Applicability;
}

export type Confidence = "high" | "medium" | "low" | "none";

export interface EngineConfidence {
  score: number;
  band: Confidence;
  groundingState: GroundingState;
  supportingSignals: string[];
  limitingSignals: string[];
}

export interface Conflict {
  type: "version_conflict" | "superseded_standard" | "evidence_conflict";
  description: string;
  affectedStandards: string[];
}

export interface QueryInterpretation {
  product: string | null;
  material: string | null;
  useCase: string | null;
  targetUser: string | null;
  sector: string | null;
  certificationRequested: boolean;
  testingRequested: boolean;
}

export interface QueryResponse {
  answer: string;
  intent: string;
  isRelevant?: boolean;
  interpretation: QueryInterpretation;
  clarificationNeeded?: string[];
  recommendations: Recommendation[];
  certification: { available: boolean; notes: string | null };
  testing: { available: boolean; notes: string | null };
  nextSteps: string[];
  confidence: Confidence;
  engineConfidence: EngineConfidence;
  conflicts: Conflict[];
  limitations: string[];
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  standardNumber: string | null;
  title: string;
  sourceUrl: string;
  sourceOrg: string;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  semanticScore: number;
  keywordScore: number;
  identifierMatch: boolean;
  score: number;
  rerankReason: string;
}

export interface SearchResponse {
  query: string;
  results: RetrievedChunk[];
}

export interface StandardChunk {
  id: string;
  documentId: string;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StandardDetail {
  id: string;
  standardNumber: string | null;
  title: string;
  documentType: string;
  sourceUrl: string;
  sourceOrg: string;
  version: string | null;
  publicationDate: string | null;
  retrievedAt: string;
  checksum: string;
  createdAt: string;
  chunks: StandardChunk[];
}

export type RelevanceLabel = "High relevance" | "Moderate relevance" | "Low relevance";

export function relevanceLabel(score: number): RelevanceLabel {
  if (score >= 0.75) return "High relevance";
  if (score >= 0.45) return "Moderate relevance";
  return "Low relevance";
}
