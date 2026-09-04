/**
 * A single honest status line rather than a fake multi-stage progress
 * sequence: the API is one blocking request, so the frontend has no signal
 * for "now retrieving" vs "now generating" — claiming otherwise would be the
 * kind of faked progress the project explicitly avoids (AGENTS.md §24).
 */
export function LoadingIndicator() {
  return (
    // role="status" so the wait is announced to a screen reader; a spinner
    // in a live-region-less div is silent to anyone not watching it.
    <div role="status" className="flex items-center gap-3 border border-border bg-surface-raised px-5 py-4">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-strong border-t-navy" aria-hidden="true" />
      <p className="text-sm text-ink-soft">
        Searching BIS sources and preparing an evidence-backed answer…
      </p>
    </div>
  );
}
