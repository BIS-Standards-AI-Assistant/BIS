"use client";

import { SearchHero } from "@/components/query/SearchHero";
import { TrustCard } from "@/components/home/TrustCard";
import { ArchitecturalIllustration } from "@/components/home/ArchitecturalIllustration";
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
    <section className="relative overflow-hidden border-b border-border bg-surface min-h-[480px] lg:min-h-[520px] flex items-center">
      {/* Static technical/laboratory background image — no motion */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.24] dark:opacity-[0.16] pointer-events-none"
        style={{ backgroundImage: "var(--hero-bg)" }}
      />

      {/* Soft gradient masks to blend background and ensure text is highly readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/20 dark:from-surface dark:via-surface/90 dark:to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent pointer-events-none" />

      {/* Fine-line illustrations for background details */}
      <ArchitecturalIllustration className="pointer-events-none absolute inset-y-0 right-0 h-full w-[55%] text-navy opacity-[0.07] dark:opacity-[0.05]" />

      <div className="relative z-10 mx-auto w-full max-w-[1380px] px-6 py-14 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:gap-12 items-center">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl lg:text-[42px]">
              {t.hero.titleLine1}
              <br />
              {t.hero.titlePre}
              <span className="text-orange">{t.hero.titleHighlight}</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-ink-soft">{t.hero.subtitle}</p>

            <div className="mt-8 max-w-2xl">
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

