import type { QueryInterpretation } from "@/types/api";

const FIELD_LABELS: { key: keyof QueryInterpretation; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "material", label: "Material" },
  { key: "useCase", label: "Intended use" },
  { key: "targetUser", label: "User type" },
  { key: "sector", label: "Sector" },
];

export function InterpretationPanel({ interpretation }: { interpretation: QueryInterpretation }) {
  const missing = FIELD_LABELS.filter((f) => !interpretation[f.key]);

  return (
    <div className="rounded-lg border border-border-strong/70 bg-surface-raised p-5 sm:p-6">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold tracking-tight text-navy uppercase">
          Search Context
        </h2>
        <p className="text-xs text-ink-faint">
          What was detected from your search
        </p>
      </div>

      <dl className="mt-3.5 space-y-2.5">
        {FIELD_LABELS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <dt className="text-xs font-semibold text-ink-faint uppercase tracking-wider">
              {f.label}
            </dt>
            <dd
              className={`rounded-md px-2.5 py-1 text-xs max-w-[210px] truncate text-right ${
                interpretation[f.key]
                  ? "border border-border bg-surface-alt font-bold text-ink"
                  : "text-ink-faint italic"
              }`}
            >
              {interpretation[f.key] ? String(interpretation[f.key]) : "Not specified"}
            </dd>
          </div>
        ))}
      </dl>

      {missing.length > 0 && (
        <p className="mt-3.5 text-xs text-ink-soft">
          Adding {missing.map((f) => f.label.toLowerCase()).join(", ")} may improve relevance.
        </p>
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
