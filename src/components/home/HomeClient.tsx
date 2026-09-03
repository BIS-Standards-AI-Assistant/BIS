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
import { BisChatBot } from "@/components/chat/BisChatBot";
import { addRecentQuery } from "@/lib/recent-queries";
import type { QueryResponse } from "@/types/api";

const CACHE_PREFIX = "bis-query-cache:";

function getCachedResult(query: string): QueryResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + query);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Invalidate cached fallback answers so real AI responses are requested
    if (parsed.answer?.includes("No AI-generated explanation")) {
      sessionStorage.removeItem(CACHE_PREFIX + query);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedResult(query: string, result: QueryResponse) {
  // Never cache fallback answers where no LLM explanation was available
  if (result.answer?.includes("No AI-generated explanation")) return;
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
          <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-3xl">
              <SearchHero
                key={activeQuery}
                onSubmit={runQuery}
                loading={loading}
                compact
                initialValue={activeQuery}
                onClear={handleClearResults}
              />
            </div>

            {loading && (
              <div className="mx-auto max-w-3xl mt-8">
                <LoadingIndicator />
              </div>
            )}

            {error && (
              <div className="mx-auto max-w-3xl mt-8">
                <ErrorState title="We couldn't connect to the BIS Navigator service" body={error} />
              </div>
            )}

            {result && (
              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]">
                {/* LEFT COLUMN: Executive Summary at Left Corner */}
                <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                  {/* Search Synthesis: a concise, evidence-grounded summary — not an AI chat answer */}
                  <section className="rounded-lg border border-border-strong/70 bg-surface-raised p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">
                          Search Synthesis
                        </h2>
                        <p className="text-[10.5px] text-ink-faint">
                          {result.recommendations.length} candidate standard{result.recommendations.length === 1 ? "" : "s"}
                          {" · "}
                          {result.recommendations.reduce((n, r) => n + r.evidence.length, 0)} supporting source
                          {result.recommendations.reduce((n, r) => n + r.evidence.length, 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ConfidenceBadge confidence={result.confidence} />
                    </div>
                    <div className="mt-4">
                      <p className="text-[14.5px] leading-[1.75] text-ink font-normal">
                        {result.answer}
                      </p>
                    </div>
                    {result.limitations.length > 0 && (
                      <details className="mt-4 rounded-md bg-surface-alt/80 border border-border/60 p-3.5 text-xs">
                        <summary className="cursor-pointer font-bold uppercase tracking-wider text-[10.5px] text-ink-faint">
                          Why this result — technical detail
                        </summary>
                        <ul className="mt-2 space-y-1 text-ink-soft leading-relaxed">
                          {result.limitations.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </section>

                  {/* Search Context: what was detected from the query */}
                  <InterpretationPanel interpretation={result.interpretation} />

                  {/* Official BIS Directorate Reference */}
                  <div className="rounded-2xl border border-border-strong/70 bg-surface-raised p-5 shadow-xs transition-all hover:border-navy/30">
                    <div className="flex items-center gap-2.5 text-navy border-b border-border/50 pb-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/10 text-navy border border-navy/15">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-navy">Official BIS Portal</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      Access certified standard purchases, QCO gazettes, and BIS Care applications directly.
                    </p>
                    <a
                      href="https://www.services.bis.gov.in/php/BIS_2.0/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-navy-deep hover:underline"
                    >
                      <span>Visit e-BIS Directorate</span>
                      <span aria-hidden="true">&rarr;</span>
                    </a>
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Clarification, Irrelevant Alert, Candidates, Testing, Next Steps */}
                <div className="space-y-6 min-w-0">
                  {/* Irrelevant Query Alert */}
                  {result.isRelevant === false && (
                    <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger font-bold text-base">
                          !
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-danger">
                            This is not a relevant BIS search
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                            {result.answer}
                          </p>
                          <div className="mt-3.5 border-t border-danger/15 pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                              Try searching for any physical product or standard:
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {[
                                "Steel water bottle",
                                "Packaged drinking water",
                                "Stainless steel utensils",
                                "Helmets for two wheeler riders",
                                "Domestic pressure cooker",
                                "LED bulb",
                              ].map((prompt) => (
                                <button
                                  key={prompt}
                                  type="button"
                                  onClick={() => runQuery(prompt)}
                                  className="rounded-full border border-border-strong bg-surface-raised px-2.5 py-1 text-xs font-medium text-navy hover:border-navy hover:bg-navy/5 transition-colors cursor-pointer"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Clarification & Refinement Panel (Horizontally organized with input below) */}
                  {result.isRelevant !== false && (
                    <ClarificationPanel
                      items={result.clarificationNeeded ?? []}
                      currentQuery={activeQuery}
                      onRefine={runQuery}
                      loading={loading}
                    />
                  )}

                  {result.conflicts.length > 0 && <ConflictPanel conflicts={result.conflicts} />}

                  {/* Best match + other candidates — the strongest result gets
                      the strongest visual hierarchy, per docs/ui/SIH.md's
                      evidence-first UX rule. */}
                  <div className="space-y-6">
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
                      <>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint pb-2 border-b border-border/70">
                            {/* P0 audit, 2026-09-03: a top-ranked result is only
                                labeled "Best match" when its applicability is
                                actually established — never on relevance/rank
                                alone. A material mismatch or unclear scope is
                                shown as a related standard instead. */}
                            {result.recommendations[0].applicability.state === "DIRECTLY_APPLICABLE" ||
                            result.recommendations[0].applicability.state === "POTENTIALLY_APPLICABLE"
                              ? "Best match"
                              : "Related standard"}
                          </p>
                          <div className="mt-4">
                            <RecommendationCard recommendation={result.recommendations[0]} />
                          </div>
                        </div>

                        {result.recommendations.length > 1 && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint pb-2 border-b border-border/70">
                              Other relevant standards ({result.recommendations.length - 1})
                            </p>
                            <div className="mt-4 space-y-4">
                              {result.recommendations.slice(1).map((rec, i) => (
                                <RecommendationCard key={i} recommendation={rec} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Certification & Testing */}
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

                  {/* Recommended Next Steps */}
                  {result.nextSteps.length > 0 && (
                    <section className="rounded-xl border border-border/80 bg-surface-raised p-5 shadow-xs">
                      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                        <svg className="h-4 w-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-navy">
                          Recommended next steps
                        </h2>
                      </div>
                      <ol className="mt-3.5 space-y-2.5">
                        {result.nextSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-ink leading-relaxed">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy/10 font-mono text-[11px] font-bold text-navy">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {/* Uncertainty & Limitations */}
                  {result.limitations.length > 0 && (
                    <section className="rounded-xl border border-border bg-surface-alt/70 p-5 shadow-xs">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                        Uncertainty &amp; limitations
                      </h2>
                      <ul className="mt-2.5 space-y-1.5 text-xs text-ink-soft">
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
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
      {/* BIS Chat Bot at Right Corner — real standard numbers only, so the
          server can resolve authoritative context by ID (P0 audit,
          2026-09-03), never trusting recommendation text/reason fields. */}
      <BisChatBot
        currentQuery={activeQuery}
        standardNumbers={result?.recommendations
          .map((r) => r.standardNumber)
          .filter((n): n is string => n !== null) ?? []}
      />
    </div>
  );
}
