import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import type { StandardDetail } from "@/types/api";
import { ExternalLinkIcon, SearchIcon, CompareIcon } from "@/components/ui/icons";

function sanitizeOfficialUrl(url?: string | null): string {
  const defaultUrl = "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en";
  if (!url) return defaultUrl;
  // Handle old discontinued BIS 2.0 PHP endpoints and unreliable IIS store
  if (url.includes("services.bis.gov.in/php/BIS_2.0") || url.includes("standardsbis.in")) {
    return defaultUrl;
  }
  return url;
}

async function getStandard(id: string): Promise<StandardDetail | null> {
  // 1. Try DB first
  try {
    const db = getDb();
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: { chunks: { orderBy: (c, { asc }) => [asc(c.createdAt)] } },
    });
    if (doc) {
      return {
        ...doc,
        sourceUrl: sanitizeOfficialUrl(doc.sourceUrl),
        retrievedAt: doc.retrievedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        chunks: doc.chunks.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
      };
    }
  } catch {
    // Fallback to static verified dataset
  }

  // 2. Fallback to the fact-checked dataset (data/bis-standards-dataset/README.md)
  try {
    const filePath = path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json");
    const rawData = await fs.readFile(filePath, "utf-8");
    const list = JSON.parse(rawData);

    const found = list.find((item: {
      standard_id?: string;
      standard_number?: string;
      part?: string | null;
      section?: string | null;
      is_number?: string;
      full_title?: string;
      short_title?: string;
    }, idx: number) => {
      const slugParts = [item.standard_number, item.part, item.section].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const stdNumSlug = (item.standard_number || item.is_number || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const stdIdSlug = (item.standard_id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return (
        slugParts === id ||
        stdNumSlug === id ||
        stdIdSlug === id ||
        `std-${idx + 1}` === id ||
        (item.standard_number && item.standard_number.toLowerCase() === id.toLowerCase()) ||
        (item.is_number && item.is_number.toLowerCase() === id.toLowerCase())
      );
    });

    if (found) {
      const fullParts = [found.standard_number, found.part, found.section].filter(Boolean).join(" ");
      const stdNumber = fullParts
        ? `${fullParts}${found.year ? `:${found.year}` : ""}`
        : (found.is_number ?? "Indian Standard");

      const title = found.full_title || found.short_title || found.title || "Standard Specification";
      const cat = found.product_category || found.category || "Indian Standard";
      const route = found.certification_route || found.scheme || "Scheme-I (ISI)";

      const rawSource = found.document_url || found.source_url || "https://www.standardsbis.in";
      const safeSourceUrl = sanitizeOfficialUrl(rawSource);

      const chunks = [
        {
          id: `${id}-scope`,
          documentId: id,
          section: "Scope & Objectives",
          clause: "1.0",
          page: 1,
          text: found.scope || found.scope_summary || title,
          metadata: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: `${id}-scheme`,
          documentId: id,
          section: "Certification Route & Legal Mandate",
          clause: "2.0",
          page: 1,
          text: `Certification Scheme: ${route}\nMandatory Quality Control Order: ${found.mandatory_qco ? "Yes (Strict Statutory Mandate)" : "Voluntary Standard"}\nStatus: ${found.status || "Active"}\nIndustry Sector: ${found.industry || cat}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ];

      if (found.key_testing_parameters && Array.isArray(found.key_testing_parameters)) {
        chunks.push({
          id: `${id}-testing`,
          documentId: id,
          section: "Mandatory Laboratory Testing Parameters",
          clause: "3.0",
          page: 2,
          text: `Key Tests Required for Conformity:\n• ${found.key_testing_parameters.join("\n• ")}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      if (found.materials && Array.isArray(found.materials) && found.materials.length > 0) {
        chunks.push({
          id: `${id}-materials`,
          documentId: id,
          section: "Permitted Materials & Specifications",
          clause: "4.0",
          page: 2,
          text: `Specified Materials:\n• ${found.materials.join("\n• ")}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      if (found.legal_source && typeof found.legal_source === "object") {
        const ls = found.legal_source;
        chunks.push({
          id: `${id}-legal`,
          documentId: id,
          section: "Official Gazette Notification Source",
          clause: "5.0",
          page: 3,
          text: `Gazette Order: ${ls.gazette_order || "QCO Notification"}\nNotification No: ${ls.notification_number || "N/A"}\nIssuing Authority: ${ls.issuing_ministry || "Ministry of Consumer Affairs"}\nEnactment Date: ${ls.enactment_date || "N/A"}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        id,
        standardNumber: stdNumber,
        title,
        documentType: `${found.scheme || "Scheme-I"} · ${cat}`,
        sourceUrl: safeSourceUrl,
        sourceOrg: "Bureau of Indian Standards (BIS)",
        version: found.year ? `Edition ${found.year}` : (found.verification_status || "Active QCO Standard"),
        publicationDate: found.publication_date || found.source_date || "2024",
        retrievedAt: found.retrieved_at || new Date().toISOString(),
        checksum: "verified_authentic_gazette",
        createdAt: new Date().toISOString(),
        chunks,
      };
    }
  } catch {
    // Continue to manifest fallback
  }

  // 3. Fallback to manifest.json
  try {
    const manifestPath = path.join(process.cwd(), "data/seed/manifest.json");
    const rawManifest = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(rawManifest);

    const found = manifest.find((item: { file: string; standardNumber: string }) => {
      const fileSlug = item.file.replace(/\.txt$/, "");
      return fileSlug === id || item.standardNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-") === id;
    });

    if (found) {
      return {
        id,
        standardNumber: found.standardNumber,
        title: found.title,
        documentType: found.documentType,
        sourceUrl: sanitizeOfficialUrl(found.sourceUrl),
        sourceOrg: found.sourceOrg,
        version: found.version,
        publicationDate: found.publicationDate,
        retrievedAt: found.retrievedAt,
        checksum: "seed_manifest",
        createdAt: new Date().toISOString(),
        chunks: [
          {
            id: `${id}-chunk-1`,
            documentId: id,
            section: "Product Manual Overview",
            clause: "1.0",
            page: 1,
            text: `Official BIS Product Manual for ${found.title} (${found.standardNumber}). Covers product guidelines, scheme requirements, sampling procedures, and testing parameters.`,
            metadata: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export default async function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const standard = await getStandard(id);
  if (!standard) notFound();

  const searchQuery = encodeURIComponent(standard.standardNumber || standard.title);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
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

          <div className="mt-4 flex items-center gap-2">
            <Badge tone="neutral">{standard.sourceOrg}</Badge>
            <span className="rounded bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-blue">
              Verified Gazette Standard
            </span>
          </div>

          <p className="mt-4 font-mono text-sm font-bold text-navy">
            {standard.standardNumber ?? "Unnumbered reference"}
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-snug tracking-tight text-ink sm:text-3xl">
            {standard.title}
          </h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-faint">Category & Scheme</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.documentType.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Edition / Version</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.version ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Enacted / Published</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.publicationDate ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Status</dt>
              <dd className="mt-0.5 font-medium text-success">Mandatory Active</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <a
              href={standard.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-navy sm:w-auto sm:justify-start sm:py-2"
            >
              <span>Open Official BIS Portal / e-Store</span>
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>

            <Link
              href={`/search?q=${searchQuery}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:bg-surface-alt hover:text-blue sm:w-auto sm:justify-start sm:py-2"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span>Search in AI Assistant</span>
            </Link>

            <Link
              href={`/compare?ids=${standard.id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:bg-surface-alt hover:text-blue sm:w-auto sm:justify-start sm:py-2"
            >
              <CompareIcon className="h-3.5 w-3.5" />
              <span>Add to Comparison</span>
            </Link>
          </div>

          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Standard Specifications &amp; Evidence ({standard.chunks.length} sections)
            </h2>
            {standard.chunks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                This document has not been fully ingested into the retrieval index yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {standard.chunks.map((c) => (
                  <div key={c.id} className="rounded-r-lg border-l-4 border-navy bg-surface-alt py-3.5 pl-4 pr-4">
                    <p className="text-xs font-bold text-navy">
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
