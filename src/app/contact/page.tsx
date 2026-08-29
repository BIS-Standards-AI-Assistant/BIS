import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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
        <p className="text-[13.5px] font-semibold text-navy">This prototype doesn&apos;t yet have a live helpdesk or contact form</p>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-soft">
          For official enquiries, complaints, or grievances, use BIS&apos;s official channels
          directly rather than this system. What this system does offer is standards search and
          grounded, cited answers about the standards it has ingested.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-[13.5px] font-medium text-blue hover:underline"
        >
          Ask about a Standard →
        </Link>
      </div>
    </div>
  );
}
