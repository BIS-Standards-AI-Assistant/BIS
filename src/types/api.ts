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

export interface Recommendation {
  standardNumber: string | null;
  title: string;
  relevanceScore: number;
  groundingState: GroundingState;
  reason: string;
  evidence: EvidenceRef[];
}

export type Confidence = "high" | "medium" | "low" | "none";

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
  interpretation: QueryInterpretation;
  clarificationNeeded?: string[];
  recommendations: Recommendation[];
  certification: { available: boolean; notes: string | null };
  testing: { available: boolean; notes: string | null };
  nextSteps: string[];
  confidence: Confidence;
  limitations: string[];
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  standardNumber: string | null;
  title: string;
  sourceUrl: string;
  section: string | null;
  clause: string | null;
  page: number | null;
  text: string;
  semanticScore: number;
  keywordScore: number;
  identifierMatch: boolean;
  score: number;
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
