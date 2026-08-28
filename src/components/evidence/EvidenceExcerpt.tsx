import Link from "next/link";

/**
 * The one recurring visual signature of this product: sourced document text
 * is never typeset like AI prose. It's monospace, left-railed in navy, and
 * labeled "Source evidence" with exactly where it came from — so a reader
 * can tell at a glance "this line is BIS's words, not the model's."
 * (AGENTS.md §5, §15; docs/ui/UI_DATA_AND_TRUTH_RULES.md)
 */
export function EvidenceExcerpt({
  standardNumber,
  documentTitle,
  section,
  clause,
  page,
  text,
  sourceUrl,
  standardHref,
}: {
  standardNumber: string | null;
  documentTitle: string;
  section?: string | null;
  clause?: string | null;
  page?: number | null;
  text: string;
  sourceUrl: string;
  standardHref?: string;
}) {
  const locator = [section, clause ? `clause ${clause}` : null, page ? `p. ${page}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-l-2 border-navy bg-surface-alt pl-4 py-3 pr-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
        Source evidence
      </p>
      <p className="mt-1 text-xs font-medium tracking-wide text-ink-soft">
        {standardHref ? (
          <Link href={standardHref} className="text-ink hover:text-navy underline decoration-border-strong underline-offset-2">
            {standardNumber ?? documentTitle}
          </Link>
        ) : (
          <span className="text-ink">{standardNumber ?? documentTitle}</span>
        )}
        {locator ? <span className="text-ink-faint"> · {locator}</span> : null}
      </p>
      <p className="mt-2 font-mono text-[13px] leading-relaxed text-ink-soft whitespace-pre-line">
        {text}
      </p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-medium text-navy hover:underline"
      >
        Open source document →
      </a>
    </div>
  );
}
