import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChevronRightIcon, ExternalLinkIcon } from "@/components/ui/icons";

interface Crumb {
  label: string;
  href: string;
}

interface PlaceholderPageProps {
  crumbs: Crumb[];
  title: string;
  description: string;
  portalHref?: string;
  portalLabel?: string;
}

export function PlaceholderPage({ crumbs, title, description, portalHref, portalLabel }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <PlaceholderPageBody
          crumbs={crumbs}
          title={title}
          description={description}
          portalHref={portalHref}
          portalLabel={portalLabel}
        />
      </main>
      <Footer />
    </div>
  );
}

function PlaceholderPageBody({ crumbs, title, description, portalHref, portalLabel }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
        <Link href="/" className="hover:text-blue hover:underline">
          Home
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

      <div className="mt-8 rounded-xl border border-border bg-surface-alt px-6 py-5">
        <p className="text-[13.5px] font-semibold text-navy">Not yet available in this system</p>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-soft">
          This section is part of the BIS information architecture but isn&apos;t populated with
          real content here yet. We&apos;d rather show you an honest placeholder than invented details.
        </p>
        {portalHref && (
          <a
            href={portalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep"
          >
            {portalLabel ?? "Use on BIS Portal"}
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-[13.5px]">
        <Link href="/standards" className="rounded-md border border-border-strong px-3.5 py-2 font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue">
          Browse Standards
        </Link>
        <Link href="/" className="rounded-md border border-border-strong px-3.5 py-2 font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue">
          Ask about a Standard
        </Link>
      </div>
    </div>
  );
}
