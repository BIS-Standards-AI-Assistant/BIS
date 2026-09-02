"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChevronRightIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { OfficialLink } from "@/lib/official-links";
import type { PageFacts } from "@/lib/page-facts";

interface Crumb {
  label: string;
  href: string;
}

interface PlaceholderPageProps {
  crumbs: Crumb[];
  title: string;
  description: string;
  /**
   * Verified official BIS destinations for this topic, from
   * src/lib/official-links.ts. Empty means no official page genuinely answers
   * it — the page then says so instead of linking somewhere unrelated.
   */
  links?: readonly OfficialLink[];
  /**
   * Sourced factual content from src/lib/page-facts.ts, so the page answers
   * its own heading rather than only pointing elsewhere. Every point is
   * attributed to the BIS page it was read from, with the date it was read.
   */
  facts?: PageFacts | null;
}

export function PlaceholderPage({ crumbs, title, description, links = [], facts = null }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <PlaceholderPageBody crumbs={crumbs} title={title} description={description} links={links} facts={facts} />
      </main>
      <Footer />
    </div>
  );
}

function PlaceholderPageBody({ crumbs, title, description, links = [], facts = null }: PlaceholderPageProps) {
  const { t } = useLanguage();
  const hasLinks = links.length > 0;

  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
        <Link href="/" className="hover:text-blue hover:underline">
          {t.placeholder.breadcrumbHome}
        </Link>
        {crumbs.map((c) => (
          <span key={c.href} className="flex items-center gap-1.5">
            <ChevronRightIcon className="h-3 w-3" />
            <Link href={c.href} className="hover:text-blue hover:underline">
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      <h1 className="text-[28px] font-semibold tracking-tight text-navy">{title}</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">{description}</p>

      {facts && (
        <section className="mt-8" aria-labelledby="key-facts">
          <h2 id="key-facts" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
            What BIS states on this
          </h2>
          <ul className="mt-3 space-y-2.5 rounded-xl border border-border bg-surface-raised px-6 py-5">
            {facts.points.map((point) => (
              <li key={point} className="relative pl-4 text-[14px] leading-relaxed text-ink">
                <span aria-hidden="true" className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-blue" />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
            Summarised from{" "}
            <a
              href={facts.source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue hover:underline"
            >
              {facts.source.label}
              <span className="sr-only"> {t.placeholder.opensNewTab}</span>
            </a>{" "}
            (bis.gov.in), read on {facts.retrieved}. Check the source for anything you intend to rely on —
            fee amounts, product lists and dates change.
          </p>
        </section>
      )}

      {!facts && (
        <div className="mt-8 rounded-xl border border-border bg-surface-alt px-6 py-5">
          <p className="text-[13.5px] font-semibold text-navy">
            {hasLinks ? t.placeholder.headingWithSources : t.placeholder.headingWithoutSources}
          </p>
          <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-soft">
            {hasLinks ? t.placeholder.bodyWithSources : t.placeholder.bodyWithoutSources}
          </p>
        </div>
      )}

      {hasLinks && (
        <section className="mt-8" aria-labelledby="official-sources">
          <h2 id="official-sources" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
            {t.placeholder.sourcesHeading}
          </h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-alt"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-blue">
                      {link.label}
                      <span className="sr-only"> {t.placeholder.opensNewTab}</span>
                    </span>
                    {link.note && (
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{link.note}</span>
                    )}
                    <span className="mt-1 block truncate text-[11.5px] text-ink-faint">{hostOf(link.href)}</span>
                  </span>
                  <ExternalLinkIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] text-ink-faint">{t.placeholder.sourcesNote}</p>
        </section>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-[13px] font-semibold text-navy">{t.placeholder.canDoHeading}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[13.5px]">
          <Link href="/standards" className="rounded-md border border-border-strong px-3.5 py-2 font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue">
            {t.placeholder.browseStandards}
          </Link>
          <Link href="/" className="rounded-md border border-border-strong px-3.5 py-2 font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue">
            {t.placeholder.askAbout}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Shown under each link so the destination is visible before clicking. */
function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
