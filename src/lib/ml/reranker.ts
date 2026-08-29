import type { Reranker, RetrievalCandidate } from "./types";

/**
 * No-op reranker: passes fusedScore through unchanged. This is the control
 * arm for evaluation (scripts/eval-reranker.ts) and the fallback if a
 * future reranker needs to be disabled without touching call sites.
 */
export const noopReranker: Reranker = {
  name: "noop",
  async rerank(_query, candidates) {
    return candidates
      .slice()
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .map((c) => ({ ...c, rerankScore: c.fusedScore, rerankReason: "fused RRF score, unmodified" }));
  },
};

/**
 * A document is "competitive" with the leading document if its best chunk
 * scores at least this fraction of the leader's best-chunk score. Only
 * competitive documents get round-robin diversification; everyone else
 * keeps their natural (lower) rank.
 *
 * Chosen from two measured data points, not tuned to a target: the Q17
 * failure case ("plastic bottles for packaged natural mineral water") has
 * a leader/runner-up best-chunk ratio of 0.925 (IS 14543 0.01639 vs the
 * correct IS 15410 0.01515) — that gap needs to fall inside the
 * competitive band for the fix to work. An exact-identifier query ("IS
 * 5522:2014") has a leader/runner-up ratio of 0.488 (0.03252 vs 0.01587)
 * — that gap needs to fall outside it, so an unambiguous exact match isn't
 * diluted with irrelevant documents. 0.7 sits between the two with margin
 * on both sides; see scripts/eval-reranker.ts for the regression check
 * that would catch a bad value here.
 */
const COMPETITIVE_RATIO = 0.7;

/**
 * Document-diversity reranker.
 *
 * Root cause it targets (measured, not assumed — see
 * scripts/diagnose-retrieval.ts output for Q17): a single flat ranked list
 * lets one document flood the top-K purely because it contributed more
 * candidate chunks to the pool, not because it's more relevant. In that
 * measured case IS 14543 (111 chunks in the corpus) supplied 30 of 32
 * semantic candidates and occupied fused-RRF ranks 1-5, pushing IS 15410
 * (10 chunks in the corpus, the actually-correct standard) out of the
 * top-5 entirely despite IS 15410 having a competitive best-chunk score
 * (rank 6 of 32 — not a large gap from the leader).
 *
 * Fix: round-robin selection across documents whose best chunk is
 * genuinely competitive with the leader, ordered by each document's own
 * best-scoring chunk. Documents that aren't competitive (the gap is large
 * — e.g. an exact-identifier match against unrelated documents) are left
 * at their natural rank instead of being artificially promoted, so
 * diversification only kicks in for the close-call case it's meant to
 * fix, not for every query. It never introduces a document that wasn't
 * already a retrieval candidate; it only changes the order of existing
 * candidates.
 *
 * Deterministic, no LLM call, no training — a fixed algorithm over the
 * scores retrieval already computed. See scripts/eval-reranker.ts for the
 * measured before/after comparison over the full golden query set.
 */
export const documentDiversityReranker: Reranker = {
  name: "document-diversity-v1",
  async rerank(_query, candidates) {
    const byDocument = new Map<string, RetrievalCandidate[]>();
    for (const c of candidates) {
      const list = byDocument.get(c.documentId) ?? [];
      list.push(c);
      byDocument.set(c.documentId, list);
    }
    for (const list of byDocument.values()) {
      list.sort((a, b) => b.fusedScore - a.fusedScore);
    }

    const documentsByBestScore = [...byDocument.entries()].sort(
      (a, b) => b[1][0].fusedScore - a[1][0].fusedScore,
    );
    const leadScore = documentsByBestScore[0]?.[1][0].fusedScore ?? 0;

    const competitiveDocs = documentsByBestScore.filter(([, list]) => list[0].fusedScore >= COMPETITIVE_RATIO * leadScore);
    const trailingDocs = documentsByBestScore.filter(([, list]) => list[0].fusedScore < COMPETITIVE_RATIO * leadScore);

    const ordered: Array<{ candidate: RetrievalCandidate; reason: string }> = [];

    // Round-robin only within the competitive set.
    const documentOrder = competitiveDocs.map(([documentId]) => documentId);
    const cursors = new Map<string, number>(documentOrder.map((id) => [id, 0]));
    let remaining = competitiveDocs.reduce((sum, [, list]) => sum + list.length, 0);
    let round = 0;
    while (remaining > 0) {
      let tookAnyThisRound = false;
      for (const documentId of documentOrder) {
        const cursor = cursors.get(documentId)!;
        const list = byDocument.get(documentId)!;
        if (cursor >= list.length) continue;

        const documentRank = documentOrder.indexOf(documentId) + 1;
        ordered.push({
          candidate: list[cursor],
          reason:
            round === 0
              ? `competitive with the leading document (>= ${Math.round(COMPETITIVE_RATIO * 100)}% of its best score) — document rank ${documentRank} of ${documentOrder.length}`
              : `round ${round + 1} pick for this document (document rank ${documentRank} of ${documentOrder.length})`,
        });
        cursors.set(documentId, cursor + 1);
        tookAnyThisRound = true;
        remaining--;
      }
      if (!tookAnyThisRound) break;
      round++;
    }

    // Trailing (non-competitive) documents keep their natural fused-score order.
    const trailingFlat = trailingDocs
      .flatMap(([, list]) => list)
      .sort((a, b) => b.fusedScore - a.fusedScore);
    for (const candidate of trailingFlat) {
      ordered.push({
        candidate,
        reason: `below the ${Math.round(COMPETITIVE_RATIO * 100)}% competitiveness threshold vs the leading document — kept at natural rank, not diversified`,
      });
    }

    return ordered.map(({ candidate, reason }, i) => ({
      ...candidate,
      rerankScore: 1 / (1 + i),
      rerankReason: reason,
    }));
  },
};
