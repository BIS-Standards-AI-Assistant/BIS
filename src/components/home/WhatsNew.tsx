"use client";

import Link from "next/link";
import { DocumentIcon, ArrowRightIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Top verified Indian Standards from the updated official BIS dataset.
 */
const FEATURED_STANDARDS = [
  {
    standardNumber: "IS 14543:2016",
    title: "Packaged Drinking Water",
    category: "Packaged Water & Beverages",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-14543-2016",
  },
  {
    standardNumber: "IS 2347:2017",
    title: "Domestic Pressure Cookers",
    category: "Kitchen & Domestic Appliances",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-2347-2017",
  },
  {
    standardNumber: "IS 16046 (Part 2):2018",
    title: "Lithium Cells & Power Banks",
    category: "IT & Consumer Electronics",
    scheme: "Scheme-II (CRS)",
    meta: "Mandatory CRS · Active",
    id: "is-16046-part-2-2018",
  },
  {
    standardNumber: "IS 1417:2016",
    title: "Gold & Silver Jewellery Hallmarking",
    category: "Precious Metals",
    scheme: "Hallmarking (HUID)",
    meta: "Mandatory 6-Digit HUID",
    id: "is-1417-2016",
  },
  {
    standardNumber: "IS 4151:2015",
    title: "Protective Helmets for Two-Wheelers",
    category: "Safety Gear",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-4151-2015",
  },
  {
    standardNumber: "IS 16333 (Part 3):2022",
    title: "Mobile Phone Indian Language Support",
    category: "Telecommunications",
    scheme: "Scheme-II (CRS)",
    meta: "22 Scheduled Languages",
    id: "is-16333-part-3-2022",
  },
];

export function WhatsNew() {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 text-blue" />
          <h2 className="text-[15px] font-bold text-navy">{t.whatsnew.heading}</h2>
        </div>
        <Link
          href="/standards"
          className="flex items-center gap-1 text-xs font-semibold text-blue hover:underline"
        >
          <span>{t.whatsnew.viewAll}</span>
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      <p className="mt-1 text-xs text-ink-faint">
        22+ verified Gazette standards with testing criteria &amp; QCO status.
      </p>

      <ul className="mt-4 space-y-2.5">
        {FEATURED_STANDARDS.map((item) => (
          <li key={item.standardNumber}>
            <Link
              href={`/standards/${item.id}`}
              className="group -m-1.5 flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-alt"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-navy transition-colors group-hover:bg-blue group-hover:text-white">
                <DocumentIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate font-mono text-[13px] font-bold text-navy group-hover:text-blue transition-colors">
                    {item.standardNumber}
                  </p>
                  <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                    {item.scheme}
                  </span>
                </div>
                <p className="line-clamp-1 text-[12.5px] font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 flex items-center justify-between text-[11px] text-ink-faint">
                  <span>{item.category}</span>
                  <span className="font-medium text-blue">{item.meta}</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-[11px] text-ink-faint">Verified against Gazette Orders</span>
        <Link
          href="/standards"
          className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
        >
          <span>Browse All 22+ Standards</span>
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
