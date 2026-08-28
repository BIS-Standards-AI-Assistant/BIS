"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Illustrative example queries only — every standard number shown is drawn
 * from data/seed/manifest.json (the documents actually ingested into this
 * build's index), never invented. See docs/ui/UI_DATA_AND_TRUTH_RULES.md.
 */
const QUERIES = [
  {
    query: "Stainless steel utensils for daily use",
    standards: ["IS 5522:2014"],
    type: "Example",
  },
  {
    query: "Stainless steel cookware",
    standards: ["IS 14756:2017"],
    type: "Example",
  },
  {
    query: "Packaged drinking water bottle",
    standards: ["IS 15410:2003", "IS 14543:2016"],
    type: "Example",
  },
];

export function RecentQueries() {
  const { t } = useLanguage();

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-navy">{t.recent.heading}</h2>
        <Link href="/search" className="text-xs font-medium text-blue hover:underline">
          {t.recent.viewAll} →
        </Link>
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="w-12 px-4 py-3">{t.recent.colHash}</th>
              <th className="px-4 py-3">{t.recent.colQuery}</th>
              <th className="px-4 py-3">{t.recent.colStandards}</th>
              <th className="px-4 py-3">{t.recent.colLast}</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {QUERIES.map((row, i) => (
              <tr key={row.query} className="border-b border-border last:border-0 hover:bg-surface-alt/60">
                <td className="px-4 py-3.5 text-ink-faint">{i + 1}</td>
                <td className="px-4 py-3.5 font-medium text-ink">{row.query}</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {row.standards.map((s) => (
                      <Badge key={s} tone="info">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-ink-soft">{row.type}</td>
                <td className="px-4 py-3.5 text-ink-faint">
                  <ChevronRightIcon className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-3 md:hidden">
        {QUERIES.map((row, i) => (
          <li key={row.query} className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink">
                <span className="mr-1.5 text-ink-faint">{i + 1}.</span>
                {row.query}
              </p>
              <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.standards.map((s) => (
                <Badge key={s} tone="info">
                  {s}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">{row.type}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
