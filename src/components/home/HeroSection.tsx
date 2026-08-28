"use client";

import { SearchHero } from "@/components/query/SearchHero";
import { TrustCard } from "@/components/home/TrustCard";
import { ArchitecturalIllustration } from "@/components/home/ArchitecturalIllustration";
import { BisLogo } from "@/components/ui/BisLogo";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function HeroSection({
  onSubmit,
  loading,
}: {
  onSubmit: (query: string) => void;
  loading: boolean;
}) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface-alt">
      <ArchitecturalIllustration className="pointer-events-none absolute inset-y-0 right-0 h-full w-[62%] text-navy opacity-[0.12]" />
      <BisLogo className="pointer-events-none absolute -right-16 -bottom-10 h-80 w-80 opacity-[0.06]" />

      <div className="relative mx-auto max-w-[1380px] px-6 py-14 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-navy sm:text-4xl lg:text-[42px]">
              {t.hero.titleLine1}
              <br />
              {t.hero.titlePre}
              <span className="text-orange">{t.hero.titleHighlight}</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">{t.hero.subtitle}</p>

            <div className="mt-8 max-w-3xl">
              <SearchHero onSubmit={onSubmit} loading={loading} />
            </div>
          </div>

          <div className="lg:pt-1">
            <TrustCard />
          </div>
        </div>
      </div>
    </section>
  );
}
