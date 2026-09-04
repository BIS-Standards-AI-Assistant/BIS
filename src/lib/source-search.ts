import type { Recommendation, RetrievedChunk } from "@/types/api";

/**
 * Groups raw retrieval hits into selectable *sources* for the left panel.
 *
 * This is presentation over the existing engine, not a second one (§32):
 * `/api/v1/search` already performs hybrid retrieval and returns chunks
 * with no LLM and no prose. A chunk is a passage; a source is the standard
 * or document it came from, which is what a reader selects as research
 * context.
 *
 * Deliberately says nothing about applicability. §5 is explicit: a result
 * must not be called "recommended" merely because retrieval relevance is
 * high. Applicability is a separate deterministic decision made by
 * src/lib/applicability.ts against evidence, and this file has no business
 * anticipating it. All a source result claims is "this exists in the index
 * and matched your search".
 */

export interface SourceCandidate {
  /** Stable key: the standard number when known, else the document id. */
  id: string;
  standardNumber: string | null;
  title: string;
  documentId: string;
  sourceUrl: string;
  sourceOrg: string;
  /** How many indexed passages matched — evidence depth, not applicability. */
  matchingPassages: number;
  /** Best retrieval score among its passages, for ordering only. */
  topScore: number;
  /** True when the query named this standard outright. */
  identifierMatch: boolean;
}

export function groupChunksIntoSources(chunks: RetrievedChunk[]): SourceCandidate[] {
  const bySource = new Map<string, SourceCandidate>();

  for (const chunk of chunks) {
    const id = chunk.standardNumber ?? chunk.documentId;
    const existing = bySource.get(id);
    if (existing) {
      existing.matchingPassages += 1;
      existing.topScore = Math.max(existing.topScore, chunk.score);
      existing.identifierMatch = existing.identifierMatch || chunk.identifierMatch;
      continue;
    }
    bySource.set(id, {
      id,
      standardNumber: chunk.standardNumber,
      title: chunk.title,
      documentId: chunk.documentId,
      sourceUrl: chunk.sourceUrl,
      sourceOrg: chunk.sourceOrg,
      matchingPassages: 1,
      topScore: chunk.score,
      identifierMatch: chunk.identifierMatch,
    });
  }

  // An explicitly named standard outranks a merely similar one; otherwise
  // retrieval score decides. Neither is a claim about applicability.
  return [...bySource.values()].sort((a, b) => {
    if (a.identifierMatch !== b.identifierMatch) return a.identifierMatch ? -1 : 1;
    return b.topScore - a.topScore;
  });
}

/** What the panel says about a source. Never "recommended" (§5). */
export function sourceLabel(source: SourceCandidate): string {
  return source.identifierMatch ? "Named in your search" : "Matching source";
}

/**
 * The main search already ran retrieval and produced `recommendations` —
 * this reshapes that response into the same `SourceCandidate` list the
 * left panel's own search box produces, so a source found by the main
 * query shows up here without the reader having to re-type it into a
 * second box. No new retrieval call, no second engine — the same
 * candidates, one presentation.
 */
export function sourcesFromRecommendations(recommendations: Recommendation[]): SourceCandidate[] {
  return recommendations.map((r) => {
    const firstEvidence = r.evidence[0];
    return {
      id: r.standardNumber ?? firstEvidence?.documentId ?? r.title,
      standardNumber: r.standardNumber,
      title: r.title,
      documentId: firstEvidence?.documentId ?? "",
      sourceUrl: firstEvidence?.sourceUrl ?? "",
      sourceOrg: "BIS",
      matchingPassages: r.evidence.length,
      topScore: r.relevanceScore,
      identifierMatch: r.coverage.identifier === "covered",
    };
  });
}
