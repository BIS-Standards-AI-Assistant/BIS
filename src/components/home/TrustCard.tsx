"use client";

import { ShieldCheckIcon, CheckCircleIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function TrustCard() {
  const { t } = useLanguage();

  return (
    <div className="w-full rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
          <ShieldCheckIcon className="h-5 w-5" />
        </span>
        <h2 className="text-[15px] font-semibold text-navy">{t.trust.heading}</h2>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{t.trust.description}</p>
      <div className="mt-4 border-t border-border pt-4">
        <ul className="space-y-3">
          {t.trust.rows.map((row) => (
            <li key={row} className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-blue" />
              {row}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
