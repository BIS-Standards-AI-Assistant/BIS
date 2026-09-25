"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log to console for server-side correlation via digest
    console.error("[app/error]", error.digest ?? error.message);
  }, [error]);

  const isDbError =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("neon") ||
    error.message?.toLowerCase().includes("connect");

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          {/* Status illustration */}
          <p className="text-[80px] font-bold leading-none tracking-tighter text-navy opacity-10 select-none">
            500
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {isDbError
              ? "The knowledge base is temporarily unavailable. Static standards data may still be accessible."
              : "An unexpected error occurred. Our team has been notified."}
          </p>

          {/* Digest for support — only shown in production */}
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-ink-faint">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy"
            >
              Go to AI Search
            </Link>
          </div>

          <p className="mt-8 text-xs text-ink-faint">
            You can also{" "}
            <Link href="/standards" className="text-navy hover:underline">
              browse the standards list
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="text-navy hover:underline">
              contact BIS
            </Link>{" "}
            directly.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
