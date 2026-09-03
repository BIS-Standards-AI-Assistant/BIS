"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChevronRightIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { pickVariant, POLICY_LANG_NAMES, type PolicyInline, type PolicyLang, type PolicyPage, type PolicyVariant } from "@/lib/policy-pages";

/**
 * Renders one of the three BIS website-policy pages (Privacy Policy,
 * Terms & Conditions, Accessibility Statement) inside this app's shell.
 *
 * The text is BIS's, reproduced verbatim from bis.gov.in by
 * scripts/scrape-bis-policy-pages.ts — nothing on this page is written or
 * summarised here. That is why every page states where the text came
 * from, when it was read, and what BIS's own "last updated" line says: the
 * reader has to be able to tell official text from this app's own words,
 * and to go check the original.
 */
export function PolicyPageView({ page }: { page: PolicyPage }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <PolicyPageBody page={page} />
      </main>
      <Footer />
    </div>
  );
}

function PolicyPageBody({ page }: { page: PolicyPage }) {
  const { t, lang } = useLanguage();
  const { variant, isFallback, availableLangs } = pickVariant(page, lang);

  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
        <Link href="/" className="hover:text-blue hover:underline">
          {t.placeholder.breadcrumbHome}
        </Link>
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3 w-3" />
          <span className="text-ink-soft">{variant.title}</span>
        </span>
      </nav>

      <h1 className="text-[28px] font-semibold tracking-tight text-navy" lang={variant.lang}>
        {variant.title}
      </h1>

      <Provenance
        variant={variant}
        retrieved={page.retrieved}
        isFallback={isFallback}
        availableLangs={availableLangs}
        opensNewTab={t.placeholder.opensNewTab}
      />

      <div className="mt-8" lang={variant.lang}>
        <ProseBlocks variant={variant} />
      </div>

      {variant.relatedLinks.length > 0 && (
        <section className="mt-10 border-t border-border pt-6" aria-labelledby="related-policies">
          <h2 id="related-policies" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
            Other BIS website policies
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
            {variant.relatedLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue hover:underline"
                >
                  {link.label}
                  <span className="sr-only"> {t.placeholder.opensNewTab}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] text-ink-faint">
            These are not reproduced here and open on bis.gov.in.
          </p>
        </section>
      )}
    </div>
  );
}

/**
 * Says plainly whose text this is. Placed directly under the heading
 * rather than in fine print at the bottom, because a reader arriving on
 * "Privacy Policy" needs to know before reading it that this is BIS's
 * published policy, mirrored here, and where the authoritative copy lives.
 */
function Provenance({
  variant,
  retrieved,
  isFallback,
  availableLangs,
  opensNewTab,
}: {
  variant: PolicyVariant;
  retrieved: string;
  isFallback: boolean;
  availableLangs: PolicyLang[];
  opensNewTab: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-alt px-5 py-4">
      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        Published by the Bureau of Indian Standards and reproduced here word for word from{" "}
        <a
          href={variant.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue hover:underline"
        >
          bis.gov.in
          <span className="sr-only"> {opensNewTab}</span>
        </a>
        , read on {retrieved}. The page on bis.gov.in is the authoritative copy.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-faint">
        <span>
          Last updated on the source:{" "}
          {variant.lastUpdatedOnSource ?? <span className="italic">not stated on the BIS page</span>}
        </span>
        {isFallback && <span>BIS publishes this page in {languageList(availableLangs)} only.</span>}
      </p>
    </div>
  );
}

/** "English", or "English and Hindi" — for the fallback note above. */
function languageList(langs: PolicyLang[]): string {
  const names = langs.map((l) => POLICY_LANG_NAMES[l]);
  if (names.length <= 1) return names[0] ?? POLICY_LANG_NAMES.en;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function ProseBlocks({ variant }: { variant: PolicyVariant }) {
  return (
    <div className="space-y-4">
      {variant.blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} className="pt-3 text-[17px] font-semibold text-navy">
              {block.text}
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-2.5 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="relative pl-4 text-[15px] leading-relaxed text-ink">
                  <span aria-hidden="true" className="absolute left-0 top-[10px] h-1.5 w-1.5 rounded-full bg-blue" />
                  <Runs runs={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-[15px] leading-[1.75] text-ink">
              <Runs runs={block.runs} />
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

function Runs({ runs }: { runs: PolicyInline[] }) {
  return (
    <>
      {runs.map((run, i) =>
        run.href ? (
          <a
            key={i}
            href={run.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue hover:underline"
          >
            {run.text}
            <ExternalLinkIcon aria-hidden="true" className="ml-0.5 inline h-3 w-3 align-baseline" />
          </a>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}
