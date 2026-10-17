import { useState } from "react";
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
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SourceCandidate[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function runSourceSearch(raw: string) {
    const q = raw.trim();
    if (!q || searching) return;

    setSearching(true);
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
      setResults(groupChunksIntoSources(data.results ?? []));
      onResearch(q);
    } catch {
      setSearchError("We couldn't search BIS sources just now. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  /** Drops a manual search's results so the panel falls back to the centre query's sources. */
  function resetSearch() {
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
  const [rejection, setRejection] = useState<string | null>(null);

  async function ingest(files: FileList | File[]) {
    setRejection(null);
    for (const file of Array.from(files)) {
      const problem = describeFileRejection(file);
      if (problem) {
        setRejection(`${file.name}: ${problem}`);
        continue;
      }

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
        const data = await res.json();

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

  return { ingest, rejection };
}
