import Link from "next/link";

/** Only web links are rendered as links; anything else (javascript:, data:, a bare path) is dropped. */
function externalHref(url: string): string | null {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

/**
 * A quoted passage from an indexed source document, with its locator and a
 * link to the document it came from.
 *
 * Labelled "Source evidence" (docs/ui/UI_DATA_AND_TRUTH_RULES.md), not as a
 * gazetted or official-gazette text: these passages come from every kind of
 * indexed document — standards, guidelines, and on reference records a
 * summary built from the QCO dataset — and nothing here verifies that a
 * given passage or link is a Gazette publication.
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
  const sourceHref = sourceUrl ? externalHref(sourceUrl) : null;

  return (
    <div className="rounded-xl border border-navy/15 bg-gradient-to-br from-navy/[0.02] via-surface-raised to-surface-alt/70 p-4 sm:p-4.5 shadow-2xs transition-all hover:border-navy/35 hover:shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-navy/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-navy">
            <svg className="h-3.5 w-3.5 text-navy" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
            Source evidence
          </span>
          {locator ? (
            <span className="rounded-md bg-surface-alt px-2.5 py-0.5 text-[11px] font-mono font-bold text-ink-soft border border-border/60">
              {locator}
            </span>
          ) : null}
        </div>

        {sourceHref && (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-navy hover:text-navy-deep hover:underline transition-colors"
          >
            <span>Open source document</span>{" "}
            <span className="sr-only">(opens in a new tab)</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Sourced text with beautiful, authoritative typography */}
      <div className="mt-3 rounded-lg border border-border/70 bg-surface-alt/70 p-3.5 sm:p-4">
        <p className="font-sans text-[13.5px] sm:text-[14px] leading-[1.8] text-ink font-normal tracking-[0.01em] whitespace-pre-line selection:bg-gold-soft selection:text-ink">
          {text}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-ink-faint">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">Standard:</span>
          {standardHref ? (
            <Link
              href={standardHref}
              className="font-bold text-navy hover:underline decoration-navy/40 underline-offset-2"
            >
              {standardNumber ?? documentTitle}
            </Link>
          ) : (
            <span className="font-bold text-ink">{standardNumber ?? documentTitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
