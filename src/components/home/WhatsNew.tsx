"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarIcon, DocumentIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Sourced verbatim from data/seed/manifest.json — the actual documents
 * ingested into this build's retrieval index. Never invent entries here;
 * see docs/ui/UI_DATA_AND_TRUTH_RULES.md.
 */
const ITEMS = [
  {
    title: "IS 302 (Part 1):2024",
    description: "Steel tubes for structural purposes",
    meta: "Published on 15 May 2024",
  },
  {
    title: "Revision of IS 456:2000",
    description: "Plain and reinforced concrete",
    meta: "Under revision",
  },
];

export function WhatsNew() {
  const [active, setActive] = useState(0);
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-navy">{t.whatsnew.heading}</h2>
        <Link href="/search" className="flex items-center gap-0.5 text-xs font-bold text-blue hover:underline">
          {t.whatsnew.viewAll} <span className="text-[10px]">→</span>
        </Link>
      </div>

      <ul className="mt-5 space-y-5">
        {ITEMS.map((item) => (
          <li key={item.title} className="flex gap-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-blue dark:bg-surface-alt/10">
              <CalendarIcon className="h-4.5 w-4.5 stroke-[2]" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-navy hover:text-blue cursor-pointer transition-colors">
                {item.title}
              </p>
              <p className="text-[12.5px] font-semibold text-ink-soft leading-snug mt-0.5">
                {item.description}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-ink-faint">
                {item.meta}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center gap-1.5 border-t border-border pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show update ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-4 bg-blue" : "w-2 bg-border-strong hover:bg-ink-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
