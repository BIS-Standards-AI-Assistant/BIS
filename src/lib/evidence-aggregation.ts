import type { RetrievedChunk } from "./retrieval";

/**
 * Rolls chunk-level retrieval results into standard-level evidence — the
 * unit downstream grounding/confidence decisions should actually reason
 * about, since "does this standard apply" is a claim about a standard, not
 * about any one paragraph of it.
 *
 * Chunk-volume bias (the Q17 failure mode): a document with many chunks in
 * the corpus has more chances to land in the retrieved set, so a naive sum
 * or count-weighted average of its chunk scores would let volume alone win
 * over relevance. The `weightedScore` below is bounded so that no matter
 * how many chunks a document contributes, its aggregate score can never
 * exceed roughly 2x its single best chunk's score (see the geometric-decay
 * comment below and scripts/test-evidence-aggregation.ts for the proof).
 */

export interface AggregatedEvidence {
  documentId: string;
  standardNumber: string | null;
  title: string;
  sourceUrl: string;
  sourceOrg: string;
  /** Number of chunks from this document present in the retrieved set (not the document's total chunk count) */
  chunkCount: number;
  bestChunkScore: number;
  meanChunkScore: number;
  /** Diminishing-returns aggregate — see module doc. This is the score to rank candidates by, not meanChunkScore or a raw sum. */
  weightedScore: number;
  /** Count of distinct, non-null clause identifiers among contributing chunks — a proxy for how much of the standard's actual structure supports the claim, vs. one clause repeated */
  clauseDiversity: number;
  /** True if any contributing chunk matched the deterministic Standards Identifier Resolver */
  identifierMatch: boolean;
  /** Chunks where both semantic and keyword retrieval agreed (evidence that isn't just an embedding-similarity artifact) */
  multiSourceChunkCount: number;
  chunks: RetrievedChunk[];
}

// Each additional chunk beyond the best one contributes DECAY as much as
// the previous — a geometric series bounded at 1/(1-DECAY) = 2x the best
// chunk's score in the limit, regardless of chunk count. This is the
// mechanism that stops a 111-chunk document from out-scoring a 10-chunk
// document on volume alone: past the first few chunks, additional
// corroborating evidence barely moves the aggregate.
const DECAY = 0.5;

function weightedScoreOf(sortedScoresDesc: number[]): number {
  return sortedScoresDesc.reduce((sum, score, i) => sum + score * DECAY ** i, 0);
}

export function aggregateEvidence(chunks: RetrievedChunk[]): AggregatedEvidence[] {
  const byDocument = new Map<string, RetrievedChunk[]>();
  for (const c of chunks) {
    const list = byDocument.get(c.documentId) ?? [];
    list.push(c);
    byDocument.set(c.documentId, list);
  }

  const result: AggregatedEvidence[] = [];
  for (const [documentId, docChunks] of byDocument) {
    const scores = docChunks.map((c) => c.score).sort((a, b) => b - a);
    const clauses = new Set(docChunks.map((c) => c.clause).filter((c): c is string => c !== null));
    const first = docChunks[0];

    result.push({
      documentId,
      standardNumber: first.standardNumber,
      title: first.title,
      sourceUrl: first.sourceUrl,
      sourceOrg: first.sourceOrg,
      chunkCount: docChunks.length,
      bestChunkScore: scores[0] ?? 0,
      meanChunkScore: scores.reduce((s, v) => s + v, 0) / scores.length,
      weightedScore: weightedScoreOf(scores),
      clauseDiversity: clauses.size,
      identifierMatch: docChunks.some((c) => c.identifierMatch),
      multiSourceChunkCount: docChunks.filter((c) => c.semanticScore > 0 && c.keywordScore > 0).length,
      chunks: docChunks,
    });
  }

  return result.sort((a, b) => b.weightedScore - a.weightedScore);
}
