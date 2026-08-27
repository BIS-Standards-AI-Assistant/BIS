import type { QueryInterpretation } from "@/types/api";

const FIELD_LABELS: { key: keyof QueryInterpretation; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "material", label: "Material" },
  { key: "useCase", label: "Intended use" },
  { key: "targetUser", label: "User type" },
  { key: "sector", label: "Sector" },
];

export function InterpretationPanel({ interpretation }: { interpretation: QueryInterpretation }) {
  const known = FIELD_LABELS.filter((f) => interpretation[f.key]);

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        What we understood
      </h2>
      {known.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          No specific product details were stated in the query.
        </p>
      ) : (
        <dl className="mt-3 space-y-3">
          {known.map((f) => (
            <div key={f.key}>
              <dt className="text-xs text-ink-faint">{f.label}</dt>
              <dd className="text-sm text-ink">{String(interpretation[f.key])}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        {interpretation.certificationRequested && (
          <span className="rounded-full bg-neutral-soft px-2.5 py-1 text-xs text-ink-soft">
            Certification requested
          </span>
        )}
        {interpretation.testingRequested && (
          <span className="rounded-full bg-neutral-soft px-2.5 py-1 text-xs text-ink-soft">
            Testing requested
          </span>
        )}
      </div>
    </div>
  );
}
