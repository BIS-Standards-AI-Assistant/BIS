import { useRef, useState } from "react";
import { groupChunksIntoSources, type SourceCandidate } from "@/lib/source-search";
import { addSource, describeFileRejection, updateSource } from "@/lib/source-library";
import type { RetrievedChunk } from "@/types/api";

/**
 * Retrieval only — no answer generation (§4). Posts to the existing
 * /api/v1/search, which runs hybrid retrieval and returns chunks with no
 * LLM in the path, then groups them into selectable sources. The panel
 * never produces prose; that is the centre's job.
 */
export function useSourceSearch(onResearch: (query: string) => void) {
  // The generation of the search in flight, or null. Cleared by that search
  // alone, so an old search finishing can't clear a newer one's spinner.
  const [searchingGeneration, setSearchingGeneration] = useState<number | null>(null);
  const searching = searchingGeneration !== null;
  const [results, setResults] = useState<SourceCandidate[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Bumped by every search and every reset. A response is applied only if
  // nothing has superseded it: a search still in flight when the centre
  // moves on to a new query must not land afterwards, re-hiding that
  // query's sources and opening research on the old one.
  const generationRef = useRef(0);

  async function runSourceSearch(raw: string) {
    const q = raw.trim();
    if (!q || searching) return;

    const generation = ++generationRef.current;
    const isCurrent = () => generation === generationRef.current;
    setSearchingGeneration(generation);
    setSearchError(null);
    setResults(null);
    try {
      const res = await fetch("/api/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { results: RetrievedChunk[] } = await res.json();
      if (!isCurrent()) return;
      setResults(groupChunksIntoSources(data.results ?? []));
      onResearch(q);
    } catch {
      if (isCurrent()) setSearchError("We couldn't search BIS sources just now. Please try again.");
    } finally {
      setSearchingGeneration((g) => (g === generation ? null : g));
    }
  }

  /** Drops a manual search's results so the panel falls back to the centre query's sources. */
  function resetSearch() {
    generationRef.current++;
    setSearchingGeneration(null);
    setResults(null);
    setSearchError(null);
  }

  return { searching, results, searchError, runSourceSearch, resetSearch };
}

/**
 * Adds documents to the source library and posts each to
 * /api/v1/analyze-document, which extracts the Indian Standards the
 * document cites. Only those standard numbers are shared with the
 * assistant, never the document's text.
 */
export function useDocumentIngest() {
  // Every rejected file in a drop is reported, not only the last one.
  const [rejections, setRejections] = useState<string[]>([]);

  async function ingest(files: FileList | File[]) {
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const problem = describeFileRejection(file);
      if (problem) rejected.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    setRejections(rejected);

    for (const file of accepted) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      addSource({
        id,
        name: file.name,
        sizeBytes: file.size,
        addedAt: Date.now(),
        status: "analyzing",
        selected: true,
        citedNumbers: [],
        standardNumbers: [],
        limitations: [],
      });

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/v1/analyze-document", { method: "POST", body: form });
        // An error can arrive as a non-JSON body (e.g. a proxy's HTML 413
        // page). That is still a server answer, not an unreachable service.
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          updateSource(id, { status: "failed", error: data.error ?? `Upload failed (HTTP ${res.status})` });
          continue;
        }

        // Everything the document cites is shown; only what resolves in the
        // knowledge base is shared with the assistant.
        const cited: string[] = (data.identifiersFound ?? []).map(
          (i: { resolvedNumber: string }) => i.resolvedNumber,
        );
        updateSource(id, {
          status: "ready",
          citedNumbers: [...new Set(cited)],
          standardNumbers: (data.standards ?? []).map((s: { standardNumber: string }) => s.standardNumber),
          limitations: data.limitations ?? [],
        });
      } catch {
        updateSource(id, { status: "failed", error: "Could not reach the analysis service" });
      }
    }
  }

  return { ingest, rejections };
}
