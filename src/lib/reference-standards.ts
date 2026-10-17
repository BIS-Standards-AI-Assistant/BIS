import fs from "fs/promises";
import path from "path";
import type { StandardSummary } from "@/components/standards/StandardsListClient";
import { canonicalNumberOf } from "@/lib/certification-schemes";

interface QcoListEntry {
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
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * The fact-checked QCO dataset (data/bis-standards-dataset/qco-standards.json)
 * as list rows for the Standards Register and the Compare picker, used when
 * the database has no ingested documents. Each row's `id` is the slug that
 * /standards/[id] resolves back to the same record.
 *
 * Throws if the dataset cannot be read, so each caller keeps its own
 * fallback.
 */
export async function listReferenceStandards(): Promise<StandardSummary[]> {
  const filePath = path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json");
  const list: QcoListEntry[] = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const seenSlugs = new Set<string>();

  return list.map((item, idx) => {
    const slugParts = [item.standard_number, item.part, item.section].filter(Boolean).join("-");
    let slug = slugParts
      ? slugify(slugParts)
      : (item.standard_id ? slugify(item.standard_id) : `std-${idx + 1}`);
    // Two editions of the same part share a slug; the later one is linked by
    // its standard id instead, which the detail page also resolves.
    if (seenSlugs.has(slug)) slug = item.standard_id ? slugify(item.standard_id) : `${slug}-${idx + 1}`;
    seenSlugs.add(slug);

    const category = item.product_category || item.category || "Indian Standard";
    return {
      id: slug,
      // The same canonical form the detail page and the certification-scheme
      // lookup use, e.g. "IS 13252 (Part 1):2010".
      standardNumber: canonicalNumberOf(item) ?? item.standard_id ?? `Standard ${idx + 1}`,
      title: item.short_title || item.full_title || item.title || "Indian Standard Specification",
      documentType: item.scheme ? `${item.scheme} · ${category}` : category,
      version: item.mandatory_qco ? "Mandatory QCO (Active)" : "Standard Specification",
      // These records are not documents in the retrieval index; the list
      // shows "not yet ingested" for 0 rather than an invented count.
      chunkCount: 0,
    };
  });
}
