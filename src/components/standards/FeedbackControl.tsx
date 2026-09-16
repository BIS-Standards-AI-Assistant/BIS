"use client";

import { useState } from "react";

const REASONS = [
  { value: "wrong_standard", label: "Wrong standard" },
  { value: "wrong_applicability", label: "Wrong applicability" },
  { value: "missing_evidence", label: "Missing evidence" },
  { value: "poor_explanation", label: "Poor explanation" },
  { value: "outdated_information", label: "Outdated information" },
  { value: "other", label: "Other" },
] as const;

/**
 * Reports a correction on a single query/standard pairing (prompts/final.md
 * §6's feedback reasons). Feeds data/ml/README.md's feedback pipeline — see
 * src/app/api/v1/feedback/route.ts and scripts/feedback-admin.ts. This is
 * intake only: nothing submitted here becomes training data until a human
 * reviews and promotes it, so there is no "thanks, we fixed it" claim here.
 */
export function FeedbackControl({
  query,
  standardNumber,
  standardTitle,
}: {
  query: string;
  standardNumber: string;
  standardTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("wrong_standard");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");

  async function submit() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, standardNumber, standardTitle, reason, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("submitted");
    } catch {
      setStatus("error");
    }
  }

  if (status === "submitted") {
    return <p className="text-[11.5px] text-ink-faint">Feedback recorded — thank you. It will be reviewed before it affects future results.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11.5px] font-semibold text-ink-faint underline decoration-dotted hover:text-ink cursor-pointer"
      >
        Report an issue with this result
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-surface-alt/50 p-3 text-[12px]">
      <label className="block font-bold text-ink-faint mb-1" htmlFor={`feedback-reason-${standardNumber}`}>
        What&apos;s wrong?
      </label>
      <select
        id={`feedback-reason-${standardNumber}`}
        value={reason}
        onChange={(e) => setReason(e.target.value as (typeof REASONS)[number]["value"])}
        className="w-full rounded border border-border-strong bg-surface px-2 py-1.5 text-[12px]"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional detail"
        rows={2}
        className="mt-2 w-full rounded border border-border-strong bg-surface px-2 py-1.5 text-[12px]"
      />
      {status === "error" && <p className="mt-1.5 text-danger text-[11.5px]">Couldn&apos;t submit — try again.</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === "submitting"}
          className="rounded bg-navy px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60 cursor-pointer"
        >
          {status === "submitting" ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-border-strong px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
