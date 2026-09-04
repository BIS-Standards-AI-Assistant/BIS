"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ConfidenceBadge } from "@/components/query/ConfidenceBadge";
import { InfoCard } from "@/components/query/InfoCard";
import { ConflictPanel } from "@/components/standards/ConflictPanel";
import { RecommendationsList } from "@/components/standards/RecommendationsList";
import { groupChunksIntoSources, sourceLabel, sourcesFromRecommendations, type SourceCandidate } from "@/lib/source-search";
import type { RetrievedChunk } from "@/types/api";
import {
  ACCEPTED_SOURCE_TYPES,
  addSource,
  describeFileRejection,
  getSourcesServerSnapshot,
  getSourcesSnapshot,
  removeSource,
  subscribeToSources,
  toggleSourceSelected,
  updateSource,
  type LibrarySource,
} from "@/lib/source-library";
import type { QueryResponse } from "@/types/api";

/**
 * The workspace's left panel: the reader's own source documents, and what
 * the current search was understood as.
 *
 * Adding a document posts it to /api/v1/analyze-document, which extracts
 * the Indian Standards the document cites and resolves them against the
 * database. Those standard numbers go into src/lib/source-library.ts —
 * the same store the assistant reads — so a standard found in an uploaded
 * file is in scope for the chat without either surface knowing about the
 * other.
 *
 * The boundary is stated in the UI and worth stating here too: what is
 * shared with the assistant is the *standards the document cites*, not the
 * document's text. Nothing sends the file to a model. So the assistant can
 * answer about those standards from BIS evidence; it cannot answer "what
 * does paragraph 3 of my file say". Claiming otherwise would be the more
 * impressive lie.
 *
 * This is a working panel beside the results, not site navigation: the
 * full-width government top navigation is untouched, and this collapses.
 */

