import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardsListClient, type StandardSummary } from "@/components/standards/StandardsListClient";
import { getDb } from "@/db";
import { documents } from "@/db/schema";

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

  // Fallback: static QCO dataset (same as standards/page.tsx)
  try {
    const filePath = path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json");
    const rawData = await fs.readFile(filePath, "utf-8");
    const list = JSON.parse(rawData);
    const seenSlugs = new Set<string>();
    return list.map((item: {
      standard_id?: string; standard_number?: string; part?: string | null;
      section?: string | null; year?: string; full_title?: string;
      short_title?: string; title?: string; product_category?: string;
      category?: string; scheme?: string; mandatory_qco?: boolean;
    }, idx: number) => {
      const fullParts = [item.standard_number, item.part, item.section].filter(Boolean).join(" ");
      const stdNum = fullParts ? `${fullParts}${item.year ? `:${item.year}` : ""}` : (item.standard_id ?? `Standard ${idx + 1}`);
      const slugParts = [item.standard_number, item.part, item.section].filter(Boolean).join("-");
      let slug = slugParts
        ? slugParts.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : (item.standard_id ? item.standard_id.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `std-${idx + 1}`);
      if (seenSlugs.has(slug)) slug = item.standard_id ? item.standard_id.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `${slug}-${idx + 1}`;
      seenSlugs.add(slug);
      const cat = item.product_category || item.category || "Indian Standard";
      const displayTitle = item.short_title || item.full_title || item.title || "Indian Standard Specification";
      return { id: slug, standardNumber: stdNum, title: displayTitle, documentType: item.scheme ? `${item.scheme} · ${cat}` : cat, version: item.mandatory_qco ? "Mandatory QCO (Active)" : "Standard Specification", chunkCount: 4 };
    });
  } catch {
    return [];
  }
}

async function getComparisonRows(ids: string[]): Promise<CompareRow[] | null> {
  try {
    const db = getDb();
    const docs = await db.query.documents.findMany({
      where: inArray(documents.id, ids),
      with: { chunks: { columns: { id: true } } },
    });
    return docs.map((d) => ({
      id: d.id,
      standardNumber: d.standardNumber,
      title: d.title,
      documentType: d.documentType,
      version: d.version,
      publicationDate: d.publicationDate,
      sourceUrl: d.sourceUrl,
      chunkCount: d.chunks.length,
    }));
  } catch {
    // DB unavailable
    return null;
  }
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
                      <Link href={`/standards/${r.id}`} className="mt-0.5 block font-medium text-ink hover:underline">
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
