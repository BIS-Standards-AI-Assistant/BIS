"use client";

import { ShieldCheckIcon, CheckCircleIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function TrustCard() {
  const { t } = useLanguage();

  return (
    <div className="w-full rounded-xl border border-border bg-surface-raised p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue dark:bg-blue/20">
          <ShieldCheckIcon className="h-5 w-5 stroke-[2]" />
        </span>
        <h2 className="text-[16px] font-bold text-navy">{t.trust.heading}</h2>
      </div>
      <p className="mt-3.5 text-[13px] font-medium leading-relaxed text-ink-soft">{t.trust.description}</p>
      
      <div className="mt-4 border-t border-border pt-4">
        <ul className="space-y-3.5">
          {t.trust.rows.map((row) => (
            <li key={row} className="flex items-center gap-3 text-[13.5px] font-semibold text-ink-soft">
              <CheckCircleIcon className="h-4.5 w-4.5 shrink-0 text-blue" />
              {row}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

