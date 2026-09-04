import { CONFIDENCE, type ConfidenceLevel } from "@/lib/provenance";

/**
 * Confidence in words, with its meaning attached (§11).
 *
 * There is deliberately no percentage and no bar: a number implies a
 * calibration the engine cannot honestly claim, and §11 asks for meaningful
 * language instead. The `meaning` line is rendered, not hidden in a tooltip,
 * because "Likely applicable" tells a first-time reader nothing on its own.
 */

const TONE: Record<string, string> = {
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  neutral: "border-border bg-neutral-soft text-ink-soft",
};

export function ConfidenceIndicator({
  level,
  showMeaning = true,
}: {
  level: ConfidenceLevel;
  /** Hide the explanation only where it is already stated nearby. */
  showMeaning?: boolean;
}) {
  const meta = CONFIDENCE[level];
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${TONE[meta.tone]}`}
      >
        <ConfidenceGlyph tone={meta.tone} />
        {meta.label}
      </span>
      {showMeaning && (
        <span className="text-[11px] leading-snug text-ink-faint">{meta.meaning}</span>
      )}
    </span>
  );
}

/** A shape per tone, so the level is not carried by colour alone (§34). */
function ConfidenceGlyph({ tone }: { tone: string }) {
  const common = { className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": true } as const;
  if (tone === "success") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
    );
  }
  if (tone === "danger") {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v5m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
