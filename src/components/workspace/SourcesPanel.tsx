"use client";

import { useState } from "react";
import { InterpretationPanel } from "@/components/query/InterpretationPanel";
import type { QueryInterpretation } from "@/types/api";

/**
 * The workspace's left panel: which official BIS sources the service draws
 * on, and what it understood from the current search.
 *
 * This is a working panel beside the results, not site navigation — the
 * full-width government top navigation is still the only way around the
 * app, and this panel collapses. That distinction matters because
 * CLAUDE.md rules out a permanent dashboard sidebar.
 *
 * Every row here names a real BIS source with its real host. Deliberately
 * no counts ("1,245 standards", "18,765 notifications"): this app does not
 * hold those numbers, and printing a plausible-looking figure next to a
 * government source is exactly the fabrication the project's truth rules
 * forbid. The host is checkable; an invented total is not.
 */

interface Source {
  name: string;
  detail: string;
  href: string;
}

const SOURCES: Source[] = [
  { name: "BIS Official Website", detail: "bis.gov.in", href: "https://www.bis.gov.in" },
  { name: "Indian Standards catalogue", detail: "standards.bis.gov.in", href: "https://standards.bis.gov.in/website/know-your-standards" },
  { name: "Quality Control Orders", detail: "Gazette QCOs, via bis.gov.in", href: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en" },
  { name: "Product Manuals", detail: "Indexed BIS product manuals", href: "https://www.bis.gov.in/product-certification/product-specific-information-2/product-manuals/" },
  { name: "e-BIS Services", detail: "services.bis.gov.in", href: "https://www.services.bis.gov.in/php/BIS_2.0/" },
  { name: "BIS Care App", detail: "Consumer complaints and verification", href: "https://www.bis.gov.in/bis-care-app/?lang=en" },
  { name: "Compulsory Registration Scheme", detail: "crsbis.in", href: "https://www.crsbis.in/BIS/about-crs.do" },
  { name: "Manakonline", detail: "manakonline.in", href: "https://www.manakonline.in" },
];

export function SourcesPanel({
  interpretation,
  onCollapse,
}: {
  interpretation?: QueryInterpretation | null;
  onCollapse: () => void;
}) {
  // Selection is presentational for now — see the note rendered below the
  // list. Tracking it in state keeps the control honest to the eye (it
  // really does toggle) without implying retrieval has been re-scoped.
  const [selected, setSelected] = useState<string[]>(() => SOURCES.map((s) => s.name));
  const allSelected = selected.length === SOURCES.length;

  function toggle(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border-strong/70 bg-surface-raised">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-navy">
          <SourcesIcon className="h-4 w-4" />
          Sources
        </h2>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sources panel"
          title="Collapse sources panel"
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-navy"
        >
          <PanelIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-border/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            Official sources in scope
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-ink-soft">
              {selected.length} of {SOURCES.length} selected
            </span>
            <button
              type="button"
              onClick={() => setSelected(allSelected ? [] : SOURCES.map((s) => s.name))}
              className="text-[11.5px] font-bold text-navy hover:underline"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-border/50">
          {SOURCES.map((source) => {
            const checked = selected.includes(source.name);
            return (
              <li key={source.name} className="px-4 py-2.5">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id={`source-${slug(source.name)}`}
                    checked={checked}
                    onChange={() => toggle(source.name)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                  />
                  <label htmlFor={`source-${slug(source.name)}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">{source.name}</span>
                    <span className="block truncate text-[11px] text-ink-faint">{source.detail}</span>
                  </label>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:text-navy"
                    aria-label={`Open ${source.name}`}
                    title={`Open ${source.name}`}
                  >
                    <ExternalIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-border/60 px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
          Selecting sources does not yet narrow retrieval — every search runs
          against the full indexed corpus. This list names where BIS publishes
          the material, so you can go read it at the source.
        </p>

        {interpretation && (
          <div className="border-t border-border/60 p-4">
            <InterpretationPanel interpretation={interpretation} />
          </div>
        )}
      </div>
    </aside>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function SourcesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
    </svg>
  );
}

function PanelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm6-1v16" />
    </svg>
  );
}

function ExternalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
