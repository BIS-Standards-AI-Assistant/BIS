"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { clearRecentQueries, type RecentQueryEntry } from "@/lib/recent-queries";

const EXAMPLE_QUERIES: RecentQueryEntry[] = [
  {
    query: "Stainless steel water bottle for kids",
    standardNumbers: ["IS 15410:2003", "IS 14756:2017"],
    confidence: "high",
    timestamp: 0,
  },
  {
    query: "LED Bulb for domestic use",
    standardNumbers: ["IS 16102:2012", "IS 15885:2010"],
    confidence: "high",
    timestamp: 0,
  },
  {
    query: "Pressure cooker aluminium",
    standardNumbers: ["IS 2347:2017", "IS 3074:2018"],
    confidence: "medium",
    timestamp: 0,
  },
];

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

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("bis-queries-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("bis-queries-updated", callback);
  };
}

const EMPTY: RecentQueryEntry[] = [];

let cachedRaw: string | null = null;
let cachedParsed: RecentQueryEntry[] = [];

function getStorageSnapshot(): RecentQueryEntry[] {
  // Runs during render via useSyncExternalStore. Storage access throws in
  // private mode or when site data is blocked, and malformed JSON throws too —
  // neither should take down the home page. Fall back to "no history", which
  // renders the example queries.
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("bis-recent-queries");
  } catch {
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      cachedParsed = [];
    }
  }
  return cachedParsed;
}

function getServerSnapshot(): RecentQueryEntry[] {
  return EMPTY;
}

export function RecentQueries({ onRerun }: { onRerun?: (query: string) => void }) {
  const { t } = useLanguage();
  const stored = useSyncExternalStore(subscribeToStorage, getStorageSnapshot, getServerSnapshot);

  const hasHistory = stored.length > 0;
  const entries = hasHistory ? stored.slice(0, 5) : EXAMPLE_QUERIES;

  function handleClearHistory() {
    clearRecentQueries();
    cachedRaw = null;
    cachedParsed = [];
    window.dispatchEvent(new Event("bis-queries-updated"));
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
            <tr className="border-b border-border bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-faint">
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
                  {row.query}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {row.standardNumbers.map((s) => (
                      <Badge key={s} tone="info">
                        {s}
                      </Badge>
                    ))}
                  </div>
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
                {row.query}
              </p>
              <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.standardNumbers.map((s) => (
                <Badge key={s} tone="info">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium text-ink-faint">{formatRelativeTime(row.timestamp)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
