"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { RecentQueries } from "@/components/home/RecentQueries";
import { WhatsNew } from "@/components/home/WhatsNew";
import { QuickLinks } from "@/components/home/QuickLinks";
import { ResearchChat } from "@/components/chat/ResearchChat";
import { ClarificationPanel } from "@/components/query/ClarificationPanel";
import { LoadingIndicator } from "@/components/query/LoadingIndicator";
import { RecommendationCard } from "@/components/standards/RecommendationCard";
import { Modal } from "@/components/ui/Modal";
import type { MatchedAttribute } from "@/components/trust/WhyPanel";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SourcesPanel } from "@/components/workspace/SourcesPanel";
import { buildChatScope } from "@/lib/chat-scope";
import type { SourceCandidate } from "@/lib/source-search";
import {
  getSourcesServerSnapshot,
  getSourcesSnapshot,
  selectedStandardNumbers,
  subscribeToSources,
} from "@/lib/source-library";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import { addRecentQuery } from "@/lib/recent-queries";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { QueryResponse } from "@/types/api";

const CACHE_PREFIX = "bis-query-cache:";

function AssistantIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h7M17 14l1.5 3 3 1.5-3 1.5L17 23l-1.5-3-3-1.5 3-1.5L17 14z" />
    </svg>
  );
}

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
  const { lang } = useLanguage();
  const urlQuery = searchParams.get("q") ?? "";

  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(true);
  // §34: one owner for the research-context state. The left panel reports
  // selection here; the centre and the chat both read it from here.
  const [selectedSources, setSelectedSources] = useState<SourceCandidate[]>([]);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState(urlQuery);
  // Which recommendation's full evidence card is open in the popup, if any.
  // The centre list itself only shows RecommendationRow (one compact line
  // per standard) — the full card (relevance meter, why-this-applies,
  // coverage, every evidence excerpt) was crowding out the conversation.
  const [openRecommendationIndex, setOpenRecommendationIndex] = useState<number | null>(null);

  // Tracks the last ?q= a run has already been started for — set here and
  // in the auto-run effect below, so a router.replace triggered by this
  // same call doesn't loop back through that effect as a duplicate second
  // run of the query this call is already handling.
  const lastAutoRunQuery = useRef<string | null>(null);

  const runQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      lastAutoRunQuery.current = trimmed;
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
          body: JSON.stringify({ query: trimmed, language: lang }),
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
    [router, searchParams, lang],
  );

  const prevUrlQueryRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevUrlQueryRef.current;
    prevUrlQueryRef.current = urlQuery;
    if (urlQuery && urlQuery !== prev) {
      queueMicrotask(() => runQuery(urlQuery));
    } else if (!urlQuery && prev) {
      setResult(null);
      setError(null);
      setActiveQuery("");
    }
  }, [urlQuery, runQuery]);

  function handleClearResults() {
    setResult(null);
    setError(null);
    setActiveQuery("");
    prevUrlQueryRef.current = "";
    router.replace("/", { scroll: false });
  }

  const showHomepage = !result && !loading && !error && !activeQuery;

  // The one knowledge base and the one scope: standards from the current
  // results plus those cited by the selected source documents. Decided here
  // and passed to every surface that talks to the assistant, so the Sources
  // prompt box and the chat cannot ask different questions of different
  // context. Identifiers only — the server resolves the facts
  // (src/lib/chat-context.ts).
  const librarySources = useSyncExternalStore(
    subscribeToSources,
    getSourcesSnapshot,
    getSourcesServerSnapshot,
  );
  // Only standards the applicability gate passed as primary. A
  // material-mismatched candidate (the steel-query/PVC-standard case) is
  // still shown in the results under "Related but not applicable", but it
  // must not be listed as research context — a chip saying "IS 4985:2021"
  // beside the conversation presents it as a basis for answers, which is
  // exactly the conflation the gate exists to prevent.
  const resultStandardNumbers =
    result?.recommendations
      .filter((r) => r.primaryRecommendation)
      .map((r) => r.standardNumber)
      .filter((n): n is string => n !== null) ?? [];
  const sourceStandardNumbers = selectedStandardNumbers(librarySources);
  // Sources the reader chose take priority over standards the search
  // happened to return — see src/lib/chat-scope.ts for why ordering these
  // the other way round silently dropped their own documents.
  // Standards the reader explicitly selected in the left panel outrank both
  // their uploaded documents' citations and the search's own results.
  const selectedSourceNumbers = selectedSources
    .map((s) => s.standardNumber)
    .filter((n): n is string => Boolean(n));
  const chatScope = buildChatScope(
    [...new Set([...selectedSourceNumbers, ...sourceStandardNumbers])],
    resultStandardNumbers,
  );

  // What the reader actually told us, as the explainability panel shows it
  // (§8). Only fields the interpreter genuinely extracted — an axis it could
  // not determine is omitted rather than shown as an empty match.
  const matchedAttributes: MatchedAttribute[] = result
    ? ([
        { attribute: "Product", value: result.interpretation.product },
        { attribute: "Material", value: result.interpretation.material },
        { attribute: "Intended use", value: result.interpretation.useCase },
        { attribute: "User", value: result.interpretation.targetUser },
        { attribute: "Sector", value: result.interpretation.sector },
      ].filter((a): a is MatchedAttribute => typeof a.value === "string" && a.value.length > 0))
    : [];


  // Column template follows which panels are open. Both side panels are
  // hidden below their breakpoint (sources under lg, workspace under xl), so
  // narrow screens get the assistant full-width rather than three columns
  // squeezed into one.
  const workspaceColumns = [
    showSources ? "lg:grid-cols-[320px_1fr]" : "lg:grid-cols-1",
    showWorkspace
      ? showSources
        ? "xl:grid-cols-[330px_1fr_360px]"
        : "xl:grid-cols-[1fr_360px]"
      : showSources
        ? "xl:grid-cols-[330px_1fr]"
        : "xl:grid-cols-1",
  ].join(" ");

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
          <div className="mx-auto max-w-[1640px] px-4 py-4 sm:px-6">
            {/* Quick Return to Landing Page Navigation Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearResults}
                  className="group inline-flex items-center gap-2 rounded-md bg-navy px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-navy-deep focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1"
                  title="Return to the landing page search bar to enter a new question"
                >
                  <svg
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back to Landing Page (New Search)</span>
                </button>
                <span className="hidden text-xs text-ink-faint sm:inline">
                  Enter a new product query or standard question
                </span>
              </div>

              {activeQuery && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-faint">Showing research for:</span>
                  <span className="max-w-[200px] truncate font-semibold text-navy sm:max-w-[380px]">
                    &ldquo;{activeQuery}&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={handleClearResults}
                    className="ml-1 font-semibold text-blue hover:underline"
                  >
                    Clear &amp; Ask New
                  </button>
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 gap-5 ${workspaceColumns}`}>
              {/* LEFT: official sources in scope + what the search was read as */}
              {showSources && (
                <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
                  <SourcesPanel
                    result={result}
                    selectedSources={selectedSources}
                    onSelectionChange={setSelectedSources}
                    onResearch={runQuery}
                    onOpenRecommendation={setOpenRecommendationIndex}
                    onCollapse={() => setShowSources(false)}
                  />
                </div>
              )}

              {/* CENTRE: the assistant itself. Same sticky+height formula as
                  the side panels (lg:h-[calc(100vh-7rem)]) rather than a
                  guessed value — with the chat header pinned (shrink-0) and
                  only the scrollable area below it constrained, the
                  composer's sticky bottom-0 now sticks to the bottom of
                  *this* column, not the page. Previously this column had no
                  bounded height, so on a short conversation the "sticky to
                  the page" composer sat far below the last message with a
                  large empty gap above it. */}
              <div className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-navy">
                      <AssistantIcon className="h-4.5 w-4.5" />
                      BIS Research
                    </h1>
                    {/* §20's context chip: says what the assistant is
                        discussing, so an answer never appears to come from
                        nowhere. */}
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {chatScope.standardNumbers.length > 0
                        ? `${chatScope.standardNumbers.length} source${chatScope.standardNumbers.length === 1 ? "" : "s"} in context`
                        : "No sources selected — search BIS sources on the left"}
                    </p>
                    {chatScope.fromSources > 0 && (
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        Including {chatScope.fromSources} standard
                        {chatScope.fromSources === 1 ? "" : "s"} cited by your added sources
                        {chatScope.droppedResults > 0 &&
                          ` · ${chatScope.droppedResults} search result${chatScope.droppedResults === 1 ? "" : "s"} beyond the assistant's limit`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearResults}
                      className="inline-flex items-center gap-1 rounded-md border border-navy/30 bg-navy/5 px-2.5 py-1 text-[11px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
                      title="Return to the landing page search prompt"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      + New research
                    </button>
                    {!showSources && (
                      <button
                        type="button"
                        onClick={() => setShowSources(true)}
                        className="hidden rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-bold text-ink-soft transition-colors hover:border-navy hover:text-navy lg:inline-flex"
                      >
                        Show sources
                      </button>
                    )}
                    {!showWorkspace && (
                      <button
                        type="button"
                        onClick={() => setShowWorkspace(true)}
                        className="hidden rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-bold text-ink-soft transition-colors hover:border-navy hover:text-navy xl:inline-flex"
                      >
                        Show workspace
                      </button>
                    )}
                  </div>
                </div>

                {/* Pinned above the scrollable chat, not inside it (shrink-0,
                    outside the flex-1 overflow-y-auto region below) — refining
                    the product spec is a standing action for this query, not
                    a message in the conversation history that should scroll
                    away. */}
                {result && result.isRelevant !== false && (
                  <div className="shrink-0">
                    <ClarificationPanel
                      items={result.clarificationNeeded ?? []}
                      product={result.interpretation?.product}
                      currentQuery={activeQuery}
                      onRefine={runQuery}
                      loading={loading}
                    />
                  </div>
                )}

                <div className="min-h-0 flex-1 lg:overflow-y-auto">
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

              </div>
                {/* The centre is a conversation, not a second search box.
                    This used to be a SearchHero calling runQuery, which
                    rewrote ?q= and ran the global pipeline — so a follow-up
                    question discarded the research context. Source search
                    lives in the left panel; this asks about what is there. */}
                <ResearchChat
                  scopeStandardNumbers={chatScope.standardNumbers}
                  scopeQuery={activeQuery}
                  hasSelectedSources={selectedSources.length > 0}
                  onManageSources={() => setShowSources(true)}
                />
              </div>

              {/* RIGHT: what to do next with this result, and this browser's
                  own recent searches */}
              {showWorkspace && (
                <div className="hidden xl:block xl:sticky xl:top-4 xl:h-[calc(100vh-7rem)]">
                  <WorkspacePanel
                    complianceMap={result?.complianceMap ?? null}
                    onRerun={runQuery}
                    onCollapse={() => setShowWorkspace(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
      {/* Full evidence card for whichever recommendation was clicked in the
          centre's compact list — same RecommendationCard content as before,
          just shown on demand instead of permanently inline. */}
      {result && openRecommendationIndex !== null && result.recommendations[openRecommendationIndex] && (
        <Modal
          open
          onClose={() => setOpenRecommendationIndex(null)}
          title={result.recommendations[openRecommendationIndex].standardNumber ?? "Standard evidence"}
        >
          <RecommendationCard
            recommendation={result.recommendations[openRecommendationIndex]}
            matchedAttributes={matchedAttributes}
          />
        </Modal>
      )}
    </div>
  );
}
