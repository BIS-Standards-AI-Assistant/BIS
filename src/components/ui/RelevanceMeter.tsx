import { relevanceLabel } from "@/types/api";

/**
 * Deliberately a three-bucket label, not a raw percentage — the underlying
 * relevanceScore is model-estimated, not a calibrated statistic, so
 * presenting it as "87% relevant" would overstate precision it doesn't have.
 * Rendered as a meter + plain text, not a pill, per the design system's
 * restraint on badge/pill overuse.
 */
export function RelevanceMeter({ score }: { score: number }) {
  const label = relevanceLabel(score);
  const filled = label === "High relevance" ? 3 : label === "Moderate relevance" ? 2 : 1;
  const textColor = label === "High relevance" ? "text-success" : label === "Moderate relevance" ? "text-warning" : "text-ink-faint";
  const barColor = label === "High relevance" ? "bg-success" : label === "Moderate relevance" ? "bg-warning" : "bg-ink-faint";

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
