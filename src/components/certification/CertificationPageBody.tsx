"use client";

import Link from "next/link";
import { CertificationDiscovery } from "@/components/certification/CertificationDiscovery";
import { SchemeExplorer } from "@/components/certification/SchemeExplorer";
import { BadgeCheckIcon, FlaskIcon, DocumentIcon, SearchIcon, CompareIcon, ExternalLinkIcon } from "@/components/ui/icons";

const WORKFLOW = [
  { step: "01", title: "Identify your product", href: "#discovery" },
  { step: "02", title: "Find the applicable scheme", href: "#discovery" },
  { step: "03", title: "Check requirements", href: "#discovery" },
  { step: "04", title: "Understand testing", href: "/testing" },
  { step: "05", title: "Proceed to BIS service", href: "#official-services" },
];

const TILES = [
  { icon: SearchIcon, title: "Find a certification scheme", body: "Search by product, sector, or standard.", href: "#discovery" },
  { icon: DocumentIcon, title: "Understand requirements", body: "See requirements associated with a scheme or standard.", href: "#discovery" },
  { icon: FlaskIcon, title: "Find testing requirements", body: "Discover relevant tests and referenced methods.", href: "/testing" },
  { icon: CompareIcon, title: "Check a standard", body: "Find the Indian Standards connected with a certification pathway.", href: "/standards" },
  { icon: BadgeCheckIcon, title: "Understand the process", body: "Step through the certification journey.", href: "#process" },
  { icon: ExternalLinkIcon, title: "Explore BIS services", body: "Find the appropriate official BIS service.", href: "#official-services" },
];

const PROCESS = [
  { title: "Identify applicable requirements", body: "Understand the relevant standard and certification scheme that applies to your product." },
  { title: "Prepare documentation", body: "Documentation requirements shown here come only from evidence verified against BIS sources." },
  { title: "Testing", body: "Applicable testing information is shown when it's supported by the evidence — not assumed." },
  { title: "Application / assessment", body: "The formal application and factory/conformity assessment is carried out through BIS's own systems, not BIS Navigator." },
  { title: "Certification", body: "The resulting certification pathway is explained only when the evidence actually establishes it." },
];

const OFFICIAL_SERVICES = [
  { label: "Product Certification (Manakonline)", href: "https://www.manakonline.in" },
  { label: "BIS CARE App — verify a licence or mark", href: "https://www.bis.gov.in/bis-apps/?lang=en" },
  { label: "Products under compulsory certification", href: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en" },
];

export function CertificationPageBody() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="border-b border-border bg-surface-raised px-6 py-2.5 text-[12.5px] text-ink-faint">
        <div className="mx-auto max-w-[1100px]">
          <Link href="/" className="hover:text-blue hover:underline">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Certification</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-border bg-surface-alt px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-blue">BIS Certification</p>
          <h1 className="mt-2 max-w-2xl text-[32px] font-semibold leading-tight tracking-tight text-navy">
            Understand the BIS certification pathway
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Find applicable certification schemes, requirements, testing information, and related Indian Standards —
            using verified BIS information.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#discovery" className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-deep">
              Find a Certification Scheme
            </a>
            <a href="#process" className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium text-ink-soft hover:border-navy hover:text-navy">
              Explore Certification Process
            </a>
          </div>
        </div>
      </section>

      {/* Quick-start workflow */}
      <section className="border-b border-border px-6 py-10">
        <div className="mx-auto max-w-[1100px]">
          <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {WORKFLOW.map((w, i) => (
              <li key={w.step} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-start">
                <span className="font-mono text-[13px] font-semibold text-blue">{w.step}</span>
                <a href={w.href} className="text-[13.5px] font-medium text-ink hover:text-blue hover:underline">
                  {w.title}
                </a>
                {i < WORKFLOW.length - 1 && (
                  <span className="hidden text-ink-faint sm:inline" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What are you looking for */}
      <section className="border-b border-border bg-surface px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-[22px] font-semibold text-navy">What are you looking for?</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map((tile) => (
              <a
                key={tile.title}
                href={tile.href}
                className="rounded-lg border border-border bg-surface-raised p-5 transition-colors hover:border-blue"
              >
                <tile.icon className="h-5 w-5 text-blue" />
                <h3 className="mt-2.5 text-[14.5px] font-semibold text-ink">{tile.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{tile.body}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Discovery */}
      <section id="discovery" className="border-b border-border px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-[22px] font-semibold text-navy">Find a certification scheme</h2>
          <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
            Describe your product. BIS Navigator&apos;s retrieval engine — not a generic AI — checks the applicable
            standard and any evidence for its certification route.
          </p>
          <div className="mt-6">
            <CertificationDiscovery />
          </div>
        </div>
      </section>

      {/* Scheme explorer */}
      <section className="border-b border-border bg-surface-alt px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-[22px] font-semibold text-navy">Certification schemes</h2>
          <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
            Browse a fact-checked reference set of BIS Quality Control Order standards and their certification
            routes.
          </p>
          <div className="mt-6">
            <SchemeExplorer />
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="border-b border-border px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-[22px] font-semibold text-navy">Certification process</h2>
          <ol className="mt-6 space-y-5">
            {PROCESS.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt font-mono text-[13px] font-semibold text-navy">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[14.5px] font-semibold text-ink">{p.title}</h3>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Official services boundary */}
      <section id="official-services" className="px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-lg border border-border bg-surface-alt p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Official BIS service</p>
            <h2 className="mt-1.5 text-[17px] font-semibold text-navy">
              Continue to the official BIS service to apply, pay, or check status
            </h2>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
              BIS Navigator organizes information — it does not process applications, payments, or issue
              certificates. Those actions happen only on BIS&apos;s own official systems.
            </p>
            <ul className="mt-4 space-y-2">
              {OFFICIAL_SERVICES.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-navy hover:underline"
                  >
                    {s.label} <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
