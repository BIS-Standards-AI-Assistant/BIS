import type { QueryInterpretation } from "@/types/api";

const FIELD_LABELS: { key: keyof QueryInterpretation; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "material", label: "Material" },
  { key: "useCase", label: "Intended use" },
  { key: "targetUser", label: "User type" },
  { key: "sector", label: "Sector" },
];

/**
 * Institutional standards interpretation card.
 * Uses a dignified compliance audit emblem, crisp typography, and structured parameters.
 */
export function InterpretationPanel({ interpretation }: { interpretation: QueryInterpretation }) {
  const known = FIELD_LABELS.filter((f) => interpretation[f.key]);

  return (
    <div className="rounded-2xl border border-border-strong/70 bg-surface-raised p-5 sm:p-6 shadow-xs transition-all hover:border-navy/30 hover:shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/60 pb-3.5">
        {/* Dignified Institutional Parameter/Compliance Emblem */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy border border-navy/20">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold tracking-tight text-navy uppercase">
              Extracted Parameters
            </h2>
            <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-[10.5px] font-bold tracking-wider text-navy border border-navy/15">
              Structured
            </span>
          </div>
          <p className="text-xs text-ink-faint font-medium">
            Identified compliance requirements
          </p>
        </div>
      </div>

      {known.length === 0 ? (
        <p className="mt-3.5 text-xs text-ink-soft">
          No specific product dimensions or material grades were stated in this query.
        </p>
      ) : (
        <dl className="mt-3.5 space-y-2.5">
          {known.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <dt className="text-xs font-semibold text-ink-faint uppercase tracking-wider">
                {f.label}
              </dt>
              <dd className="rounded-md border border-border bg-surface-alt px-2.5 py-1 text-xs font-bold text-ink max-w-[210px] truncate text-right">
                {String(interpretation[f.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {(interpretation.certificationRequested || interpretation.testingRequested) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
          {interpretation.certificationRequested && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy/10 px-2.5 py-1 text-xs font-bold text-navy border border-navy/20">
              <span className="h-1.5 w-1.5 rounded-full bg-navy" />
              Certification requested
            </span>
          )}
          {interpretation.testingRequested && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold/20 px-2.5 py-1 text-xs font-bold text-gold-ink border border-gold/30">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-ink" />
              Testing requested
            </span>
          )}
        </div>
      )}
    </div>
  );
}
