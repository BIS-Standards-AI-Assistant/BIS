import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { ExternalLinkIcon, FlaskIcon, SearchIcon } from "@/components/ui/icons";
import { getOfficialLinks } from "@/lib/official-links";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Testing | BIS Navigator",
  description:
    "Find BIS testing information, test methods, recognized laboratories, and testing requirements from ingested Indian Standards.",
};

// Sourced from the verified-link registry so these can never drift back into
// dead URLs. The previous hardcoded /testing/* links were soft 404s — bis.gov.in
// has no /testing/ section; the real pages live under /laboratorys/.
const OFFICIAL_TESTING_LINKS = getOfficialLinks("testing", "").map((l) => ({
  label: l.label,
  description: l.note ?? "",
  href: l.href,
}));

const WHAT_YOU_CAN_DO = [
  {
    icon: SearchIcon,
    title: "Search for testing information",
    body: "Use BIS Navigator's document search to find test methods, parameters, and references in ingested Indian Standards.",
    href: "/search",
    cta: "Search documents →",
    internal: true,
  },
  {
    icon: FlaskIcon,
    title: "Ask about testing for a product",
    body: "Describe a product or standard on the home page to find what testing information exists in the verified BIS knowledge base.",
    href: "/",
    cta: "Ask a question →",
    internal: true,
  },
  {
    icon: ExternalLinkIcon,
    title: "Find official BIS laboratories",
    body: "Find BIS-recognized laboratories for product testing via the official BIS portal.",
    href: "https://www.bis.gov.in/laboratorys/testing-overview/?lang=en",
    cta: "Visit BIS Testing →",
    internal: false,
  },
];

export default function TestingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="border-b border-border bg-surface-raised px-6 py-2.5 text-[12.5px] text-ink-faint">
          <div className="mx-auto max-w-[1100px]">
            <Link href="/" className="hover:text-blue hover:underline">Home</Link>
            <span aria-hidden="true"> / </span>
            <span>Testing</span>
          </div>
        </nav>

        {/* Hero */}
        <section className="border-b border-border bg-surface-alt px-6 py-14">
          <div className="mx-auto max-w-[1100px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-blue">BIS Testing</p>
            <h1 className="mt-2 max-w-2xl text-[32px] font-semibold leading-tight tracking-tight text-navy">
              Find BIS testing information
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Discover test methods, testing parameters, and recognized laboratories — using verified BIS information from ingested standards and official sources.
            </p>
          </div>
        </section>

        {/* What you can do */}
        <section className="border-b border-border px-6 py-14">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-[22px] font-semibold text-navy">What you can do</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {WHAT_YOU_CAN_DO.map((item) =>
                item.internal ? (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="rounded-lg border border-border bg-surface-raised p-5 transition-colors hover:border-blue"
                  >
                    <item.icon className="h-5 w-5 text-blue" />
                    <h3 className="mt-2.5 text-[14.5px] font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                    <p className="mt-3 text-[12.5px] font-medium text-blue">{item.cta}</p>
                  </Link>
                ) : (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border bg-surface-raised p-5 transition-colors hover:border-blue"
                  >
                    <item.icon className="h-5 w-5 text-blue" />
                    <h3 className="mt-2.5 text-[14.5px] font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                    <p className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-blue">
                      {item.cta} <ExternalLinkIcon className="h-3 w-3" />
                    </p>
                  </a>
                )
              )}
            </div>
          </div>
        </section>

        {/* Knowledge base note */}
        <section className="border-b border-border bg-surface-alt px-6 py-10">
          <div className="mx-auto max-w-[1100px] rounded-lg border border-border bg-surface-raised p-6">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">About testing information in BIS Navigator</p>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
              BIS Navigator surfaces testing information that exists in its ingested knowledge base — currently covering{" "}
              <Link href="/standards" className="font-medium text-navy hover:underline">
                22+ verified BIS standards
              </Link>{" "}
              with key testing parameters. Testing information is only shown when it comes from verified evidence. If a
              standard has not been ingested, BIS Navigator will not invent testing details.
            </p>
            <p className="mt-3 text-[13px] text-ink-faint">
              For comprehensive laboratory search, recognized lab directories, and official testing services, use the
              official BIS portal links below.
            </p>
          </div>
        </section>

        {/* Official BIS testing services */}
        <section className="px-6 py-14">
          <div className="mx-auto max-w-[1100px]">
            <div className="rounded-lg border border-border bg-surface-alt p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Official BIS service</p>
              <h2 className="mt-1.5 text-[17px] font-semibold text-navy">
                Official BIS testing portals and laboratory information
              </h2>
              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
                BIS Navigator organizes information — it does not operate laboratories or schedule testing. Those
                services are provided through BIS&apos;s own official portals.
              </p>
              <ul className="mt-4 space-y-3">
                {OFFICIAL_TESTING_LINKS.map((s) => (
                  <li key={s.href} className="flex flex-col gap-0.5">
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-navy hover:underline"
                    >
                      {s.label} <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-[12.5px] text-ink-faint">{s.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
