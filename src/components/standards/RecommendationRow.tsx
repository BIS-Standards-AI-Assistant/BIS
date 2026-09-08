"use client";

import type { Recommendation } from "@/types/api";
import { APPLICABILITY_LABEL, APPLICABILITY_TONE } from "@/components/standards/RecommendationCard";
import { Badge } from "@/components/ui/Badge";

/**
 * A compact, single-line stand-in for the full RecommendationCard in the
 * centre results list. The full card (relevance meter, why-this-applies
 * panel, coverage breakdown, every evidence excerpt) is a lot of vertical
 * space per result and was crowding out the centre's actual job — the
 * research conversation. Clicking a row opens the same full card content
 * in a popup (see HomeClient's recommendation modal) instead.
 */
export function RecommendationRow({
  recommendation,
  onOpen,
}: {
  recommendation: Recommendation;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1 rounded-lg border border-border/60 bg-surface-raised px-2.5 py-2 text-left transition-colors hover:border-navy hover:bg-navy/5"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11.5px] font-black tracking-wider text-navy">
          {recommendation.standardNumber ?? "Unnumbered Reference"}
        </span>
        <Badge tone={APPLICABILITY_TONE[recommendation.applicability.state]}>
          {APPLICABILITY_LABEL[recommendation.applicability.state]}
        </Badge>
      </div>
      <p className="truncate text-[12px] font-semibold text-ink">{recommendation.title}</p>
      <span className="text-[10.5px] font-bold text-navy">View evidence →</span>
    </button>
  );
}
