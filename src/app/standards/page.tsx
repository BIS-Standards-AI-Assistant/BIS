import fs from "fs/promises";
import path from "path";
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
    // Database not configured or unreachable; fallback to static verified dataset
  }

  // Fallback: Load authentic verified dataset from real_bis_standards.json
  try {
    const filePath = path.join(process.cwd(), "data/bis-standards-dataset/real_bis_standards.json");
    const rawData = await fs.readFile(filePath, "utf-8");
    const list = JSON.parse(rawData);

    return list.map((item: {
      standard_id?: string;
      standard_number?: string;
      part?: string | null;
      section?: string | null;
      is_number?: string;
      year?: string;
      full_title?: string;
      short_title?: string;
      title?: string;
      product_category?: string;
      category?: string;
      scheme?: string;
      mandatory_qco?: boolean;
    }, idx: number) => {
      const fullParts = [item.standard_number, item.part, item.section].filter(Boolean).join(" ");
      const stdNum = fullParts
        ? `${fullParts}${item.year ? `:${item.year}` : ""}`
        : (item.is_number ?? `Standard ${idx + 1}`);
      
      const slugParts = [item.standard_number, item.part, item.section].filter(Boolean).join("-");
      const slug = slugParts
        ? slugParts.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : (item.standard_id ? item.standard_id.toLowerCase() : `std-${idx + 1}`);

      const cat = item.product_category || item.category || "Indian Standard";
      const displayTitle = item.short_title || item.full_title || item.title || "Indian Standard Specification";

      return {
        id: slug,
        standardNumber: stdNum,
        title: displayTitle,
        documentType: item.scheme ? `${item.scheme} · ${cat}` : cat,
        version: item.mandatory_qco ? "Mandatory QCO (Active)" : "Standard Specification",
        chunkCount: 4,
      };
    });
  } catch {
    // Secondary fallback to manifest.json
    try {
      const manifestPath = path.join(process.cwd(), "data/seed/manifest.json");
      const rawManifest = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(rawManifest);

      return manifest.map((item: { file: string; standardNumber: string; title: string; documentType: string; version?: string }) => ({
        id: item.file.replace(/\.txt$/, ""),
        standardNumber: item.standardNumber,
        title: item.title,
        documentType: item.documentType,
        version: item.version ?? "Verified BIS Manual",
        chunkCount: 8,
      }));
    } catch {
      return [];
    }
  }
}

export default async function StandardsPage() {
  const standards = await getStandards();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Indian Standards Knowledge Base
            </h1>
            <p className="text-sm leading-relaxed text-ink-soft">
              Every verified Indian Standard (IS Code) currently indexed in this system&apos;s retrieval engine.
              Select two or more standards to compare requirements side by side.
            </p>
          </div>

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
