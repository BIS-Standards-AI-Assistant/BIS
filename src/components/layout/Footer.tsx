"use client";

import Link from "next/link";
import { GovEmblem } from "@/components/ui/GovEmblem";
import { useLanguage } from "@/components/providers/LanguageProvider";

const SOCIALS = ["LinkedIn", "X", "YouTube", "Instagram"];

export function Footer() {
  const { t, lang } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="bg-surface-raised">
      <div className="border-t border-border">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[240px_1fr_260px]">
          <div className="flex items-start gap-3">
            <GovEmblem className="h-12 w-12 shrink-0" />
            <p className="text-[13px] font-semibold leading-relaxed text-navy">
              {lang !== "hi" && (
                <>
                  उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय
                  <br />
                </>
              )}
              {t.footer.ministryLine1}
              <br />
              {t.footer.ministryLine2}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.footer.columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13.5px] font-semibold text-navy">{col.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{col.body}</p>
                <Link href="/" className="mt-2 inline-block text-[12.5px] font-medium text-blue hover:underline">
                  {col.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-navy-deep p-5 text-white">
            <h3 className="text-[14px] font-semibold">{t.footer.connect}</h3>
            <ul className="mt-3 space-y-2 text-[13px]">
              {SOCIALS.map((s) => (
                <li key={s}>
                  <a href="#" className="text-white/85 hover:text-white hover:underline">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-navy-deep text-white/80">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-2 px-6 py-3.5 text-[11.5px] sm:flex-row sm:justify-between">
          <p>© {year} {t.footer.rights}</p>
          <p className="flex flex-wrap items-center justify-center gap-2">
            <a href="#" className="hover:text-white">{t.footer.sitemap}</a>
            <span aria-hidden="true">|</span>
            <a href="#" className="hover:text-white">{t.footer.privacy}</a>
            <span aria-hidden="true">|</span>
            <a href="#" className="hover:text-white">{t.footer.terms}</a>
            <span aria-hidden="true">|</span>
            <a href="#" className="hover:text-white">{t.footer.accessibility}</a>
          </p>
          <p className="font-medium">SIH 2026 Prototype</p>
        </div>
      </div>
    </footer>
  );
}
