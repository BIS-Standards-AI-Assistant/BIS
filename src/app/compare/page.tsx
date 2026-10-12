import Link from "next/link";
import { inArray } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardsListClient, type StandardSummary } from "@/components/standards/StandardsListClient";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { listReferenceStandards } from "@/lib/reference-standards";
import { getStandardDetail, sanitizeOfficialUrl } from "@/lib/standard-detail";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

interface CompareRow {
  id: string;
  standardNumber: string | null;
  title: string;
  documentType: string;
  version: string | null;
  publicationDate: string | null;
  sourceUrl: string;
  chunkCount: number;
}

async function getAllStandards(): Promise<StandardSummary[]> {
  try {
    const db = getDb();
    const docs = await db.query.documents.findMany({
      with: { chunks: { columns: { id: true } } },
      orderBy: (d, { asc }) => [asc(d.standardNumber)],
    });
    if (docs && docs.length > 0) {
      return docs.map((d) => ({
        id: d.id,
        standardNumber: d.standardNumber,
        title: d.title,
        documentType: d.documentType,
        version: d.version,
        chunkCount: d.chunks.length,
      }));
    }
  } catch {
    // DB unavailable — fall through to static dataset
  }

  // Fallback: static QCO dataset (shared with standards/page.tsx)
  try {
    return await listReferenceStandards();
  } catch {
    return [];
  }
}

/**
 * Rows in the order the reader selected them. Ingested documents (uuid ids)
 * come from the database; reference-dataset standards (the register's
 * slugs, e.g. "is-14543") are not database rows and are resolved the same
 * way their own /standards/[id] page resolves them. Sending those slugs to
 * the uuid column used to make Postgres throw, so comparing any reference
 * standard showed "Knowledge base temporarily unavailable".
 *
 * Returns null only when ingested documents were requested and the
 * database could not be reached.
 */
async function getComparisonRows(ids: string[]): Promise<CompareRow[] | null> {
  const byId = new Map<string, CompareRow>();

  const documentIds = ids.filter(isUuid);
  if (documentIds.length > 0) {
    try {
      const docs = await getDb().query.documents.findMany({
        where: inArray(documents.id, documentIds),
        with: { chunks: { columns: { id: true } } },
      });
      for (const d of docs) {
        byId.set(d.id, {
          id: d.id,
          standardNumber: d.standardNumber,
          title: d.title,
          documentType: d.documentType,
          version: d.version,
          publicationDate: d.publicationDate,
          sourceUrl: sanitizeOfficialUrl(d.sourceUrl),
          chunkCount: d.chunks.length,
        });
      }
    } catch {
      // DB unavailable
      return null;
    }
  }

  for (const id of ids) {
    if (isUuid(id) || byId.has(id)) continue;
    const detail = await getStandardDetail(id);
    if (!detail) continue;
    byId.set(id, {
      id,
      standardNumber: detail.standardNumber,
      title: detail.title,
      documentType: detail.documentType,
      version: detail.version,
      publicationDate: detail.publicationDate,
      sourceUrl: detail.sourceUrl,
      // Reference-dataset passages are field summaries, not indexed sections.
      chunkCount: detail.recordSource === "reference_dataset" ? 0 : detail.chunks.length,
    });
  }

  return ids.flatMap((id) => byId.get(id) ?? []);
}

const FIELDS: { key: keyof CompareRow; label: string }[] = [
  { key: "documentType", label: "Document type" },
  { key: "version", label: "Version" },
  { key: "publicationDate", label: "Published" },
  { key: "chunkCount", label: "Indexed sections" },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length < 2) {
    const standards = await getAllStandards();
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <Header />
        <main id="main-content" className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs">
              <Link href="/" className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
                <span>&larr;</span> Back to Home (AI Search)
              </Link>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Compare standards</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Select two or more standards to see their sourced metadata side by side.
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

  const rows = await getComparisonRows(ids);

  // DB unavailable — show graceful fallback
  if (rows === null) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <Header />
        <main id="main-content" className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs">
              <Link href="/standards" className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
                <span>&larr;</span> Back to Standards
              </Link>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Compare standards</h1>
            <div className="mt-8 rounded-lg border border-border-strong bg-surface-alt p-8 text-center">
              <p className="font-medium text-ink">Knowledge base temporarily unavailable</p>
              <p className="mt-2 text-sm text-ink-soft">
                The comparison tool requires a live database connection. Please try again shortly.
              </p>
              <Link href="/standards" className="mt-4 inline-block text-sm text-navy hover:underline">
                Browse static standards list &rarr;
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs">
            <Link href="/" className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
              <span>&larr;</span> Back to Home (AI Search)
            </Link>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Compare standards</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Structured differences sourced directly from each standard&apos;s indexed metadata —
            nothing here is generated or inferred.
          </p>
          <Link href="/standards" className="mt-3 inline-block text-sm text-navy hover:underline">
            ← Change selection
          </Link>

          <div className="mt-8 overflow-x-auto border border-border">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left">
                  <th className="p-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Standard</th>
                  {rows.map((r) => (
                    <th key={r.id} className="p-3 align-top">
                      <p className="font-mono text-xs text-navy">{r.standardNumber ?? "Unnumbered"}</p>
                      <Link href={`/standards/${encodeURIComponent(r.id)}`} className="mt-0.5 block font-medium text-ink hover:underline">
                        {r.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.key} className="border-b border-border last:border-b-0">
                    <th scope="row" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {f.label}
                    </th>
                    {rows.map((r) => {
                      const value = r[f.key];
                      const hasValue = typeof value === "number" ? true : Boolean(value);
                      return (
                        <td key={r.id} className="p-3 text-ink">
                          {hasValue ? value : <span className="text-ink-faint">Not specified</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Source
                  </th>
                  {rows.map((r) => (
                    <td key={r.id} className="p-3">
                      <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline">
                        Open document →
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
