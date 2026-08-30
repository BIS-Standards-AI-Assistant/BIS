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
  const documentId = recommendation.evidence[0]?.documentId;

  return (
    <article className="border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-medium text-navy">
            {recommendation.standardNumber ?? "Unnumbered reference"}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-ink">{recommendation.title}</h3>
        </div>
        <RelevanceMeter score={recommendation.relevanceScore} />
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Why this appears relevant</p>
          <Badge tone={GROUNDING_TONE[recommendation.groundingState]}>{GROUNDING_LABEL[recommendation.groundingState]}</Badge>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{recommendation.reason}</p>
      </div>

      <div className="mt-3">
        <CoveragePanel coverage={recommendation.coverage} />
      </div>

      {recommendation.evidence.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {recommendation.evidence.length} supporting source{recommendation.evidence.length > 1 ? "s" : ""}
          </h4>
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

      {documentId && (
        <Link
          href={`/standards/${documentId}`}
          className="mt-4 inline-block text-sm font-medium text-navy hover:underline"
        >
          View standard →
        </Link>
      )}
    </article>
  );
}
