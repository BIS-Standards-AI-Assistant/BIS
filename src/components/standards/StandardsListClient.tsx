"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export interface StandardSummary {
  id: string;
  standardNumber: string | null;
  title: string;
  documentType: string;
  version: string | null;
  chunkCount: number;
}

function extractCategory(documentType: string): string {
  const parts = documentType.split("·");
  return (parts.length > 1 ? parts[1] : parts[0]).replace(/_/g, " ").trim();
}

export function StandardsListClient({ standards }: { standards: StandardSummary[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const router = useRouter();

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const sorted: string[] = [];
    for (const s of standards) {
      const cat = extractCategory(s.documentType);
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        sorted.push(cat);
      }
    }
    sorted.sort();
    return ["All", ...sorted];
  }, [standards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return standards.filter((s) => {
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.standardNumber ?? "").toLowerCase().includes(q) ||
        s.documentType.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "All" || extractCategory(s.documentType) === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [standards, query, activeCategory]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by IS number, title, or category…"
            aria-label="Search standards"
            className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-blue focus:outline-none"
          />
        </div>

        {selected.size >= 2 && (
          <button
            type="button"
            onClick={goCompare}
            className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            Compare ({selected.size})
          </button>
        )}
      </div>

      {categories.length > 2 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-surface-raised text-ink-soft hover:border-navy hover:text-navy"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-faint">
        {filtered.length === standards.length
          ? `${standards.length} standards`
          : `${filtered.length} of ${standards.length} standards`}
        {selected.size > 0 && ` · ${selected.size} selected`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 border border-dashed border-border-strong bg-surface-alt p-8 text-center">
          <p className="text-sm font-medium text-ink-soft">
            {query
              ? <>No standards match &ldquo;{query}&rdquo;</>  
              : <>No standards in &ldquo;{activeCategory}&rdquo;</>}
          </p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory("All"); }}
            className="mt-2 text-xs text-blue hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border border border-border">
          {filtered.map((s, idx) => (
            <div key={`${s.id}-${idx}`} className="flex items-start gap-4 bg-surface-raised p-4 transition-colors hover:bg-surface-alt/50">
              <label className="mt-0.5 flex items-center">
                <span className="sr-only">Select {s.standardNumber ?? s.title} for comparison</span>
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 accent-[var(--color-navy)]"
                />
              </label>
              <div className="flex-1">
                <p className="font-mono text-sm text-navy">{s.standardNumber ?? "Unnumbered reference"}</p>
                <Link href={`/standards/${s.id}`} className="mt-0.5 block text-[15px] font-medium text-ink hover:underline">
                  {s.title}
                </Link>
                <p className="mt-1 text-xs text-ink-faint">
                  {s.documentType.replaceAll("_", " ")}
                  {s.version ? ` · ${s.version}` : ""} ·{" "}
                  {s.chunkCount > 0
                    ? `${s.chunkCount} indexed section${s.chunkCount === 1 ? "" : "s"}`
                    : "not yet ingested into the retrieval index"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.size >= 2 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={goCompare}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            Compare selected ({selected.size})
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-ink-faint hover:text-ink hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {selected.size === 1 && (
        <p className="mt-4 text-xs text-ink-faint">Select at least 2 standards to compare.</p>
      )}
    </div>
  );
}
