"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { InterpretationPanel } from "@/components/query/InterpretationPanel";
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
import type { QueryInterpretation } from "@/types/api";

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
  interpretation,
  onCollapse,
}: {
  interpretation?: QueryInterpretation | null;
  onCollapse: () => void;
}) {
  const sources = useSyncExternalStore(subscribeToSources, getSourcesSnapshot, getSourcesServerSnapshot);
  const [isDragging, setIsDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-navy hover:text-navy"
        >
          <PlusIcon className="h-4 w-4" />
          Add sources
        </button>

        {/* Web discovery is drawn from the design but has no service behind
            it — rendered disabled rather than as a box that swallows input. */}
        <div className="mt-3 rounded-xl border border-border/70 bg-surface-alt/40 p-3">
          <p className="text-[13px] text-ink-faint">Search the web for new sources</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[12.5px] font-medium text-ink-faint">
              <GlobeIcon className="h-3.5 w-3.5" />
              Web
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[12.5px] font-medium text-ink-faint">
              <SparkIcon className="h-3.5 w-3.5" />
              Fast Research
            </span>
            <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-ink-faint">
              <SearchIcon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            Web discovery is not connected. Add a PDF or text file instead.
          </p>
        </div>

        {rejection && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2 text-[11.5px] text-danger">
            {rejection}
          </p>
        )}

        {sources.length === 0 ? (
          <div
            className={`mt-6 rounded-xl border border-dashed px-4 py-10 text-center transition-colors ${
              isDragging ? "border-navy bg-navy/5" : "border-border/70"
            }`}
          >
            <DocumentIcon className="mx-auto h-7 w-7 text-ink-faint" />
            <p className="mt-3 text-[13.5px] font-medium text-ink-soft">Saved sources will appear here</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-faint">
              Add a PDF or text file. The Indian Standards it cites become part of
              what the assistant can discuss.
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-faint">
              Drop files here or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-semibold text-navy underline underline-offset-2 hover:text-navy-deep"
              >
                add a source
              </button>
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-border/60 px-1 pt-3 text-[11px] leading-relaxed text-ink-faint">
          Every search also runs against the indexed BIS corpus, whether or not
          you add sources. Added documents are held for this browser tab only and
          are not uploaded anywhere except to be read for the standards they cite.
        </p>

        {interpretation && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <InterpretationPanel interpretation={interpretation} />
          </div>
        )}
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
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
    </svg>
  );
}
function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18a15 15 0 010-18z" />
    </svg>
  );
}
function SparkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4l1.6 3.9L16.5 9.5l-3.9 1.6L11 15l-1.6-3.9L5.5 9.5l3.9-1.6L11 4zM18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
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
