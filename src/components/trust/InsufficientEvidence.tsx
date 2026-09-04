"use client";

/**
 * The zero-hallucination state (§10).
 *
 * When the engine cannot establish an answer this is what a reader sees
 * instead of a hedged recommendation. It says plainly that nothing was
 * determined, names what is missing, and offers the two honest ways
 * forward: supply the missing facts, or go to the official channel. It
 * never names a standard "as a starting point" — that is the failure mode
 * this component exists to prevent.
 */
export function InsufficientEvidence({
  missing,
  onAnswerQuestions,
}: {
  /** What the engine actually lacked. Empty is allowed — say so rather than invent gaps. */
  missing: string[];
  onAnswerQuestions?: () => void;
}) {
  return (
    <section
      role="status"
      className="rounded-lg border border-warning/30 bg-warning-soft/30 p-5"
    >
      <h3 className="text-[15px] font-bold text-ink">
        We couldn&apos;t determine the applicable standard with enough confidence
      </h3>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
        Rather than name a standard we cannot support with evidence, we would
        rather tell you that. Compliance decisions made on a guess are worse
        than no answer.
      </p>

      {missing.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
            What would help
          </h4>
          <ul className="mt-2 space-y-1.5">
            {missing.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-soft">
          The system did not identify a specific gap — the indexed corpus simply
          may not cover this product yet.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {onAnswerQuestions && missing.length > 0 && (
          <button
            type="button"
            onClick={onAnswerQuestions}
            className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-navy-deep"
          >
            Answer {missing.length} question{missing.length === 1 ? "" : "s"}
          </button>
        )}
        <a
          href="https://www.bis.gov.in/standards/technical-department/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border-strong px-4 py-2 text-[13px] font-bold text-navy transition-colors hover:border-navy hover:bg-navy/5"
        >
          Ask the relevant BIS technical department
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
