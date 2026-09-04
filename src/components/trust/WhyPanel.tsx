"use client";

import { useState } from "react";
import { SourceTag } from "@/components/trust/SourceTag";

/**
 * "Why does this apply?" (§8) — progressive disclosure in one component (§28).
 *
 * Level 1 is the plain-language reason, always visible. Levels 2-4 (the
 * matched attributes, the clause, the document) sit behind a disclosure, so
 * a first-time reader is not buried and an expert is one click from the
 * clause. The reasoning is tagged as AI interpretation and the evidence as
 * official source, side by side — that contrast is the point of the panel,
 * not decoration.
 */

export interface MatchedAttribute {
  /** What the user told us, e.g. "Material". */
  attribute: string;
  /** Their value, e.g. "Stainless steel". */
  value: string;
}

export function WhyPanel({
  reason,
  attributes = [],
  children,
}: {
  /** Plain-language reason. AI interpretation, and labelled as such. */
  reason: string;
  /** Which product attributes drove the match (§8). */
  attributes?: MatchedAttribute[];
  /** The evidence itself — official source, rendered by the caller. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = attributes.length > 0 || Boolean(children);

  return (
    <section className="rounded-lg border border-border/70 bg-surface-alt/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3.5 py-2">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">
          Why this applies
        </h4>
        <SourceTag provenance="ai" />
      </div>

      <p className="px-3.5 py-3 text-[13.5px] leading-relaxed text-ink">{reason}</p>

      {hasDetail && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-1.5 border-t border-border/60 px-3.5 py-2 text-left text-[11.5px] font-bold text-navy transition-colors hover:bg-surface-alt"
          >
            <svg
              className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {open ? "Hide the reasoning and evidence" : "Show the reasoning and evidence"}
          </button>

          {open && (
            <div className="space-y-3 border-t border-border/60 px-3.5 py-3">
              {attributes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                      Matched on what you told us
                    </h5>
                    <SourceTag provenance="user" />
                  </div>
                  <dl className="mt-1.5 space-y-1">
                    {attributes.map((a) => (
                      <div key={a.attribute} className="flex gap-2 text-[12.5px]">
                        <dt className="w-28 shrink-0 text-ink-faint">{a.attribute}</dt>
                        <dd className="font-semibold text-ink">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {children && (
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">
                      Evidence
                    </h5>
                    <SourceTag provenance="official" />
                  </div>
                  <div className="mt-1.5">{children}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
