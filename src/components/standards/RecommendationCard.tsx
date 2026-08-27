import Link from "next/link";
import type { Recommendation } from "@/types/api";
import { RelevanceMeter } from "@/components/ui/RelevanceMeter";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const documentId = recommendation.evidence[0]?.documentId;

  return (
    <article className="rounded-lg border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-medium text-accent-ink">
            {recommendation.standardNumber ?? "Unnumbered reference"}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-ink">{recommendation.title}</h3>
        </div>
        <RelevanceMeter score={recommendation.relevanceScore} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{recommendation.reason}</p>

      {recommendation.evidence.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Evidence · {recommendation.evidence.length} source{recommendation.evidence.length > 1 ? "s" : ""}
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
          className="mt-4 inline-block text-sm font-medium text-ink hover:text-accent-ink"
        >
          View standard →
        </Link>
      )}
    </article>
  );
}
