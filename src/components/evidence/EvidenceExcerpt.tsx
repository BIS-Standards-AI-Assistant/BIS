import Link from "next/link";

/**
 * The one recurring visual signature of this product: sourced document text
 * is never typeset like AI prose. It's monospace, left-railed in the accent
 * color, and labeled with exactly where it came from — so a reader can tell
 * at a glance "this line is BIS's words, not the model's" (AGENTS.md §5, §15).
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
    <div className="border-l-2 border-accent bg-surface-alt pl-4 py-3 pr-3 rounded-r-md">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium tracking-wide text-ink-soft">
          {standardHref ? (
            <Link href={standardHref} className="text-ink hover:text-accent-ink underline decoration-border-strong underline-offset-2">
              {standardNumber ?? documentTitle}
            </Link>
          ) : (
            <span className="text-ink">{standardNumber ?? documentTitle}</span>
          )}
          {locator ? <span className="text-ink-faint"> · {locator}</span> : null}
        </p>
      </div>
      <p className="mt-2 font-mono text-[13px] leading-relaxed text-ink-soft whitespace-pre-line">
        {text}
      </p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-medium text-accent-ink hover:underline"
      >
        Open source document →
      </a>
    </div>
  );
}
