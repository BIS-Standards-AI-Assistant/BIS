"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApplicabilityState, GroundingState, Recommendation } from "@/types/api";
import { RelevanceMeter } from "@/components/ui/RelevanceMeter";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { Badge } from "@/components/ui/Badge";
import { CoveragePanel } from "@/components/standards/CoveragePanel";
import { WhyPanel, type MatchedAttribute } from "@/components/trust/WhyPanel";
import { ConfidenceIndicator } from "@/components/trust/ConfidenceIndicator";
import { SourceTag } from "@/components/trust/SourceTag";
import { confidenceFromGrounding } from "@/lib/provenance";

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

// Distinct from GROUNDING_LABEL on purpose (P0 audit, 2026-09-03):
// "relevant" (the retrieval engine found supporting text) is not the same
// claim as "applicable" (this standard actually governs the queried
// product) — see src/lib/applicability.ts.
export const APPLICABILITY_LABEL: Record<ApplicabilityState, string> = {
  DIRECTLY_APPLICABLE: "Directly applicable",
  POTENTIALLY_APPLICABLE: "Potentially applicable",
  RELATED: "Related standard",
  MATERIAL_MISMATCH: "Related standard — material mismatch",
  SCOPE_UNCLEAR: "Scope unclear",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
  NOT_APPLICABLE: "Not applicable",
};
export const APPLICABILITY_TONE: Record<ApplicabilityState, "success" | "warning" | "danger" | "neutral"> = {
  DIRECTLY_APPLICABLE: "success",
  POTENTIALLY_APPLICABLE: "warning",
  RELATED: "neutral",
  MATERIAL_MISMATCH: "danger",
  SCOPE_UNCLEAR: "neutral",
  INSUFFICIENT_EVIDENCE: "danger",
  NOT_APPLICABLE: "danger",
};

export function RecommendationCard({
  recommendation,
  matchedAttributes = [],
}: {
  recommendation: Recommendation;
  /**
   * What the reader told us that drove this match (§8). Passed in rather
   * than derived here, because only the caller knows which interpretation
   * produced these results.
   */
  matchedAttributes?: MatchedAttribute[];
}) {
  const [showStats, setShowStats] = useState(false);
  const documentId = recommendation.evidence[0]?.documentId;
  const isPrimary = recommendation.primaryRecommendation;

  return (
    <article
      className={`rounded-lg border p-5 sm:p-7 ${isPrimary ? "border-border-strong/70 bg-surface-raised" : "border-border/60 bg-surface-alt/40"}`}
    >
      {!isPrimary && (
        <div className="mb-4 -mt-1 -mx-1 rounded-md border border-border-strong/50 bg-surface-raised px-3 py-2">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-faint">Related but not applicable</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">Not applicable to the specified material or scope — see Applicability below.</p>
        </div>
      )}

      {/* Card Header: Standard Number, Title, and Relevance Meter */}
      <div className="flex flex-wrap items-start justify-between gap-3.5 border-b border-border/60 pb-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded border border-navy/20 bg-navy/10 px-3 py-1 font-mono text-xs font-black tracking-wider text-navy">
            {recommendation.standardNumber ?? "Unnumbered Reference"}
          </span>
          <h3 className="mt-2 text-xl sm:text-2xl font-black text-navy-deep dark:text-ink tracking-tight">
            {recommendation.title}
          </h3>
        </div>
        <div className="shrink-0 pt-0.5">
          <RelevanceMeter score={recommendation.relevanceScore} primary={isPrimary} />
        </div>
      </div>

      {/* Why this applies — §8's explainability, over upstream's applicability
          gate (2026-09-04). Both claims are kept, and kept separate: the
          WhyPanel carries the reasoning and its evidence, while the badge
          below still distinguishes "evidence exists for this standard"
          (groundingState) from "this standard applies to your product".
          When the gate has excluded a candidate the confidence indicator is
          withheld entirely — showing "High confidence" beside a card that
          says "related but not applicable" would re-introduce exactly the
          conflation upstream just fixed. */}
      <div className="mt-4">
        <WhyPanel reason={recommendation.reason} attributes={matchedAttributes}>
          {recommendation.evidence.length > 0 && (
            <ul className="space-y-1">
              {recommendation.evidence.slice(0, 3).map((ev) => (
                <li key={ev.chunkId} className="text-[12px] leading-relaxed text-ink-soft">
                  <span className="font-mono font-bold text-navy">
                    {ev.standardNumber ?? ev.document}
                  </span>
                  {ev.clause && <span className="text-ink-faint"> · clause {ev.clause}</span>}
                  {ev.page && <span className="text-ink-faint"> · p. {ev.page}</span>}
                </li>
              ))}
            </ul>
          )}
        </WhyPanel>

        <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
          {isPrimary && (
            <ConfidenceIndicator level={confidenceFromGrounding(recommendation.groundingState)} />
          )}
          <Badge tone={isPrimary ? GROUNDING_TONE[recommendation.groundingState] : "neutral"}>
            {isPrimary ? GROUNDING_LABEL[recommendation.groundingState] : "Standard information verified"}
          </Badge>
        </div>
      </div>
      {/* Applicability — separate claim from relevance/grounding above.
          "This appeared" is not "this applies"; see APPLICABILITY_LABEL. */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
            Applicability
          </p>
          <Badge tone={APPLICABILITY_TONE[recommendation.applicability.state]}>
            {APPLICABILITY_LABEL[recommendation.applicability.state]}
          </Badge>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          {recommendation.applicability.reason}
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
            <SourceTag provenance="official" />
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
          className={`inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            showStats
              ? "bg-navy/15 text-navy border border-navy/40"
              : "border border-border-strong bg-surface-alt hover:bg-navy/5 text-navy hover:border-navy"
          }`}
        >
          <span>{showStats ? "Hide technical detail" : "Technical detail"}</span>
        </button>
      </div>

      {/* Technical detail: the raw metrics behind "Why this result", for
          readers who want to inspect the engine's output directly rather
          than a debug dashboard shown by default. */}
      {showStats && (
        <div className="mt-4 rounded-md border border-border/70 bg-surface-alt/60 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              Retrieval &amp; grounding detail
            </h4>
            <button
              type="button"
              onClick={() => setShowStats(false)}
              className="text-xs font-medium text-ink-faint hover:text-ink cursor-pointer"
            >
              Close
            </button>
          </div>

          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <dt className="text-ink-faint">Relevance score</dt>
              <dd className="font-mono text-ink">{recommendation.relevanceScore.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Coverage ratio</dt>
              <dd className="font-mono text-ink">
                {(recommendation.coverage?.overallCoverageRatio ?? 0).toFixed(3)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint">Evidence chunks</dt>
              <dd className="font-mono text-ink">{recommendation.evidence.length}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Grounding state</dt>
              <dd className="font-mono text-ink capitalize">{recommendation.groundingState.replace("_", " ")}</dd>
            </div>
          </dl>

          {recommendation.coverage && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-2">
                Coverage by dimension
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(recommendation.coverage)
                  .filter(([key]) => key !== "overallCoverageRatio")
                  .map(([dimension, status]) => (
                    <span
                      key={dimension}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border ${
                        status === "covered"
                          ? "bg-success-soft text-success border-success/30"
                          : status === "not_covered"
                            ? "bg-danger-soft text-danger border-danger/30"
                            : "bg-surface-raised text-ink-soft border-border/70"
                      }`}
                    >
                      <span className="capitalize">{dimension}:</span> {status}
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
