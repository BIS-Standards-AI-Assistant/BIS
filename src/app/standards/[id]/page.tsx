import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EvidenceExcerpt } from "@/components/evidence/EvidenceExcerpt";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import type { StandardDetail } from "@/types/api";
import { findCertificationSchemeForStandard, type CertificationSchemeItem } from "@/lib/certification-schemes";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification-status";
import { TESTING_KEYWORDS } from "@/lib/coverage-analysis";
import { ExternalLinkIcon, SearchIcon, CompareIcon, ChevronRightIcon } from "@/components/ui/icons";

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
      const cat = found.product_category || found.category || null;

      const rawSource = found.document_url || found.source_url || null;
      const safeSourceUrl = sanitizeOfficialUrl(rawSource);

      const chunks = [];
      if (found.scope || found.scope_summary) {
        chunks.push({
          id: `${id}-scope`,
          documentId: id,
          section: "Scope",
          clause: null,
          page: null,
          text: found.scope || found.scope_summary,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      if (found.key_testing_parameters && Array.isArray(found.key_testing_parameters) && found.key_testing_parameters.length > 0) {
        chunks.push({
          id: `${id}-testing`,
          documentId: id,
          section: "Testing",
          clause: null,
          page: null,
          text: `Key testing parameters:\n• ${found.key_testing_parameters.join("\n• ")}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      if (found.legal_source && typeof found.legal_source === "object") {
        const ls = found.legal_source;
        chunks.push({
          id: `${id}-legal`,
          documentId: id,
          section: "Official Gazette Notification",
          clause: null,
          page: null,
          text: [
            ls.gazette_order ? `Gazette Order: ${ls.gazette_order}` : null,
            ls.notification_number ? `Notification No: ${ls.notification_number}` : null,
            ls.issuing_ministry ? `Issuing Authority: ${ls.issuing_ministry}` : null,
            ls.enactment_date ? `Enactment Date: ${ls.enactment_date}` : null,
          ].filter(Boolean).join("\n"),
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        id,
        standardNumber: stdNumber,
        title,
        documentType: cat ?? "Indian Standard",
        sourceUrl: safeSourceUrl,
        sourceOrg: "Bureau of Indian Standards (BIS)",
        version: found.year ? `${found.year}` : null,
        publicationDate: found.publication_date || found.source_date || null,
        retrievedAt: found.retrieved_at || new Date().toISOString(),
        checksum: "reference_dataset",
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
        chunks: [],
      };
    }
  } catch {
    // ignore
  }

  return null;
}

function CertificationRelationship({ scheme }: { scheme: CertificationSchemeItem | null }) {
  if (!scheme) {
    return (
      <p className="text-sm text-ink-faint">
        Certification relationship information is not available in the current BIS Navigator knowledge base for this
        standard.
      </p>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {scheme.scheme && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Certification scheme</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{scheme.scheme}</dd>
        </div>
      )}
      {scheme.certificationRoute && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Certification route</dt>
          <dd className="mt-0.5 text-sm text-ink-soft">{scheme.certificationRoute}</dd>
        </div>
      )}
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Mandatory QCO</dt>
        <dd className="mt-0.5 text-sm text-ink-soft">{scheme.mandatoryQco ? "Yes" : "Not established as mandatory"}</dd>
      </div>
      {scheme.verificationStatus && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Verification</dt>
          <dd className="mt-0.5 text-sm text-ink-soft">{VERIFICATION_STATUS_LABELS[scheme.verificationStatus] ?? scheme.verificationStatus}</dd>
        </div>
      )}
      {scheme.sourceUrl && (
        <div className="sm:col-span-2">
          <a
            href={scheme.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
          >
            View source <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
      <p className="sm:col-span-2 text-[11.5px] text-ink-faint">
        From BIS Navigator&apos;s fact-checked certification reference set — see data/bis-standards-dataset/README.md.
      </p>
    </dl>
  );
}

export default async function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const standard = await getStandard(id);
  if (!standard) notFound();

  const scheme = await findCertificationSchemeForStandard(standard.standardNumber);

  const testingChunks = standard.chunks.filter((c) => TESTING_KEYWORDS.test(`${c.section ?? ""} ${c.text}`));
  const evidenceChunks = standard.chunks.filter((c) => !testingChunks.includes(c));
  const askQuery = encodeURIComponent(`Tell me about ${standard.standardNumber ?? standard.title}`);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
            <Link href="/" className="hover:text-blue hover:underline">
              Home
            </Link>
            <ChevronRightIcon className="h-3 w-3" />
            <Link href="/standards" className="hover:text-blue hover:underline">
              Standards
            </Link>
            <ChevronRightIcon className="h-3 w-3" />
            <span>{standard.standardNumber ?? "Standard"}</span>
          </nav>

          {/* Identity header */}
          <div className="mt-5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-blue">{standard.sourceOrg}</p>
            <p className="mt-1.5 font-mono text-[15px] font-semibold text-navy">
              {standard.standardNumber ?? "Unnumbered reference"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[28px]">
              {standard.title}
            </h1>
          </div>

          {/* Overview — only fields actually present */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-faint">Category</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.documentType ? standard.documentType.replaceAll("_", " ") : "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Edition</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.version || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Published</dt>
              <dd className="mt-0.5 font-medium text-ink">{standard.publicationDate || "Not specified"}</dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <a
              href="#evidence"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-strong px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy sm:w-auto sm:justify-start sm:py-2"
            >
              View evidence
            </a>
            <Link
              href={`/?q=${askQuery}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-navy px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-navy-deep sm:w-auto sm:justify-start sm:py-2"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Ask about this standard
            </Link>
            <Link
              href={`/compare?ids=${standard.id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-strong px-3.5 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy sm:w-auto sm:justify-start sm:py-2"
            >
              <CompareIcon className="h-3.5 w-3.5" />
              Add to comparison
            </Link>
            <a
              href={standard.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-navy hover:underline sm:w-auto sm:justify-start"
            >
              Official BIS source <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Certification relationships */}
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Certification relationships</h2>
            <div className="mt-3">
              <CertificationRelationship scheme={scheme} />
            </div>
          </section>

          {/* Testing */}
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Testing</h2>
            {testingChunks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                Testing information is not available in the current BIS Navigator knowledge base for this standard.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {testingChunks.map((c) => (
                  <EvidenceExcerpt
                    key={c.id}
                    standardNumber={standard.standardNumber}
                    documentTitle={standard.title}
                    section={c.section}
                    clause={c.clause}
                    page={c.page}
                    text={c.text}
                    sourceUrl={standard.sourceUrl}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Related standards — honest: no relationship data exists yet */}
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Related standards</h2>
            <p className="mt-3 text-sm text-ink-faint">
              BIS Navigator does not yet have verified standard-to-standard relationship data (referenced by,
              supersedes, amended by, etc.) for this standard.
            </p>
          </section>

          {/* Evidence */}
          <section id="evidence" className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Evidence {evidenceChunks.length > 0 ? `(${evidenceChunks.length})` : ""}
            </h2>
            {evidenceChunks.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                This document has not been fully ingested into the retrieval index yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {evidenceChunks.map((c) => (
                  <EvidenceExcerpt
                    key={c.id}
                    standardNumber={standard.standardNumber}
                    documentTitle={standard.title}
                    section={c.section}
                    clause={c.clause}
                    page={c.page}
                    text={c.text}
                    sourceUrl={standard.sourceUrl}
                  />
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
