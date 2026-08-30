"use client";

import Link from "next/link";
import { AshokaChakra } from "@/components/ui/AshokaChakra";
import { ArchitecturalIllustration } from "@/components/home/ArchitecturalIllustration";
import { useLanguage } from "@/components/providers/LanguageProvider";

const SOCIALS = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/bureau-of-indian-standards",
    icon: (
      <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
  },
  {
    name: "X (formerly Twitter)",
    href: "https://twitter.com/IndianStandards",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@IndianStandard/videos",
    icon: (
      <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/indianstandards/",
    icon: (
      <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
];

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="bg-surface-raised border-t border-border">
      {/* Upper Footer: Ministry, Links, Connect */}
      <div className="mx-auto max-w-[1380px] px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_1fr_300px] items-start">
          {/* Left Column: National Emblem & Ministry Details */}
          <div className="flex items-start gap-4">
            <AshokaChakra className="h-14 w-14 shrink-0 text-navy" />
            <div className="text-[12px] font-bold leading-normal text-navy">
              <span className="block text-[11px] font-bold text-ink-soft mb-1">
                उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय
              </span>
              <span>MINISTRY OF CONSUMER AFFAIRS, FOOD &amp; PUBLIC DISTRIBUTION</span>
              <span className="block font-semibold text-ink-faint mt-0.5">GOVERNMENT OF INDIA</span>
            </div>
          </div>

          {/* Middle Column: Link Columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {t.footer.columns.map((col, idx) => {
              const href = idx === 0 ? "/about" : idx === 1 ? "/standards" : "/about#schemes";
              return (
                <div key={col.title} className="flex flex-col">
                  <h3 className="text-[13.5px] font-bold text-navy border-b border-border pb-2 mb-3">
                    {col.title}
                  </h3>
                  <p className="text-[12.5px] font-medium leading-relaxed text-ink-soft flex-1">
                    {col.body}
                  </p>
                  <Link
                    href={href}
                    className="mt-3 inline-flex items-center text-[12.5px] font-bold text-blue hover:text-navy-deep hover:underline transition-colors"
                  >
                    {col.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right Column: Connect Card with Watermark */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy-deep to-navy p-6 text-white shadow-md">
            {/* Architectural building watermark background */}
            <ArchitecturalIllustration className="absolute -bottom-8 -right-8 h-32 w-32 opacity-15 pointer-events-none transform scale-125" />
            
            <h3 className="relative z-10 text-[14px] font-bold tracking-wide uppercase">{t.footer.connect}</h3>
            
            {/* Social media horizontal circular badges */}
            <div className="relative z-10 mt-4 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-navy transition-all duration-300 hover:scale-105"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower Footer: Copyright, Policy Links, Last Updated Metadata */}
      <div className="bg-navy-deep text-white/80 border-t border-white/10">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-3 px-6 py-4 text-[11.5px] md:flex-row md:justify-between font-semibold tracking-wide">
          <p className="text-center md:text-left">© {year} {t.footer.rights}</p>
          <p className="flex flex-wrap items-center justify-center gap-2.5">
            <a href="https://www.bis.gov.in/sitemap/?lang=en" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.sitemap}</a>
            <span aria-hidden="true" className="opacity-30">|</span>
            <a href="https://www.bis.gov.in/privacy-policy/?lang=en" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.privacy}</a>
            <span aria-hidden="true" className="opacity-30">|</span>
            <a href="https://www.bis.gov.in/terms-and-conditions/?lang=en" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.terms}</a>
            <span aria-hidden="true" className="opacity-30">|</span>
            <a href="https://www.bis.gov.in/accessibility-statement/?lang=en" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.accessibility}</a>
          </p>

        </div>
      </div>
    </footer>
  );
}
