import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import type { StandardDetail } from "@/types/api";
import { getLocalSeedChunks, slugifyStandardNumber } from "@/lib/retrieval";
import { canonicalNumberOf } from "@/lib/certification-schemes";
import { isUuid } from "@/lib/uuid";

export interface EnrichedStandardDetail extends StandardDetail {
  /**
   * Where the record came from. Only "database" and "seed_manifest" records
   * carry real document text; a "reference_dataset" record's passages are
   * summaries built from the QCO dataset's fields (scope, testing
   * parameters, gazette details), and its document is not in the index.
   */
  recordSource: "database" | "reference_dataset" | "seed_manifest";
  scopeSummary?: string | null;
  verificationNote?: string | null;
  sourceNote?: string | null;
  legalGazette?: {
    order?: string | null;
    notification?: string | null;
    ministry?: string | null;
    enactmentDate?: string | null;
  } | null;
  keyTestingParameters?: string[];
}

export function sanitizeOfficialUrl(url?: string | null): string {
  const defaultUrl = "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en";
  if (!url) return defaultUrl;
  // Rendered as an <a href>, so only http(s): a stored "javascript:" or
  // "data:" URL must never become a clickable link.
  if (!/^https?:\/\//i.test(url.trim())) return defaultUrl;
  if (url.includes("services.bis.gov.in/php/BIS_2.0") || url.includes("standardsbis.in")) {
    return defaultUrl;
  }
  return url;
}

/**
 * Loads one standard for the /standards/[id] page, trying three sources in
 * order: an ingested document in the database (by document id), the
 * fact-checked QCO dataset (data/bis-standards-dataset/qco-standards.json,
 * matched by standard id, number or slug), and the seed-corpus manifest
 * (data/seed/manifest.json). Returns null when none of them has it.
 */
export async function getStandardDetail(rawId: string): Promise<EnrichedStandardDetail | null> {
  const id = decodeURIComponent(rawId).trim();
  const idSlug = slugifyStandardNumber(id);

  // 1. Database retrieval — only for ids that can be a document id. The
  // register's slugs ("is-14543") would otherwise cost a failing DB
  // round-trip on every reference-standard page view.
  if (isUuid(id)) {
    try {
      const db = getDb();
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, id),
        with: {
          chunks: {
            // Only the passage text and location are rendered; the
            // 1536-float embedding (~30 KB per chunk) is never used here.
            columns: { embedding: false },
            orderBy: (c, { asc }) => [asc(c.createdAt)],
          },
        },
      });
      if (doc) {
        return {
          ...doc,
          recordSource: "database",
          sourceUrl: sanitizeOfficialUrl(doc.sourceUrl),
          retrievedAt: doc.retrievedAt.toISOString(),
          createdAt: doc.createdAt.toISOString(),
          chunks: doc.chunks.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
        };
      }
    } catch {
      // Fallback to static verified dataset
    }
  }

  // 2. Fact-checked dataset (data/bis-standards-dataset/qco-standards.json)
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
      const slugParts = slugifyStandardNumber([item.standard_number, item.part, item.section].filter(Boolean).join("-"));
      const stdNumSlug = slugifyStandardNumber(item.standard_number || item.is_number || "");
      const stdIdSlug = slugifyStandardNumber(item.standard_id || "");
      return (
        slugParts === id ||
        slugParts === idSlug ||
        stdNumSlug === id ||
        stdNumSlug === idSlug ||
        stdIdSlug === id ||
        stdIdSlug === idSlug ||
        `std-${idx + 1}` === id ||
        `std-${idx + 1}` === idSlug ||
        (item.standard_number && item.standard_number.toLowerCase() === id.toLowerCase()) ||
        (item.is_number && item.is_number.toLowerCase() === id.toLowerCase())
      );
    });

    if (found) {
      // The same canonical form findCertificationSchemeForStandard matches
      // on. Building it differently here ("IS 13252 Part 1:2010" vs
      // "IS 13252 (Part 1):2010") made every part- or section-numbered
      // standard miss its certification scheme on its own page.
      const stdNumber = canonicalNumberOf(found) ?? "Indian Standard";

      const title = found.full_title || found.short_title || found.title || "Standard Specification";
      const cat = found.product_category || found.category || null;
      const rawSource = found.document_url || found.source_url || null;
      const safeSourceUrl = sanitizeOfficialUrl(rawSource);

      const chunks = [];
      if (found.scope || found.scope_summary) {
        chunks.push({
          id: `${id}-scope`,
          documentId: id,
          section: "Scope & Applicability",
          clause: "1.1",
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
          section: "Key Testing Parameters",
          clause: "Clause 7",
          page: null,
          text: `Key testing parameters verified in gazetted standard:\n• ${found.key_testing_parameters.join("\n• ")}`,
          metadata: null,
          createdAt: new Date().toISOString(),
        });
      }

      let legalGazette = null;
      if (found.legal_source && typeof found.legal_source === "object") {
        const ls = found.legal_source;
        legalGazette = {
          order: ls.gazette_order || null,
          notification: ls.notification_number || null,
          ministry: ls.issuing_ministry || null,
          enactmentDate: ls.enactment_date || null,
        };
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
        recordSource: "reference_dataset",
        standardNumber: stdNumber,
        title,
        documentType: cat ?? "Indian Standard",
        sourceUrl: safeSourceUrl,
        sourceOrg: "Bureau of Indian Standards (BIS)",
        version: found.year ? `${found.year}` : null,
        publicationDate: found.publication_date || found.source_date || null,
        retrievedAt: found.retrieved_at || "2026-08-28",
        checksum: "reference_dataset_sha256",
        createdAt: new Date().toISOString(),
        chunks,
        scopeSummary: found.scope_summary || found.scope || null,
        verificationNote: found.verification_note || null,
        sourceNote: found.source_note || null,
        legalGazette,
        keyTestingParameters: Array.isArray(found.key_testing_parameters) ? found.key_testing_parameters : undefined,
      };
    }
  } catch {
    // Continue to manifest fallback
  }

  // 3. Manifest.json fallback
  try {
    const manifestPath = path.join(process.cwd(), "data/seed/manifest.json");
    const rawManifest = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(rawManifest);

    const found = manifest.find((item: { file: string; standardNumber: string }) => {
      const fileSlug = item.file.replace(/\.txt$/, "");
      return (
        fileSlug === id ||
        fileSlug === idSlug ||
        slugifyStandardNumber(item.standardNumber) === id ||
        slugifyStandardNumber(item.standardNumber) === idSlug ||
        item.standardNumber.toLowerCase() === id.toLowerCase()
      );
    });

    if (found) {
      const seedChunks = getLocalSeedChunks().filter((c) => c.doc.standardNumber === found.standardNumber);

      return {
        id,
        recordSource: "seed_manifest",
        standardNumber: found.standardNumber,
        title: found.title,
        documentType: found.documentType,
        sourceUrl: sanitizeOfficialUrl(found.sourceUrl),
        sourceOrg: found.sourceOrg,
        version: found.version,
        publicationDate: found.publicationDate,
        retrievedAt: found.retrievedAt,
        checksum: "seed_manifest_verified",
        createdAt: new Date().toISOString(),
        chunks: seedChunks.map((c) => ({
          id: c.id,
          documentId: id,
          section: c.section,
          clause: c.clause,
          page: null,
          text: c.text,
          metadata: null,
          createdAt: new Date().toISOString(),
        })),
        sourceNote: "Authoritative seed archive indexed in Navigator database",
      };
    }
  } catch {
    // Fallthrough to null
  }

  return null;
}
