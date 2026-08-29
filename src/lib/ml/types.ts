/**
 * Shared types for the ML intelligence layer that sits between hybrid
 * retrieval and answer generation. Every stage in this layer is designed to
 * run without an LLM call — see src/lib/ml/reranker.ts for why.
 */

export interface RetrievalCandidate {
  chunkId: string;
  documentId: string;
  standardNumber: string | null;
  section: string | null;
  clause: string | null;
  text: string;
  /** 1/rank position in the semantic (pgvector) ranking, 0 if absent from it */
  semanticScore: number;
  /** 1/rank position in the keyword (Postgres FTS) ranking, 0 if absent from it */
  keywordScore: number;
  /** true if the deterministic Standards Identifier Resolver matched this chunk's document */
  identifierMatch: boolean;
  /** Reciprocal Rank Fusion score from the upstream hybrid retrieval stage */
  fusedScore: number;
}

export interface RankedCandidate extends RetrievalCandidate {
  rerankScore: number;
  /** Short, deterministic explanation of why this candidate landed where it did — never an LLM-generated rationale */
  rerankReason: string;
}

export interface Reranker {
  name: string;
  rerank(query: string, candidates: RetrievalCandidate[]): Promise<RankedCandidate[]>;
}
