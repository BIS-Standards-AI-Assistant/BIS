"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AshokaChakra } from "@/components/ui/AshokaChakra";

export function GovernmentBar() {
  const { t } = useLanguage();

  return (
    <div className="hidden bg-navy-deep text-white/85 sm:block">
      <div className="mx-auto flex h-[34px] max-w-[1380px] items-center justify-between px-6 text-[11.5px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-medium tracking-wide" suppressHydrationWarning>
            <AshokaChakra variant="white" className="h-4.5 w-auto" />
            Government of India
          </span>
          <span className="h-3 w-px bg-white/25" aria-hidden="true" />
          <p className="font-medium tracking-wide">भारत के मानक, गुणवत्ता के प्रतीक</p>
        </div>
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
