"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingIndicator } from "@/components/query/LoadingIndicator";
import { VoiceInputButton } from "@/components/query/VoiceInputButton";
import type { SearchResponse } from "@/types/api";

interface SearchPageClientProps {
  initialQuery: string;
}

export function SearchPageClient({ initialQuery }: SearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // P1-8: ref to results heading for focus management
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasRunInitial = useRef(false);

  async function runSearch(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim() }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setResult(await res.json());
    } catch {
      setError("We couldn't retrieve relevant BIS sources.");
    } finally {
      setLoading(false);
      // P1-8: move focus to results on completion
      setTimeout(() => resultsHeadingRef.current?.focus(), 50);
    }
  }

  // P1-5: run search on mount if initialQuery is provided
  useEffect(() => {
    if (initialQuery && !hasRunInitial.current) {
      hasRunInitial.current = true;
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const looksLikeStandardNumber = /^IS[\s-]?\d/i.test(query.trim());

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Search Indian Standards
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Search directly by product, standard number, or topic across the ingested BIS
            document corpus. This is keyword and semantic retrieval only — no generated answer.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            {/* P2-15: proper label + type=search */}
            <label htmlFor="search-standards-input" className="sr-only">
              Search Indian Standards by product, number or topic
            </label>
            <div className="flex flex-1 items-center gap-1 rounded-md border border-border-strong bg-surface-raised pr-1.5 focus-within:border-navy">
              <input
                id="search-standards-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. IS 5522, stainless steel utensils, packaged drinking water…"
                aria-label="Search Indian Standards by product, number or topic"
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-ink outline-none"
              />
              <VoiceInputButton
                onResult={(transcript) => {
                  setQuery(transcript);
                  runSearch(transcript);
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full rounded-sm bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-40 sm:w-auto"
            >
              Search
            </button>
          </form>

          {/* P1-8: aria-live region so screen readers announce results */}
          <div
            aria-live="polite"
            aria-atomic="false"
            className="mt-8 space-y-3"
          >
            {loading && <LoadingIndicator />}
            {error && <ErrorState title="Search failed" body={error} />}

            {!loading && (result || error) && (
              <h2
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="text-sm font-semibold text-ink-soft outline-none"
              >
                {error
                  ? "Search error"
                  : result && result.results.length === 0
                    ? "No results found"
                    : result
                      ? `${result.results.length} result${result.results.length === 1 ? "" : "s"} found`
                      : ""}
              </h2>
            )}

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
            Looking for an evidence-backed answer instead of raw search results?{" "}
            <Link href="/" className="text-navy underline hover:text-navy-deep">
              Describe your product on the home page.
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
