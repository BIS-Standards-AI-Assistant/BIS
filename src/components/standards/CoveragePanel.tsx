import type { CoverageResult, CoverageStatus } from "@/types/api";
import { CheckCircleIcon, AlertTriangleIcon } from "@/components/ui/icons";

/**
 * Renders exactly the engine-computed coverage dimensions — never inferred
 * in the UI. Dimensions marked "unknown" (the query didn't ask about that
 * dimension at all) are omitted rather than shown as a false negative; see
 * src/lib/coverage-analysis.ts for how "unknown" vs "not_covered" is
 * decided upstream.
 */
const DIMENSION_LABEL: Record<keyof Omit<CoverageResult, "overallCoverageRatio">, string> = {
  product: "Product",
  material: "Material",
  application: "Intended use",
  targetUser: "Target user",
  sector: "Sector",
  testing: "Testing requirement",
  certification: "Certification requirement",
  identifier: "Standard identifier",
};

const STATUS_ICON: Record<Exclude<CoverageStatus, "unknown">, typeof CheckCircleIcon> = {
  covered: CheckCircleIcon,
  not_covered: AlertTriangleIcon,
};

const STATUS_CLASS: Record<Exclude<CoverageStatus, "unknown">, string> = {
  covered: "text-success",
  not_covered: "text-warning",
};

export function CoveragePanel({ coverage }: { coverage: CoverageResult }) {
  const entries = (Object.keys(DIMENSION_LABEL) as Array<keyof typeof DIMENSION_LABEL>)
    .map((key) => ({ key, label: DIMENSION_LABEL[key], status: coverage[key] }))
    .filter((e) => e.status !== "unknown");

  if (entries.length === 0) return null;

  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Applicability</p>
      <ul className="mt-1.5 space-y-1">
        {entries.map(({ key, label, status }) => {
          const Icon = STATUS_ICON[status as Exclude<CoverageStatus, "unknown">];
          return (
            <li key={key} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${STATUS_CLASS[status as Exclude<CoverageStatus, "unknown">]}`} />
              <span>{label}</span>
              {status === "not_covered" && (
                <span className="text-ink-faint">— not established by the evidence</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
