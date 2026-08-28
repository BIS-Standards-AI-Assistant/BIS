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
    query: "Stainless steel water bottle for kids",
    standards: ["IS 15410:2003", "IS 14756:2017"],
    time: "2 hours ago",
  },
  {
    query: "LED Bulb for domestic use",
    standards: ["IS 16102:2012", "IS 15885:2010"],
    time: "1 day ago",
  },
  {
    query: "Pressure cooker aluminium",
    standards: ["IS 2347:2017", "IS 3074:2018"],
    time: "3 days ago",
  },
];

export function RecentQueries() {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-navy">{t.recent.heading}</h2>
        <Link href="/search" className="flex items-center gap-1 text-xs font-bold text-blue hover:underline">
          {t.recent.viewAll} <span className="text-[10px]">→</span>
        </Link>
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              <th className="w-12 px-5 py-3.5">{t.recent.colHash}</th>
              <th className="px-5 py-3.5">{t.recent.colQuery}</th>
              <th className="px-5 py-3.5">{t.recent.colStandards}</th>
              <th className="px-5 py-3.5">{t.recent.colLast}</th>
              <th className="w-12 px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {QUERIES.map((row, i) => (
              <tr key={row.query} className="border-b border-border last:border-0 hover:bg-surface-alt/40 transition-colors">
                <td className="px-5 py-4 font-semibold text-ink-faint">{i + 1}</td>
                <td className="px-5 py-4 font-bold text-navy hover:text-blue transition-colors cursor-pointer">
                  {row.query}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {row.standards.map((s) => (
                      <Badge key={s} tone="info">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold text-ink-soft">{row.time}</td>
                <td className="px-5 py-4 text-ink-faint text-right">
                  <ChevronRightIcon className="h-4 w-4 inline-block transform transition-transform group-hover:translate-x-0.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-3 md:hidden">
        {QUERIES.map((row, i) => (
          <li key={row.query} className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-navy">
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
            <p className="mt-2 text-[11px] font-medium text-ink-faint">{row.time}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
