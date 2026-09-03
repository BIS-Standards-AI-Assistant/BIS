"use client";

import { useState } from "react";
import Link from "next/link";
import type { GroundingState, Recommendation } from "@/types/api";
import { RelevanceMeter } from "@/components/ui/RelevanceMeter";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { Badge } from "@/components/ui/Badge";
import { CoveragePanel } from "@/components/standards/CoveragePanel";

const GROUNDING_LABEL: Record<GroundingState, string> = {
  verified: "Directly supported by evidence",
  supported_inference: "Inferred from related evidence",
  insufficient_evidence: "Evidence doesn't fully establish this",
};
const GROUNDING_TONE: Record<GroundingState, "success" | "warning" | "danger"> = {
  verified: "success",
  supported_inference: "warning",
  insufficient_evidence: "danger",
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const [showStats, setShowStats] = useState(false);
  const documentId = recommendation.evidence[0]?.documentId;

  return (
    <article className="rounded-2xl border border-border-strong/70 bg-surface-raised p-5 sm:p-7 shadow-xs transition-all hover:border-navy/35 hover:shadow-md">
      {/* Card Header: Standard Number, Title, and Relevance Meter */}
      <div className="flex flex-wrap items-start justify-between gap-3.5 border-b border-border/60 pb-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-lg border border-navy/20 bg-navy/10 px-3 py-1 font-mono text-xs font-black tracking-wider text-navy shadow-2xs">
            {recommendation.standardNumber ?? "Unnumbered Reference"}
          </span>
          <h3 className="mt-2 text-xl sm:text-2xl font-black text-navy-deep dark:text-ink tracking-tight">
            {recommendation.title}
          </h3>
        </div>
        <div className="shrink-0 pt-0.5">
          <RelevanceMeter score={recommendation.relevanceScore} />
        </div>
      </div>

      {/* Relevance Reason */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
            Why this appears relevant
          </p>
          <Badge tone={GROUNDING_TONE[recommendation.groundingState]}>
            {GROUNDING_LABEL[recommendation.groundingState]}
          </Badge>
        </div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink/90 font-medium">
          {recommendation.reason}
        </p>
      </div>

      {/* Coverage breakdown */}
      <div className="mt-4">
        <CoveragePanel coverage={recommendation.coverage} />
      </div>

      {/* Supporting Sourced Evidence */}
      {recommendation.evidence.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-border/60 pt-4.5">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h4 className="text-xs font-black uppercase tracking-wider text-navy">
              {recommendation.evidence.length} Supporting BIS Evidence Source{recommendation.evidence.length > 1 ? "s" : ""}
            </h4>
          </div>
          {recommendation.evidence.map((ev) => (
            <EvidenceExcerpt
              key={ev.chunkId}
              standardNumber={ev.standardNumber}
              documentTitle={ev.document}
              section={ev.section}
              clause={ev.clause}
              page={ev.page}
              text={ev.text}
              sourceUrl={ev.sourceUrl}
              standardHref={`/standards/${ev.documentId}`}
            />
          ))}
        </div>
      )}

      {/* Action Buttons: View Complete Standard Passport + View Stats */}
      <div className="mt-6 pt-3 flex flex-wrap items-center gap-3 border-t border-border/50">
        {documentId && (
          <Link
            href={`/standards/${documentId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-navy hover:bg-navy-deep px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs transition-all hover:shadow-md"
          >
            <span>View Complete Standard Passport</span>
            <span aria-hidden="true" className="font-bold text-gold">&rarr;</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-2xs ${
            showStats
              ? "bg-navy/15 text-navy border border-navy/40 ring-2 ring-navy/15"
              : "border border-border-strong bg-surface-alt hover:bg-navy/5 text-navy hover:border-navy"
          }`}
        >
          <svg className="h-4 w-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span>{showStats ? "Hide Stats ▲" : "View Stats ▼"}</span>
        </button>
      </div>

      {/* Expanded Metrics & Performance Stats Panel */}
      {showStats && (
        <div className="mt-4 rounded-xl border border-navy/20 bg-gradient-to-br from-navy/[0.04] via-surface-raised to-surface-alt/80 p-4 sm:p-5 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy text-white text-xs font-black">
                📊
              </span>
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-navy">
                Standard Evaluation &amp; Compliance Analytics
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="text-xs font-bold text-ink-faint hover:text-ink cursor-pointer px-1 py-0.5"
            >
              Close ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Relevance Score Metric */}
            <div className="rounded-lg border border-border/80 bg-surface-raised p-3 shadow-2xs">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                Relevance Score
              </span>
              <span className="mt-1 block text-lg sm:text-xl font-black text-navy">
                {Math.round(recommendation.relevanceScore * 100)}%
              </span>
              <span className="text-[10.5px] text-ink-soft">Raw: {recommendation.relevanceScore.toFixed(3)}</span>
            </div>

            {/* Coverage Ratio Metric */}
            <div className="rounded-lg border border-border/80 bg-surface-raised p-3 shadow-2xs">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                Coverage Ratio
              </span>
              <span className="mt-1 block text-lg sm:text-xl font-black text-navy">
                {Math.round((recommendation.coverage?.overallCoverageRatio ?? 0) * 100)}%
              </span>
              <span className="text-[10.5px] text-ink-soft">Dimensional Match</span>
            </div>

            {/* Evidence Count */}
            <div className="rounded-lg border border-border/80 bg-surface-raised p-3 shadow-2xs">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                Indexed Evidence
              </span>
              <span className="mt-1 block text-lg sm:text-xl font-black text-navy">
                {recommendation.evidence.length} Source{recommendation.evidence.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[10.5px] text-ink-soft">Gazetted Chunks</span>
            </div>

            {/* Grounding Level */}
            <div className="rounded-lg border border-border/80 bg-surface-raised p-3 shadow-2xs">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                Grounding State
              </span>
              <span className="mt-1 block text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 capitalize truncate">
                {recommendation.groundingState.replace("_", " ")}
              </span>
              <span className="text-[10.5px] text-ink-soft">BIS Verified</span>
            </div>
          </div>

          {/* Dimension Breakdown */}
          {recommendation.coverage && (
            <div className="mt-4 pt-3 border-t border-border/60">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint mb-2">
                Dimensional Conformity Breakdown:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(recommendation.coverage)
                  .filter(([key]) => key !== "overallCoverageRatio")
                  .map(([dimension, status]) => (
                    <span
                      key={dimension}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border ${
                        status === "covered"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : status === "not_covered"
                            ? "bg-rose-50 text-rose-800 border-rose-300/50 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-surface-raised text-ink-soft border-border/70"
                      }`}
                    >
                      <span className="capitalize">{dimension}:</span>
                      <span className="font-black">{status}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
