"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ConflictPanel } from "@/components/standards/ConflictPanel";
import { RecommendationsList } from "@/components/standards/RecommendationsList";
import { sourcesFromRecommendations, type SourceCandidate } from "@/lib/source-search";
import {
  ACCEPTED_SOURCE_TYPES,
  getSourcesServerSnapshot,
  getSourcesSnapshot,
  subscribeToSources,
} from "@/lib/source-library";
import type { QueryResponse } from "@/types/api";
import { ArrowIcon, DocumentIcon, PanelIcon, SearchIcon } from "./sources/icons";
import { CertificationAndTesting, IrrelevantSearchNotice, NextSteps, ResearchSummary } from "./sources/ResearchSummary";
import { SelectedSourcesList, SourceSearchResults } from "./sources/SourceLists";
import { SourceRow } from "./sources/SourceRow";
import { useDocumentIngest, useSourceSearch } from "./sources/useSourcePanelActions";

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
 *
 * The pieces live in ./sources/: the summary blocks, the source lists, the
 * document row, and the search/upload hooks.
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
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { searching, results, searchError, runSourceSearch, resetSearch } = useSourceSearch(onResearch);
  const { ingest, rejections } = useDocumentIngest();

  // A manual left-panel search overrides the auto-populated list below, but
  // only until the next centre query — otherwise a stale manual search from
  // an earlier, unrelated question would keep hiding the current one's real
  // matches. Reset during render (React's documented pattern for "adjusting
  // state when a prop changes"), not in an effect: an effect would commit
  // one extra stale render first.
  const [lastQueryKey, setLastQueryKey] = useState(result?.query);
  if (result?.query !== lastQueryKey) {
    setLastQueryKey(result?.query);
    resetSearch();
  }

  // The centre query already ran real retrieval — this reshapes its
  // recommendations into the same source-card shape the left panel's own
  // search produces, so what was just searched for shows up here without
  // the reader re-typing it into a second box.
  //
  // Not on a refusal: those candidates are already listed above under
  // "Related but not applicable", and repeating them here as "Matching
  // BIS sources" would call the same documents both not-applicable and
  // matching. A manual search in this panel still works as usual.
  const refused = result?.outcome?.startsWith("refused_") ?? false;
  const autoResults =
    !results && !refused && result && result.recommendations.length > 0
      ? sourcesFromRecommendations(result.recommendations)
      : null;
  const displayedResults = results ?? autoResults;

  const isSelected = (id: string) => selectedSources.some((s) => s.id === id);

  function toggleSource(source: SourceCandidate) {
    onSelectionChange(
      isSelected(source.id)
        ? selectedSources.filter((s) => s.id !== source.id)
        : [...selectedSources, source],
    );
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border-strong/70 bg-surface-raised"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // dragleave also fires when the pointer moves onto a child element;
        // only clear the highlight when it actually leaves the panel.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
      }}
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
          <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[11.5px] text-danger">
            {searchError}
          </p>
        )}

        {result && <ResearchSummary result={result} />}

        {/* Everything below used to live in the centre column; moved here
            so the centre is the research conversation only. */}
        {result && result.isRelevant === false && (
          <IrrelevantSearchNotice message={result.answer} onResearch={onResearch} />
        )}

        {result && result.conflicts.length > 0 && (
          <div className="mt-3">
            <ConflictPanel conflicts={result.conflicts} />
          </div>
        )}

        {result && (
          <div className="mt-3">
            <RecommendationsList
              recommendations={result.recommendations}
              onOpen={onOpenRecommendation}
              collapseRelated={refused}
            />
          </div>
        )}

        {result && <CertificationAndTesting result={result} />}

        {result && <NextSteps steps={result.nextSteps} />}

        <SelectedSourcesList
          sources={selectedSources}
          onRemove={toggleSource}
          onClear={() => onSelectionChange([])}
        />

        {/* Retrieval results — either from this panel's own search box, or
            (when that hasn't been used) auto-populated from the centre
            query's own retrieval, so a search never leaves this list empty. */}
        {displayedResults !== null && !searching && (
          <SourceSearchResults results={displayedResults} isSelected={isSelected} onToggle={toggleSource} />
        )}

        {/* Only when nothing else is listed — not underneath auto-populated matches. */}
        {displayedResults === null && !searching && selectedSources.length === 0 && (
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

        {rejections.length > 0 && (
          <ul role="alert" className="mt-3 space-y-0.5 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[11.5px] text-danger">
            {rejections.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
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
