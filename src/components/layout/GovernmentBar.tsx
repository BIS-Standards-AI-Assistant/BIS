"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AshokaChakra } from "@/components/ui/AshokaChakra";

export function GovernmentBar() {
  const { t } = useLanguage();

  return (
    <div className="bg-navy-deep text-white/85">
      <div className="mx-auto flex min-h-[34px] max-w-[1380px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1 text-[11.5px] sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-medium tracking-wide" suppressHydrationWarning>
            <AshokaChakra variant="white" className="h-4.5 w-auto" />
            Government of India
          </span>
          <span className="hidden h-3 w-px bg-white/25 sm:block" aria-hidden="true" />
          <p className="hidden font-medium tracking-wide sm:block">भारत के मानक, गुणवत्ता के प्रतीक</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Skip to main content — WCAG 2.4.1 Bypass Blocks */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:rounded focus:px-2 focus:py-0.5 focus:text-white focus:outline focus:outline-2 focus:outline-white/50"
          >
            {t.gov.skip}
          </a>
          <span className="h-3 w-px bg-white/25" aria-hidden="true" />
          {/* Screen Reader Access note — links to WCAG accessibility page */}
          <a
            href="https://www.bis.gov.in/others/accessibility-statement/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
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
