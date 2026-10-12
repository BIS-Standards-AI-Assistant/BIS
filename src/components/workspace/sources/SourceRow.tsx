import { removeSource, toggleSourceSelected, type LibrarySource } from "@/lib/source-library";
import { CloseIcon } from "./icons";

/** One added document: its analysis status, the standards it cites, and its limitations. */
export function SourceRow({ source }: { source: LibrarySource }) {
  const cited = source.citedNumbers.length;
  const usable = source.standardNumbers.length;

  return (
    <li className="rounded-lg border border-border/60 bg-surface-alt/40 px-2.5 py-2">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={`src-${source.id}`}
          checked={source.selected}
          disabled={source.status !== "ready"}
          onChange={() => toggleSourceSelected(source.id)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-navy disabled:opacity-40"
        />
        <label htmlFor={`src-${source.id}`} className="min-w-0 flex-1 cursor-pointer">
          <span className="block truncate text-[12.5px] font-semibold text-ink">{source.name}</span>
          <span className="block text-[11px] text-ink-faint">
            {source.status === "analyzing" && "Reading document…"}
            {source.status === "failed" && <span className="text-danger">{source.error}</span>}
            {source.status === "ready" &&
              (cited > 0
                ? `${cited} Indian Standard${cited === 1 ? "" : "s"} cited · ${usable} in this system`
                : "No Indian Standard references found")}
          </span>
        </label>
        <button
          type="button"
          onClick={() => removeSource(source.id)}
          aria-label={`Remove ${source.name}`}
          title={`Remove ${source.name}`}
          className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-danger"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {source.status === "ready" && cited > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-6.5">
          {source.citedNumbers.slice(0, 6).map((number) => {
            // Dimmed when the standard is not indexed here: the document
            // really does cite it, but the assistant has nothing to answer
            // from, and the two cases must not look identical.
            const indexed = source.standardNumbers.includes(number);
            return (
              <span
                key={number}
                title={indexed ? "In this system's knowledge base" : "Cited by the document, not indexed here"}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                  indexed
                    ? "bg-navy/10 text-navy"
                    : "border border-dashed border-border-strong text-ink-faint"
                }`}
              >
                {number}
              </span>
            );
          })}
        </div>
      )}

      {source.limitations.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-6.5">
          {source.limitations.map((limitation) => (
            <li key={limitation} className="text-[10.5px] leading-snug text-ink-faint">
              {limitation}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
