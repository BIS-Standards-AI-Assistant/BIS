import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardsListClient, type StandardSummary } from "@/components/standards/StandardsListClient";
import { getDb } from "@/db";

// This page has no dynamic route segment, so Next.js would otherwise try to
// statically prerender it at build time — which means it would need a live
// database connection during `next build`, breaking CI (and any build
// environment without DATABASE_URL). The list of ingested standards changes
// as documents are ingested, so it should be rendered per-request anyway.
export const dynamic = "force-dynamic";

async function getStandards(): Promise<StandardSummary[]> {
  const db = getDb();
  const docs = await db.query.documents.findMany({
    with: { chunks: { columns: { id: true } } },
    orderBy: (d, { asc }) => [asc(d.standardNumber)],
  });
  return docs.map((d) => ({
    id: d.id,
    standardNumber: d.standardNumber,
    title: d.title,
    documentType: d.documentType,
    version: d.version,
    chunkCount: d.chunks.length,
  }));
}

export default async function StandardsPage() {
  const standards = await getStandards();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Standards</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Every Indian Standard currently in this system&apos;s knowledge base. Select two or
            more to compare them side by side.
          </p>

          <div className="mt-8">
            {standards.length === 0 ? (
              <p className="border border-dashed border-border-strong bg-surface-alt p-6 text-center text-sm text-ink-soft">
                No standards have been ingested into the knowledge base yet.
              </p>
            ) : (
              <StandardsListClient standards={standards} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
