"use client";

import { useSyncExternalStore } from "react";
import {
  getRecentQueriesServerSnapshot,
  getRecentQueriesSnapshot,
  subscribeToRecentQueries,
} from "@/lib/recent-queries";

/**
 * The workspace's right panel: output formats for the current result, and
 * the searches this browser has actually run.
 *
 * None of the Studio formats are built yet, so every one is rendered
 * disabled and labelled "Planned" rather than as a button that silently
 * does nothing. A government service that offers a "Report" and produces
 * no report has told the user something untrue; an honest "not yet" costs
 * nothing and is the same rule the placeholder pages already follow.
 *
 * The recent list is real: it comes from this browser's own query history
 * (src/lib/recent-queries.ts), not from invented "notebooks".
 */

interface StudioFormat {
  name: string;
  description: string;
  icon: React.ReactNode;
}

const FORMATS: StudioFormat[] = [
  { name: "Video Overview", description: "Narrated walkthrough of the result", icon: <PlayIcon /> },
  { name: "Mind Map", description: "Standards and their relationships", icon: <MapIcon /> },
  { name: "Reports", description: "Compliance summary for a product", icon: <ReportIcon /> },
  { name: "Flashcards", description: "Key clauses to revise", icon: <CardsIcon /> },
  { name: "Quiz", description: "Check understanding of a standard", icon: <QuizIcon /> },
  { name: "Infographic", description: "Certification route at a glance", icon: <ChartIcon /> },
  { name: "Data Table", description: "Clause-by-clause comparison", icon: <TableIcon /> },
];

export function StudioPanel({
  onRerun,
  onCollapse,
}: {
  onRerun: (query: string) => void;
  onCollapse: () => void;
}) {
  const recent = useSyncExternalStore(
    subscribeToRecentQueries,
    getRecentQueriesSnapshot,
    getRecentQueriesServerSnapshot,
  );

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border-strong/70 bg-surface-raised">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-navy">
          <StudioIcon className="h-4 w-4" />
          Studio
        </h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse studio panel"
          title="Collapse studio panel"
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-navy"
        >
          <PanelIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2.5">
            {FORMATS.map((format) => (
              <button
                key={format.name}
                type="button"
                disabled
                aria-disabled="true"
                title={`${format.name} — not built yet`}
                className="group flex cursor-not-allowed flex-col gap-2 rounded-lg border border-border/70 bg-surface-alt/50 p-3 text-left opacity-70"
              >
                <span className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy/8 text-navy">
                    {format.icon}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-faint">
                    Planned
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold text-ink">{format.name}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-faint">
                    {format.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-ink-faint">
            These output formats are not built yet. They are shown so the
            workspace layout is complete, not because they work.
          </p>
        </div>

        <div className="border-t border-border/60 p-4">
          <h3 className="flex items-center gap-2 text-[12px] font-bold text-navy">
            <ClockIcon className="h-3.5 w-3.5" />
            Recent searches
          </h3>

          {recent.length === 0 ? (
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
              Searches you run are listed here, on this device only. Nothing yet.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1">
              {recent.slice(0, 6).map((entry) => (
                <li key={`${entry.query}-${entry.timestamp}`}>
                  <button
                    type="button"
                    onClick={() => onRerun(entry.query)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-alt"
                  >
                    <DocIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-ink">{entry.query}</span>
                      <span className="block text-[10.5px] text-ink-faint">
                        {relativeTime(entry.timestamp)}
                        {entry.standardNumbers.length > 0 && ` · ${entry.standardNumbers.length} standard${entry.standardNumbers.length === 1 ? "" : "s"}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StudioIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    </svg>
  );
}

function PanelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10-1v16" />
    </svg>
  );
}

const iconProps = {
  className: "h-4 w-4",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  "aria-hidden": true,
} as const;

function PlayIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55-2.27A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.87L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4zM16 4h4v4h-4zM16 14h4v4h-4zM8 8h8M8 8v8h8" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
    </svg>
  );
}
function CardsIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM8 4h9" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9a3 3 0 115 2.2c-.7.6-1 1.2-1 2.3m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17V9m5 8V5m5 12v-5M4 21h16" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 4h16M10 10v10" />
    </svg>
  );
}
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function DocIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V8l-5-5H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
