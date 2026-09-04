import { relevanceLabel } from "@/types/api";

/**
 * Deliberately a three-bucket label, not a raw percentage — the underlying
 * relevanceScore is model-estimated, not a calibrated statistic, so
 * presenting it as "87% relevant" would overstate precision it doesn't have.
 * Rendered as a meter + plain text, not a pill, per the design system's
 * restraint on badge/pill overuse.
 *
 * `primary` (2026-09-04 applicability-gate fix): a candidate the hard
 * applicability gate excluded (src/lib/applicability.ts) must never show
 * a green "High relevance" bar — that combination is the exact reported
 * bug (a material-mismatched standard read as an endorsed, high-quality
 * match). When `primary` is false, relevance is real (the candidate WAS
 * retrieved because it's topically related) but the label and color must
 * not imply a quality endorsement applicability doesn't support.
 */
export function RelevanceMeter({ score, primary = true }: { score: number; primary?: boolean }) {
  const label = primary ? relevanceLabel(score) : "Related to your search";
  const filled = !primary ? 1 : label === "High relevance" ? 3 : label === "Moderate relevance" ? 2 : 1;
  const textColor = !primary ? "text-ink-faint" : label === "High relevance" ? "text-success" : label === "Moderate relevance" ? "text-warning" : "text-ink-faint";
  const barColor = !primary ? "bg-ink-faint" : label === "High relevance" ? "bg-success" : label === "Moderate relevance" ? "bg-warning" : "bg-ink-faint";

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-4 ${i < filled ? barColor : "bg-border-strong"}`} />
        ))}
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </div>
  );
}
