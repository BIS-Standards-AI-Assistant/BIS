"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { RecentQueries } from "@/components/home/RecentQueries";
import { WhatsNew } from "@/components/home/WhatsNew";
import { QuickLinks } from "@/components/home/QuickLinks";
import { SearchHero } from "@/components/query/SearchHero";
import { InterpretationPanel } from "@/components/query/InterpretationPanel";
import { ClarificationPanel } from "@/components/query/ClarificationPanel";
import { LoadingIndicator } from "@/components/query/LoadingIndicator";
import { ConfidenceBadge } from "@/components/query/ConfidenceBadge";
import { InfoCard } from "@/components/query/InfoCard";
import { RecommendationCard } from "@/components/standards/RecommendationCard";
import { ConflictPanel } from "@/components/standards/ConflictPanel";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { addRecentQuery } from "@/lib/recent-queries";
import type { QueryResponse } from "@/types/api";

const CACHE_PREFIX = "bis-query-cache:";

function getCachedResult(query: string): QueryResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + query);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedResult(query: string, result: QueryResponse) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + query, JSON.stringify(result));
  } catch {
    /* quota exceeded */
  }
}

export function HomeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") ?? "";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState(urlQuery);

  const runQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setActiveQuery(trimmed);
      setError(null);

      const params = new URLSearchParams(searchParams.toString());
      params.set("q", trimmed);
      router.replace(`/?${params.toString()}`, { scroll: false });

      const cached = getCachedResult(trimmed);
      if (cached) {
        setResult(cached);
        return;
      }

      setLoading(true);
      setResult(null);
      try {
        const res = await fetch("/api/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });
        if (!res.ok) {
          // Never surface a raw backend/provider error string to the user
          // (e.g. a token-limit or credit message) — only a generic,
          // actionable message. See docs/ui/SIH.md's error-experience rules.
          throw new Error("service_unavailable");
        }
        const data: QueryResponse = await res.json();
        setResult(data);
        setCachedResult(trimmed, data);

        addRecentQuery({
          query: trimmed,
          standardNumbers: data.recommendations
            .map((r) => r.standardNumber)
            .filter((s): s is string => s !== null)
            .slice(0, 3),
          confidence: data.confidence,
          timestamp: Date.now(),
        });
      } catch {
        setError("The BIS Navigator service is temporarily unavailable. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    [router, searchParams],
  );

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (urlQuery && !didAutoRun.current) {
      didAutoRun.current = true;
      queueMicrotask(() => runQuery(urlQuery));
    }
  }, [urlQuery, runQuery]);

  function handleClearResults() {
    setResult(null);
    setError(null);
    setActiveQuery("");
    router.replace("/", { scroll: false });
  }

  const showHomepage = !result && !loading && !error && !activeQuery;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <NavBar />
      <main id="main-content" className="flex-1">
        {showHomepage && (
          <>
            <HeroSection onSubmit={runQuery} loading={loading} />

            <div className="mx-auto max-w-[1380px] px-6 py-14">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
                <div className="space-y-12">
                  <ServicesSection />
                  <RecentQueries onRerun={runQuery} />
                </div>
                <div className="space-y-6">
                  <WhatsNew />
                  <QuickLinks />
                </div>
              </div>
            </div>
          </>
        )}

        {!showHomepage && (
          <div className="mx-auto max-w-3xl px-6 py-14">
            <SearchHero
              key={activeQuery}
              onSubmit={runQuery}
              loading={loading}
              compact
              initialValue={activeQuery}
              onClear={handleClearResults}
            />

            {loading && (
              <div className="mt-8">
                <LoadingIndicator />
              </div>
            )}

            {error && (
              <div className="mt-8">
                <ErrorState title="We couldn't connect to the BIS Navigator service" body={error} />
              </div>
            )}

            {result && (
              <div className="mt-10 space-y-8">
                <section className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-raised p-5">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Summary</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink">{result.answer}</p>
                  </div>
                  <div className="shrink-0 pt-5">
                    <ConfidenceBadge confidence={result.confidence} />
                  </div>
                </section>

                {result.clarificationNeeded && result.clarificationNeeded.length > 0 && (
                  <ClarificationPanel items={result.clarificationNeeded} />
                )}

                {result.conflicts.length > 0 && <ConflictPanel conflicts={result.conflicts} />}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
                  <InterpretationPanel interpretation={result.interpretation} />

                  <div className="space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Candidate standards
                    </h2>
                    {result.recommendations.length === 0 ? (
                      <EmptyState
                        title="No sufficiently relevant standard found"
                        body="We couldn't find strong evidence for this query in the current BIS knowledge base."
                        tips={[
                          "Add the product's material.",
                          "Describe the intended use or user group.",
                          "Name the product category more specifically.",
                        ]}
                      />
                    ) : (
                      <div className="space-y-4">
                        {result.recommendations.map((rec, i) => (
                          <RecommendationCard key={i} recommendation={rec} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(result.certification.available || result.testing.available) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                {result.nextSteps.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Recommended next steps
                    </h2>
                    <ol className="mt-3 space-y-2">
                      {result.nextSteps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-ink">
                          <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {result.limitations.length > 0 && (
                  <section className="rounded-lg border border-border bg-surface-alt p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Uncertainty &amp; limitations
                    </h2>
                    <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                      {result.limitations.map((l, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-ink-faint">•</span>
                          {l}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