export function SourcesPanel({
  result,
  selectedSources,
  onSelectionChange,
  onResearch,
  onOpenRecommendation,
  onCollapse,
}: {
  /** The current search's evidence-grounded summary, shown compactly here rather than competing with the centre conversation for space. */
  result?: QueryResponse | null;
  /** Sources the reader has chosen as research context (§6). */
  selectedSources: SourceCandidate[];
  onSelectionChange: (sources: SourceCandidate[]) => void;
  /** Fired when a source search runs, so the centre can open a research conversation (§35). */
  onResearch: (query: string) => void;
  /** Opens the full evidence card for one recommendation, by its index in result.recommendations. */
  onOpenRecommendation: (index: number) => void;
  onCollapse: () => void;
}) {
  const sources = useSyncExternalStore(subscribeToSources, getSourcesSnapshot, getSourcesServerSnapshot);
  const [isDragging, setIsDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SourceCandidate[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A manual left-panel search overrides the auto-populated list below, but
  // only until the next centre query — otherwise a stale manual search from
  // an earlier, unrelated question would keep hiding the current one's real
  // matches. Reset during render (React's documented pattern for "adjusting
  // state when a prop changes"), not in an effect: an effect would commit
  // one extra stale render first.
  const [lastQueryKey, setLastQueryKey] = useState(result?.query);
  if (result?.query !== lastQueryKey) {
    setLastQueryKey(result?.query);
    setResults(null);
    setSearchError(null);
  }

  // The centre query already ran real retrieval — this reshapes its
  // recommendations into the same source-card shape the left panel's own
  // search produces, so what was just searched for shows up here without
  // the reader re-typing it into a second box.
  const autoResults =
    !results && result && result.recommendations.length > 0 ? sourcesFromRecommendations(result.recommendations) : null;
  const displayedResults = results ?? autoResults;

  /**
   * Retrieval only — no answer generation (§4). This posts to the existing
   * /api/v1/search, which runs hybrid retrieval and returns chunks with no
   * LLM in the path, then groups them into selectable sources. The panel
   * never produces prose; that is the centre's job.
   */
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

  const isSelected = (id: string) => selectedSources.some((s) => s.id === id);

  function toggleSource(source: SourceCandidate) {
    onSelectionChange(
      isSelected(source.id)
        ? selectedSources.filter((s) => s.id !== source.id)
        : [...selectedSources, source],
    );
  }


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

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border-strong/70 bg-surface-raised"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) void ingest(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Sources</h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sources panel"
          title="Collapse sources panel"
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-navy"
        >
          <PanelIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_SOURCE_TYPES}
          multiple
          className="sr-only"
          aria-label="Add source documents"
          onChange={(e) => {
            if (e.target.files?.length) void ingest(e.target.files);
            e.target.value = "";
          }}
        />

        {/* §3/§4: this retrieves sources. It is not a chat input — the
            centre owns conversation. The placeholder says so plainly,
            because the whole confusion this fixes was two search boxes. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSourceSearch(query);
          }}
          className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 focus-within:border-navy"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BIS standards and documents…"
            aria-label="Search BIS standards and documents"
            disabled={searching}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder-ink-faint focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            aria-label="Search sources"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition-colors hover:bg-navy-deep disabled:opacity-40"
          >
            <ArrowIcon className="h-4 w-4" />
          </button>
        </form>

        {searching && (
          <p role="status" className="mt-3 px-1 text-[12px] font-medium text-ink-soft">
            Searching BIS sources…
          </p>
        )}

        {searchError && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[11.5px] text-danger">
            {searchError}
          </p>
        )}

        {/* §7: the evidence-grounded summary for the current search, kept
            compact here rather than competing with the centre conversation
            for primary screen space. Same underlying data as before — only
            the location and density changed. */}
        {result && (
          <section className="mt-3 rounded-lg border border-border-strong/70 bg-surface-raised p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-navy">
                Research Summary
              </h3>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{result.answer}</p>
            {result.translated && (
              <p className="mt-2 text-[10.5px] text-ink-faint">
                Translated to English for search; shown here in your language.
              </p>
            )}
            <details className="mt-2.5 rounded-md bg-surface-alt/80 border border-border/60 p-2.5 text-[11px]">
              <summary className="cursor-pointer font-bold uppercase tracking-wider text-[10px] text-ink-faint">
                Technical details
              </summary>
              <p className="mt-1.5 text-ink-soft leading-relaxed">
                {result.recommendations.length} candidate standard{result.recommendations.length === 1 ? "" : "s"}
                {" · "}
                {result.recommendations.reduce((n, r) => n + r.evidence.length, 0)} supporting source
                {result.recommendations.reduce((n, r) => n + r.evidence.length, 0) === 1 ? "" : "s"}
                {typeof result.latencyMs === "number" && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{(result.latencyMs / 1000).toFixed(1)}s response</span>
                  </>
                )}
              </p>
              {result.limitations.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-ink-soft leading-relaxed">
                  {result.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        )}

        {/* Everything below used to live in the centre column; moved here
            so the centre is the research conversation only. */}
        {result && result.isRelevant === false && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-danger/15 text-xs font-bold text-danger">
                !
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[12px] font-bold text-danger">This is not a relevant BIS search</h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{result.answer}</p>
                <div className="mt-2.5 border-t border-danger/15 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Try instead:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "Steel water bottle",
                      "Packaged drinking water",
                      "Stainless steel utensils",
                      "Helmets for two wheeler riders",
                      "Domestic pressure cooker",
                      "LED bulb",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => onResearch(prompt)}
                        className="rounded-full border border-border-strong bg-surface-raised px-2 py-0.5 text-[10.5px] font-medium text-navy transition-colors hover:border-navy hover:bg-navy/5"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {result && result.conflicts.length > 0 && (
          <div className="mt-3">
            <ConflictPanel conflicts={result.conflicts} />
          </div>
        )}

        {result && (
          <div className="mt-3">
            <RecommendationsList recommendations={result.recommendations} onOpen={onOpenRecommendation} />
          </div>
        )}

        {result && (result.certification.available || result.testing.available) && (
          <div className="mt-3 space-y-2">
            <InfoCard
              title="Certification"
              available={result.certification.available}
              notes={result.certification.notes}
              unavailableMessage="We could not establish a reliable certification pathway from the available sources."
            />
            <InfoCard
              title="Testing"
              available={result.testing.available}
              notes={result.testing.notes}
              unavailableMessage="No testing information could be verified from the available sources."
            />
          </div>
        )}

        {result && result.nextSteps.length > 0 && (
          <details className="mt-3 rounded-lg border border-navy/30 bg-navy/5 p-2.5 text-[11px]">
            <summary className="flex cursor-pointer items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px] text-navy">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              View insight — next steps
            </summary>
            <ol className="mt-1.5 space-y-1">
              {result.nextSteps.map((step, i) => (
                <li key={i} className="text-[11.5px] leading-snug text-ink-soft">
                  {i + 1}. {step}
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* Selected sources — the research context the centre discusses (§6). */}
        {selectedSources.length > 0 && (
          <section className="mt-3 rounded-lg border border-navy/20 bg-navy/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-navy">
                Selected sources ({selectedSources.length})
              </h3>
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="text-[11px] font-bold text-navy hover:underline"
              >
                Clear all
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {selectedSources.map((source) => (
                <li key={source.id} className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] font-bold text-navy">
                      {source.standardNumber ?? source.title}
                    </span>
                    {source.standardNumber && (
                      <span className="block truncate text-[11px] text-ink-soft">{source.title}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSource(source)}
                    aria-label={`Remove ${source.standardNumber ?? source.title}`}
                    className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-danger"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Retrieval results — either from this panel's own search box, or
            (when that hasn't been used) auto-populated from the centre
            query's own retrieval, so a search never leaves this list empty.
            Never labelled "recommended" — applicability is a separate
            deterministic decision made against evidence (§5, §23). */}
        {displayedResults !== null && !searching && (
          displayedResults.length === 0 ? (
            <div className="mt-4 px-1">
              <p className="text-[12.5px] font-semibold text-ink">No matching BIS sources found.</p>
              <ul className="mt-1.5 space-y-1 text-[12px] text-ink-faint">
                <li>Try a standard number, such as IS 4985:2021.</li>
                <li>Try a broader description of the product.</li>
                <li>Add your own document below.</li>
              </ul>
            </div>
          ) : (
            <section className="mt-4">
              <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
                Matching BIS sources ({displayedResults.length})
              </h3>
              <ul className="mt-2 space-y-1.5">
                {displayedResults.map((source) => (
                  <li key={source.id} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
                    <p className="font-mono text-[11.5px] font-bold text-navy">
                      {source.standardNumber ?? "Document"}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink">{source.title}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {sourceLabel(source)} · {source.matchingPassages} indexed passage
                      {source.matchingPassages === 1 ? "" : "s"}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleSource(source)}
                      aria-pressed={isSelected(source.id)}
                      className={`mt-2 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        isSelected(source.id)
                          ? "border-navy bg-navy text-white"
                          : "border-border-strong text-navy hover:border-navy hover:bg-navy/5"
                      }`}
                    >
                      {isSelected(source.id) ? "Selected" : "Select"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}

        {results === null && !searching && selectedSources.length === 0 && (
          <div className="mt-5 px-1">
            <p className="text-[12.5px] font-semibold text-ink">Search BIS standards and documents</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
              Find standards, supporting documents and indexed evidence to use as
              research context. Your conversation about them happens in the centre.
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-border/60 pt-4">
          <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
            Add your document
          </h3>
        </div>


        {rejection && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[11.5px] text-danger">
            {rejection}
          </p>
        )}

        {sources.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 w-full rounded-xl border border-dashed px-4 py-10 text-center transition-colors cursor-pointer ${
              isDragging ? "border-navy bg-navy/5" : "border-border/70 hover:border-navy hover:bg-navy/5"
            }`}
          >
            <DocumentIcon className="mx-auto h-7 w-7 text-ink-faint" />
            <p className="mt-3 text-[13.5px] font-medium text-ink-soft">Click to add a document, or drop it here</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-faint">
              Add a PDF or text file. The Indian Standards it cites become part of
              what the assistant can discuss.
            </p>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full rounded-lg border border-dashed border-border-strong px-3 py-2 text-[11.5px] font-bold text-navy transition-colors hover:border-navy hover:bg-navy/5"
            >
              + Add another document
            </button>
            <ul className="mt-3 space-y-1.5">
              {sources.map((source) => (
                <SourceRow key={source.id} source={source} />
              ))}
            </ul>
          </>
        )}

        <p className="mt-4 border-t border-border/60 px-1 pt-3 text-[11px] leading-relaxed text-ink-faint">
          Every search also runs against the indexed BIS corpus, whether or not
          you add sources. Added documents are held for this browser tab only and
          are not uploaded anywhere except to be read for the standards they cite.
        </p>

      </div>
    </aside>
  );
}

function SourceRow({ source }: { source: LibrarySource }) {
  const cited = source.citedNumbers.length;
  const usable = source.standardNumbers.length;

  return (
    <li className="rounded-lg border border-border/60 bg-surface-alt/40 px-2.5 py-2">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={`src-${source.id}`}
          checked={source.selected}
          disabled={source.status !== "ready"}
          onChange={() => toggleSourceSelected(source.id)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-navy disabled:opacity-40"
        />
        <label htmlFor={`src-${source.id}`} className="min-w-0 flex-1 cursor-pointer">
          <span className="block truncate text-[12.5px] font-semibold text-ink">{source.name}</span>
          <span className="block text-[11px] text-ink-faint">
            {source.status === "analyzing" && "Reading document…"}
            {source.status === "failed" && <span className="text-danger">{source.error}</span>}
            {source.status === "ready" &&
              (cited > 0
                ? `${cited} Indian Standard${cited === 1 ? "" : "s"} cited · ${usable} in this system`
                : "No Indian Standard references found")}
          </span>
        </label>
        <button
          type="button"
          onClick={() => removeSource(source.id)}
          aria-label={`Remove ${source.name}`}
          title={`Remove ${source.name}`}
          className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-danger"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {source.status === "ready" && cited > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-6.5">
          {source.citedNumbers.slice(0, 6).map((number) => {
            // Dimmed when the standard is not indexed here: the document
            // really does cite it, but the assistant has nothing to answer
            // from, and the two cases must not look identical.
            const indexed = source.standardNumbers.includes(number);
            return (
              <span
                key={number}
                title={indexed ? "In this system's knowledge base" : "Cited by the document, not indexed here"}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  indexed
                    ? "bg-navy/10 text-navy"
                    : "border border-dashed border-border-strong text-ink-faint"
                }`}
              >
                {number}
              </span>
            );
          })}
        </div>
      )}

      {source.limitations.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-6.5">
          {source.limitations.map((limitation) => (
            <li key={limitation} className="text-[10.5px] leading-snug text-ink-faint">
              {limitation}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function PanelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm6-1v16" />
    </svg>
  );
}
function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 21h10a2 2 0 002-2V8l-5-5H7a2 2 0 00-2 2v14a2 2 0 002 2zM9 13h6M9 17h4" />
    </svg>
  );
}
function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ArrowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
    </svg>
  );
}
