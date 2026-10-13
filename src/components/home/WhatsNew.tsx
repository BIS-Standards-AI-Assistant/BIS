"use client";

import Link from "next/link";
import { DocumentIcon, ArrowRightIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * A curated selection from the reference dataset
 * (data/bis-standards-dataset/qco-standards.json): title, scheme and
 * mandatory status mirror it, and `id` is the slug the Standards Register
 * links with, so /standards/[id] resolves. WhatsNew.test.tsx checks each
 * entry against the dataset.
 *
 * Edition years are the exception for IS 14543 and IS 4151. The dataset's
 * README documents "IS 14543:2024" and "IS 4151:2020" as non-existent
 * editions (the 2020 is the helmet QCO's year), corrected to 2016 and 2015
 * from the official BIS product manuals — which the seed corpus also holds
 * (data/seed/manifest.json). A 2026-09-03 catalog sync re-imported the
 * uncorrected years into qco-standards.json; until that is resolved, this
 * list shows the reviewed editions rather than repeat the error.
 */
export const FEATURED_STANDARDS = [
  {
    standardNumber: "IS 14543:2016",
    title: "Packaged Drinking Water",
    category: "Packaged Water & Beverages",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-14543",
  },
  {
    standardNumber: "IS 2347:2017",
    title: "Domestic Pressure Cookers",
    category: "Kitchen & Domestic Appliances",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-2347",
  },
  {
    standardNumber: "IS 16046 (Part 2):2018",
    title: "Lithium Cells and Batteries (Power Banks)",
    category: "IT & Consumer Electronics",
    scheme: "Scheme-II (CRS)",
    meta: "Mandatory CRS · Active",
    id: "is-16046-part-2",
  },
  {
    standardNumber: "IS 1417:2016",
    title: "Gold Jewellery and Artefacts Hallmarking",
    category: "Precious Metals",
    scheme: "Hallmarking",
    meta: "Mandatory Hallmarking · Active",
    id: "is-1417",
  },
  {
    standardNumber: "IS 4151:2015",
    title: "Two-Wheeler Protective Helmets",
    category: "Safety Gear",
    scheme: "Scheme-I (ISI)",
    meta: "Mandatory QCO · Active",
    id: "is-4151",
  },
  {
    standardNumber: "IS 16333 (Part 3):2022",
    title: "Mobile Phone Indian Language Support",
    category: "Telecommunications",
    scheme: "Scheme-II (CRS)",
    meta: "Mandatory CRS · Active",
    id: "is-16333-part-3",
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
        Mandatory standards from the fact-checked reference dataset, with certification scheme and QCO status.
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
        <span className="text-[11px] text-ink-faint">From the fact-checked reference dataset</span>
        <Link
          href="/standards"
          className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
        >
          <span>Browse all standards</span>
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
