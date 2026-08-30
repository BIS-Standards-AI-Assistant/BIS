import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ExternalLinkIcon } from "@/components/ui/icons";

/**
 * Verified against the live BIS site on 2026-08-31. See
 * src/lib/official-links.ts for the wider registry and the checker script.
 */
const OFFICIAL_CHANNELS = [
  {
    label: "Enquiry related to BIS activities",
    href: "https://www.bis.gov.in/directory/enquiry/?lang=en",
    note: "Who to contact for standards, certification, testing, or training questions.",
  },
  {
    label: "Online complaint registration",
    href: "https://www.bis.gov.in/consumer-overview/online-complaint-registration/?lang=en",
    note: "File a complaint about a product carrying the ISI mark or a hallmark.",
  },
  {
    label: "BIS directory",
    href: "https://www.bis.gov.in/directory/directory/?lang=en",
    note: "Head office, regional, branch, and laboratory contacts.",
  },
  {
    label: "Regional offices",
    href: "https://www.bis.gov.in/directory/regional-offices/?lang=en",
    note: "Addresses and contacts for BIS regional offices.",
  },
];

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <ContactBody />
      </main>
      <Footer />
    </div>
  );
}

function ContactBody() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-[12.5px] text-ink-faint">
        <Link href="/" className="hover:text-blue hover:underline">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Contact Us</span>
      </nav>

      <h1 className="text-[28px] font-semibold tracking-tight text-navy">Contact Us</h1>
      <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
        Bureau of Indian Standards head office — published public contact information.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="text-[13.5px] font-semibold text-navy">Head Office</h2>
          <address className="mt-2 text-[13.5px] not-italic leading-relaxed text-ink-soft">
            Bureau of Indian Standards
            <br />
            Manak Bhawan, 9 Bahadur Shah Zafar Marg
            <br />
            New Delhi – 110002, India
          </address>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="text-[13.5px] font-semibold text-navy">Ministry</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
            Ministry of Consumer Affairs, Food &amp; Public Distribution
            <br />
            Government of India
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface-alt px-6 py-5">
        <p className="text-[13.5px] font-semibold text-navy">This prototype doesn&apos;t have a helpdesk or contact form</p>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-soft">
          For official enquiries, complaints, or grievances, use BIS&apos;s own channels below. What this
          system offers is standards search and grounded, cited answers about the standards it has ingested.
        </p>
      </div>

      <section className="mt-8" aria-labelledby="official-contact">
        <h2 id="official-contact" className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
          Official BIS channels
        </h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
          {OFFICIAL_CHANNELS.map((c) => (
            <li key={c.href}>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-alt"
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-blue">{c.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{c.note}</span>
                </span>
                <ExternalLinkIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="mt-6 inline-block text-[13.5px] font-medium text-blue hover:underline"
      >
        Ask about a Standard &rarr;
      </Link>
    </div>
  );
}
