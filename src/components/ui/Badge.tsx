import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "accent" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-ink-soft",
  accent: "bg-accent-soft text-accent-ink",
  info: "bg-info-soft text-info",
};

/**
 * A rectangular status chip, not a rounded pill — the UI spec calls for
 * restraint ("no excessive pills"); a small square-cornered tag reads as
 * an official status label rather than a SaaS badge.
 */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-[11.5px] font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
