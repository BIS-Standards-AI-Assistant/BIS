"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  clearRecentQueries,
  getRecentQueriesServerSnapshot,
  getRecentQueriesSnapshot,
  subscribeToRecentQueries,
  type RecentQueryEntry,
} from "@/lib/recent-queries";

/**
 * Shown before the reader has any history. Queries only: the standards a
 * search finds come from running it, so none are listed here — a hard-coded
 * "standards found" column would be an unsourced claim (and the previous
 * one paired a stainless steel bottle with a plastics-bottle standard).
 * Each query is covered by the indexed seed corpus.
 */
const EXAMPLE_QUERIES: RecentQueryEntry[] = [
  { query: "Packaged drinking water", standardNumbers: [], confidence: "none", timestamp: 0 },
  { query: "Protective helmet for two-wheeler riders", standardNumbers: [], confidence: "none", timestamp: 0 },
  { query: "Plugs and sockets for household use", standardNumbers: [], confidence: "none", timestamp: 0 },
];

function StandardsCell({ standardNumbers }: { standardNumbers: string[] }) {
  if (standardNumbers.length === 0) {
    return <span className="text-xs italic text-ink-faint">Run to see sourced results</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {standardNumbers.map((s) => (
        <Badge key={s} tone="info">
          {s}
        </Badge>
      ))}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  if (timestamp === 0) return "Example";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentQueries({ onRerun }: { onRerun?: (query: string) => void }) {
  const { t } = useLanguage();
  const stored = useSyncExternalStore(subscribeToRecentQueries, getRecentQueriesSnapshot, getRecentQueriesServerSnapshot);

  const hasHistory = stored.length > 0;
  const entries = hasHistory ? stored.slice(0, 5) : EXAMPLE_QUERIES;

  function handleClearHistory() {
    clearRecentQueries();
  }

  function handleRowClick(query: string) {
    if (onRerun) onRerun(query);
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-navy">
          {hasHistory ? t.recent.heading.replace("Example", "Recent") : t.recent.heading}
        </h2>
        <div className="flex items-center gap-3">
          {hasHistory && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs font-bold text-ink-faint transition-colors hover:text-danger"
            >
              Clear history
            </button>
          )}
          <Link href="/search" className="flex items-center gap-1 text-xs font-bold text-blue hover:underline">
            {t.recent.viewAll} <span className="text-[10px]">→</span>
          </Link>
        </div>
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            {/* text-ink-soft, not text-ink-faint: axe-core found the
                faint token on bg-surface-alt at 4.29:1, below WCAG AA's
                4.5:1 for this bold 11px text (E2E a11y suite, 2026-09-03). */}
            <tr className="border-b border-border bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              <th className="w-12 px-5 py-3.5">{t.recent.colHash}</th>
              <th className="px-5 py-3.5">{t.recent.colQuery}</th>
              <th className="px-5 py-3.5">{t.recent.colStandards}</th>
              <th className="px-5 py-3.5">{t.recent.colLast}</th>
              <th className="w-12 px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map((row, i) => (
              <tr
                key={row.query + row.timestamp}
                onClick={() => handleRowClick(row.query)}
                className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-alt/40"
              >
                <td className="px-5 py-4 font-semibold text-ink-faint">{i + 1}</td>
                <td className="px-5 py-4 font-bold text-navy transition-colors hover:text-blue">
                  {/* The row is clickable for pointers; this button is the keyboard path. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(row.query);
                    }}
                    className="text-left hover:underline"
                  >
                    {row.query}
                  </button>
                </td>
                <td className="px-5 py-4">
                  <StandardsCell standardNumbers={row.standardNumbers} />
                </td>
                <td className="px-5 py-4 font-semibold text-ink-soft">{formatRelativeTime(row.timestamp)}</td>
                <td className="px-5 py-4 text-right text-ink-faint">
                  <ChevronRightIcon className="inline-block h-4 w-4 transform transition-transform group-hover:translate-x-0.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-3 md:hidden">
        {entries.map((row, i) => (
          <li
            key={row.query + row.timestamp}
            onClick={() => handleRowClick(row.query)}
            className="cursor-pointer rounded-xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-navy">
                <span className="mr-1.5 text-ink-faint">{i + 1}.</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(row.query);
                  }}
                  className="text-left hover:underline"
                >
                  {row.query}
                </button>
              </p>
              <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            </div>
            <div className="mt-2">
              <StandardsCell standardNumbers={row.standardNumbers} />
            </div>
            <p className="mt-2 text-[11px] font-medium text-ink-faint">{formatRelativeTime(row.timestamp)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
