"use client";

import { useSyncExternalStore } from "react";
import {
  getRecentQueriesServerSnapshot,
  getRecentQueriesSnapshot,
  subscribeToRecentQueries,
} from "@/lib/recent-queries";
import { ProductComplianceMap } from "@/components/query/ProductComplianceMap";
import type { ComplianceMap } from "@/types/api";

/**
 * The workspace's right panel: the product compliance map (when a search
 * produced one — testing/certification live in its own tabs there now),
 * and the searches this browser has actually run.
 *
 * The recent list is real: it comes from this browser's own query history
 * (src/lib/recent-queries.ts), not from invented "notebooks".
 */

export function WorkspacePanel({
  complianceMap,
  onRerun,
  onCollapse,
}: {
  /** The current search's regulatory pathway (standards/certification/testing/labs), when the pipeline produced one. */
  complianceMap?: ComplianceMap | null;
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
          <WorkspaceIcon className="h-4 w-4" />
          Workspace
        </h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse workspace panel"
          title="Collapse workspace panel"
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-navy"
        >
          <PanelIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {complianceMap && (
          <div className="border-b border-border/60 p-3">
            <ProductComplianceMap complianceMap={complianceMap} />
          </div>
        )}
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

function WorkspaceIcon(props: React.SVGProps<SVGSVGElement>) {
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
