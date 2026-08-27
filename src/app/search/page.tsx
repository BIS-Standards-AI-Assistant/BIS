"use client";

import { useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingIndicator } from "@/components/query/LoadingIndicator";
import type { SearchResponse } from "@/types/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setResult(await res.json());
    } catch {
      setError("We couldn't retrieve relevant BIS sources.");
    } finally {
      setLoading(false);
    }
  }

  // Standard-number-looking queries (e.g. "IS 5522") deserve a slightly
  // different empty-state hint than a description-style query.
  const looksLikeStandardNumber = /^IS[\s-]?\d/i.test(query.trim());

  return (
    <div className="min-h-screen bg-surface">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Search Indian Standards</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Search directly by product, standard number, or topic across the ingested BIS
          document corpus. This is keyword + semantic retrieval only — no generated answer.
        </p>

        <form onSubmit={runSearch} className="mt-6 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. IS 5522, stainless steel utensils, packaged drinking water…"
            aria-label="Search Indian Standards"
            className="flex-1 rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface disabled:opacity-40"
          >
            Search
          </button>
        </form>

        <div className="mt-8 space-y-3">
          {loading && <LoadingIndicator />}
          {error && <ErrorState title="Search failed" body={error} />}

          {result && result.results.length === 0 && (
            <EmptyState
              title="No matching standards found"
              body="No chunks in the current knowledge base matched this query."
              tips={
                looksLikeStandardNumber
                  ? ["Check the standard number format, e.g. \"IS 5522\".", "Try a keyword from the title instead."]
                  : ["Try a more specific product or material name.", "Try the exact standard number if you know it."]
              }
            />
          )}

          {result?.results.map((r) => (
            <EvidenceExcerpt
              key={r.chunkId}
              standardNumber={r.standardNumber}
              documentTitle={r.title}
              section={r.section}
              clause={r.clause}
              page={r.page}
              text={r.text}
              sourceUrl={r.sourceUrl}
              standardHref={`/standards/${r.documentId}`}
            />
          ))}
        </div>

        <p className="mt-10 text-xs text-ink-faint">
          Looking for a conversational, evidence-backed answer instead?{" "}
          <Link href="/" className="text-accent-ink hover:underline">
            Describe your product on the home page.
          </Link>
        </p>
      </main>
    </div>
  );
}
