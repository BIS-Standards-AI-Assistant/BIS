import { sourceLabel, type SourceCandidate } from "@/lib/source-search";
import { CloseIcon } from "./icons";

/** The research context the centre discusses (§6): removable one by one, or all at once. */
export function SelectedSourcesList({
  sources,
  onRemove,
  onClear,
}: {
  sources: SourceCandidate[];
  onRemove: (source: SourceCandidate) => void;
  onClear: () => void;
}) {
  if (sources.length === 0) return null;
  return (
    <section className="mt-3 rounded-lg border border-navy/20 bg-navy/5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-navy">
          Selected sources ({sources.length})
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-bold text-navy hover:underline"
        >
          Clear all
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {sources.map((source) => (
          <li key={source.id} className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[11px] font-bold text-navy">
                {source.standardNumber ?? source.title}
              </span>
              {source.standardNumber && (
                <span className="block truncate text-[11px] text-ink-soft">{source.title}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onRemove(source)}
              aria-label={`Remove ${source.standardNumber ?? source.title}`}
              className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-danger"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Retrieval results. Never labelled "recommended": applicability is a
 * separate deterministic decision made against evidence (§5, §23).
 */
export function SourceSearchResults({
  results,
  isSelected,
  onToggle,
}: {
  results: SourceCandidate[];
  isSelected: (id: string) => boolean;
  onToggle: (source: SourceCandidate) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="mt-4 px-1">
        <p className="text-[12.5px] font-semibold text-ink">No matching BIS sources found.</p>
        <ul className="mt-1.5 space-y-1 text-[12px] text-ink-faint">
          <li>Try a standard number, such as IS 4985:2021.</li>
          <li>Try a broader description of the product.</li>
          <li>Add your own document below.</li>
        </ul>
      </div>
    );
  }

  return (
    <section className="mt-4">
      <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
        Matching BIS sources ({results.length})
      </h3>
      <ul className="mt-2 space-y-1.5">
        {results.map((source) => (
          <li key={source.id} className="rounded-lg border border-border/60 bg-surface-alt/40 p-2.5">
            <p className="font-mono text-[11.5px] font-bold text-navy">
              {source.standardNumber ?? "Document"}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink">{source.title}</p>
            <p className="mt-1 text-[11px] text-ink-faint">
              {sourceLabel(source)} · {source.matchingPassages} indexed passage
              {source.matchingPassages === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => onToggle(source)}
              aria-pressed={isSelected(source.id)}
              className={`mt-2 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                isSelected(source.id)
                  ? "border-navy bg-navy text-white"
                  : "border-border-strong text-navy hover:border-navy hover:bg-navy/5"
              }`}
            >
              {isSelected(source.id) ? "Selected" : "Select"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
