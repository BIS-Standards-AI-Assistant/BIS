import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LaboratoriesDirectory } from "@/components/testing/LaboratoriesDirectory";
import { loadLaboratories } from "@/lib/laboratories";

// The dataset is a static, versioned JSON file (see
// scripts/data-laboratories-convert.ts) rather than a live database table,
// but recognition status/validity is time-sensitive enough to render fresh
// per request rather than caching a stale build.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recognised Laboratories | BIS Navigator",
  description:
    "Search BIS-recognised (Group 1) testing laboratories by name, city, state, and current recognition status.",
};

export default async function LaboratorySearchPage() {
  const laboratories = await loadLaboratories();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <nav aria-label="Breadcrumb" className="border-b border-border bg-surface-raised px-6 py-2.5 text-[12.5px] text-ink-faint">
          <div className="mx-auto max-w-[1100px]">
            <Link href="/" className="hover:text-blue hover:underline">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/testing" className="hover:text-blue hover:underline">Testing</Link>
            <span aria-hidden="true"> / </span>
            <span>Laboratory Search</span>
          </div>
        </nav>

        <section className="border-b border-border bg-surface-alt px-6 py-14">
          <div className="mx-auto max-w-[1100px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-blue">BIS Testing</p>
            <h1 className="mt-2 max-w-2xl text-[32px] font-semibold leading-tight tracking-tight text-navy">
              Recognised laboratories
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              {laboratories.length} BIS-recognised (Group 1) testing laboratories, sourced directly from the official
              recognition list. Search by name or location, and filter by current recognition status.
            </p>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-faint">
              This directory does not indicate which standards or product categories a laboratory is equipped to test —
              that scope isn&apos;t part of the source recognition list. Confirm testing scope directly with the
              laboratory, or via the{" "}
              <a
                href="https://www.bis.gov.in/laboratorys/testing-overview/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:underline"
              >
                official BIS testing portal
              </a>
              .
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto max-w-[1100px]">
            <LaboratoriesDirectory laboratories={laboratories} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
