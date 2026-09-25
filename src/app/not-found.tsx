import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Page Not Found | BIS Standards Navigator",
  description: "The page you were looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          {/* Status code */}
          <p className="text-[80px] font-bold leading-none tracking-tighter text-navy opacity-10 select-none">
            404
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The page you were looking for doesn&apos;t exist or may have moved.
            If you arrived here from a saved link, the URL may be outdated.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              Go to AI Search
            </Link>
            <Link
              href="/standards"
              className="inline-flex items-center rounded-lg border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy"
            >
              Browse Standards
            </Link>
          </div>

          <p className="mt-8 text-xs text-ink-faint">
            Looking for a specific standard?{" "}
            <Link href="/search" className="text-navy hover:underline">
              Search the document corpus
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
