"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function GovernmentBar() {
  const { t } = useLanguage();

  return (
    <div className="hidden bg-navy-deep text-white/85 sm:block">
      <div className="mx-auto flex h-[34px] max-w-[1380px] items-center justify-between px-6 text-[11.5px]">
        <p className="font-medium tracking-wide">भारत के मानक, गुणवत्ता के प्रतीक</p>
        <div className="flex items-center gap-3">
          <a href="#main-content" className="hover:text-white">
            {t.gov.skip}
          </a>
          <span className="h-3 w-px bg-white/25" aria-hidden="true" />
          <a href="#" className="hover:text-white">
            {t.gov.screenReader}
          </a>
          <span className="h-3 w-px bg-white/25" aria-hidden="true" />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
