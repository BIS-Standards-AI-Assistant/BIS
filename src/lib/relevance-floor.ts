import type { RetrievedChunk } from "./retrieval";

/**
 * PRD §8.1 — the post-retrieval relevance floor.
 *
 * The PRD requires an explicit minimum relevance score applied after
 * retrieval, below which the system returns its fixed "not found in
 * corpus" refusal rather than a generated answer. Its review checklist is
 * specific about the failure modes to avoid:
 *
 *   - the threshold must apply to the top-1 score, not an average over k
 *   - it must be checked against a real out-of-corpus query, not assumed
 *   - the value must come from this system's actual score range
 *
 * WHICH SCORE. Not `RetrievedChunk.score` and not `fusedScore`: both are
 * rank reciprocals (RRF, then 1/(1+rank) from the reranker), so the
 * nearest neighbour in a small corpus sits near the maximum no matter how
 * irrelevant it is — the exact defect already documented in
 * src/lib/grounding.ts. The only field carrying an absolute relevance
 * magnitude is `semanticSimilarity` (pgvector cosine similarity), so the
 * floor is applied to that.
 *
 * TOP-1, NOT AVERAGE. The floor tests the single best semantic similarity
 * in the retrieved set. Using the max rather than the reranked position-1
 * chunk means a reranker reshuffle can never on its own cause a refusal;
 * the question the floor asks is "is anything retrieved actually
 * relevant?", and the strongest match is what answers it.
 *
 * WHERE THE NUMBER COMES FROM. Measured, not assumed. See
 * scripts/calibrate-refusal-threshold.ts and the recorded run in
 * data/evaluation/refusal-calibration.json (2026-09-09, live pgvector
 * index, 19 documents / 557 chunks):
 *
 *   in-corpus     (7 queries)  min 0.5557  max 0.6716
 *   out-of-corpus (5 queries)  min 0.1413  max 0.3493
 *   gap: 0.3493 .. 0.5557
 *
 * The groups separate cleanly, so the floor sits in the gap. 0.45 is just
 * below the midpoint (0.4525), leaving ~0.10 of margin above the strongest
 * out-of-corpus query and ~0.106 below the weakest in-corpus one.
 *
 * The PRD's suggested 0.55 starting point is deliberately NOT used, on the
 * PRD's own instruction ("If a different embedding model or a non-cosine
 * similarity metric was used, the 0.55 starting point does not apply").
 * Measured here, 0.55 would sit ABOVE the weakest genuine in-corpus query
 * (IC2, "stainless steel cookware specification", 0.5557) and refuse it.
 */
export const RELEVANCE_FLOOR = 0.45;

export type RelevanceFloorVerdict =
  /** The best semantic match clears the floor — retrieval is relevant enough to answer from. */
  | { decision: "pass"; topSimilarity: number; reason: string }
  /** A deterministic identifier match exempts this query from the floor. */
  | { decision: "exempt_identifier_match"; topSimilarity: number | null; reason: string }
  /** No similarity could be measured, so the floor cannot be applied either way. */
  | { decision: "not_measurable"; topSimilarity: null; reason: string }
  /** Nothing retrieved is relevant enough — the caller must return the fixed refusal. */
  | { decision: "below_floor"; topSimilarity: number; reason: string };

/**
 * IDENTIFIER EXEMPTION — empirically required, not a convenience.
 *
 * A query that names a standard outright is answered by the deterministic
 * Standards Identifier Resolver, which is a stronger and more precise
 * signal than embedding similarity. Measured against the live index on
 * 2026-09-09, bare-identifier queries score BELOW the floor even when they
 * resolve to exactly the right document:
 *
 *   "5522 2014"              max similarity 0.2913, 12 identifier matches
 *   "Indian Standard 14543"  max similarity 0.4476, 12 identifier matches
 *
 * Applying the floor to those would refuse a query the system answers
 * correctly. The exemption is narrow: it requires an actual resolver match
 * on a real indexed document (`identifierMatch`), which by construction
 * cannot be produced by a fabricated identifier — "IS 99999:2099" yields
 * zero identifier matches and a max similarity of 0.3349, so it is still
 * refused by the floor, as the same live run confirms.
 */
export function evaluateRelevanceFloor(
  chunks: RetrievedChunk[],
  floor: number = RELEVANCE_FLOOR,
): RelevanceFloorVerdict {
  const similarities = chunks
    .map((c) => c.semanticSimilarity)
    .filter((s): s is number => s !== null);
  const topSimilarity = similarities.length > 0 ? Math.max(...similarities) : null;

  if (chunks.some((c) => c.identifierMatch)) {
    return {
      decision: "exempt_identifier_match",
      topSimilarity,
      reason:
        "The query names a standard that the deterministic identifier resolver matched against an indexed document; the semantic relevance floor does not apply.",
    };
  }

  if (topSimilarity === null) {
    // Keyword-only hits, an embedding failure, or the seed-corpus fallback
    // (which has no embeddings). Refusing here would turn "we could not
    // measure relevance" into "this is irrelevant" — two different claims.
    // Downstream grounding still has to justify any answer.
    return {
      decision: "not_measurable",
      topSimilarity: null,
      reason:
        "No semantic similarity was available for the retrieved set (keyword-only retrieval, embedding failure, or the local seed corpus), so the relevance floor could not be applied.",
    };
  }

  if (topSimilarity < floor) {
    return {
      decision: "below_floor",
      topSimilarity,
      reason: `The closest indexed passage scored ${topSimilarity.toFixed(3)} against a required minimum of ${floor.toFixed(2)}, so nothing in the corpus is relevant enough to answer from.`,
    };
  }

  return {
    decision: "pass",
    topSimilarity,
    reason: `The closest indexed passage scored ${topSimilarity.toFixed(3)}, clearing the ${floor.toFixed(2)} relevance floor.`,
  };
}
