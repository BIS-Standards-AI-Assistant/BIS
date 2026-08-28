import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import type { StandardDetail } from "@/types/api";

async function getStandard(id: string): Promise<StandardDetail | null> {
  const db = getDb();
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { chunks: { orderBy: (c, { asc }) => [asc(c.createdAt)] } },
  });
  if (!doc) return null;
  return {
    ...doc,
    retrievedAt: doc.retrievedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    chunks: doc.chunks.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  };
}

export default async function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const standard = await getStandard(id);
  if (!standard) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
            <Link href="/" className="hover:text-ink hover:underline">
              Home
            </Link>
            <span aria-hidden="true"> / </span>
            <Link href="/standards" className="hover:text-ink hover:underline">
              Standards
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink-soft">{standard.standardNumber ?? "Standard"}</span>
          </nav>

          <div className="mt-4">
            <Badge tone="neutral">{standard.sourceOrg} standard</Badge>
          </div>
          <p className="mt-4 font-mono text-sm text-navy">
            {standard.standardNumber ?? "Unnumbered reference"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug tracking-tight text-ink">
            {standard.title}
          </h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-faint">Document type</dt>
              <dd className="mt-0.5 text-ink">{standard.documentType.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Version</dt>
              <dd className="mt-0.5 text-ink">{standard.version ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Published</dt>
              <dd className="mt-0.5 text-ink">{standard.publicationDate ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Retrieved</dt>
              <dd className="mt-0.5 text-ink">{new Date(standard.retrievedAt).toLocaleDateString("en-IN")}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href={standard.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-navy hover:underline"
            >
              Open official source document →
            </a>
            <Link href={`/compare?ids=${standard.id}`} className="text-sm font-medium text-ink-soft hover:text-navy">
              Add to comparison →
            </Link>
          </div>

          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Document sections ({standard.chunks.length})
            </h2>
            {standard.chunks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                This document has not been fully ingested into the retrieval index yet — no
                section-level evidence is available for it.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {standard.chunks.map((c) => (
                  <div key={c.id} className="border-l-2 border-navy bg-surface-alt py-3 pl-4 pr-3">
                    <p className="text-xs font-medium text-ink-soft">
                      {[c.section, c.clause ? `clause ${c.clause}` : null, c.page ? `p. ${c.page}` : null]
                        .filter(Boolean)
                        .join(" · ") || "General"}
                    </p>
                    <p className="mt-2 whitespace-pre-line font-mono text-[13px] leading-relaxed text-ink-soft">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
