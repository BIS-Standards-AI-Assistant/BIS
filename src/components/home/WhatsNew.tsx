"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarIcon, DocumentIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  {
    title: "IS 15410:2024",
    description: "Stainless steel water bottles — specification",
    meta: "Published on 02 Feb 2024",
  },
];

export function WhatsNew() {
  const [active, setActive] = useState(0);
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-navy">{t.whatsnew.heading}</h2>
        <Link href="/search" className="text-xs font-medium text-blue hover:underline">
          {t.whatsnew.viewAll} →
        </Link>
      </div>

      <ul className="mt-4 space-y-4">
        {ITEMS.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-navy">
              <DocumentIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
              <p className="text-[12.5px] text-ink-soft">{item.description}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-faint">
                <CalendarIcon className="h-3 w-3" />
                {item.meta}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center gap-1.5 border-t border-border pt-4">
        {ITEMS.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show update ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-4 bg-blue" : "w-1.5 bg-border-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
