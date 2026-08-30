import fs from "fs/promises";
import path from "path";

/**
 * Shared loader for the fact-checked certification reference dataset
 * (data/bis-standards-dataset/qco-standards.json — see that directory's
 * README for provenance/correction notes). Used by both
 * src/app/api/v1/certification-schemes/route.ts and the Standard Passport
 * page (src/app/standards/[id]/page.tsx) so there's one definition of
 * "what a certification scheme entry looks like," not two.
 */

interface QcoEntry {
  is_number?: string;
  title?: string;
  category?: string;
  scheme?: string;
  mandatory_qco?: boolean;
  scope_summary?: string;
  key_testing_parameters?: string[];
  certification_route?: string;
  verification_status?: string;
  verification_note?: string;
  source_url?: string;
  source_note?: string;
  retrieved_at?: string;
}

export interface CertificationSchemeItem {
  standardNumber: string;
  title: string;
  category: string | null;
  scheme: string | null;
  mandatoryQco: boolean;
  scopeSummary: string | null;
  certificationRoute: string | null;
  testingParameters: string[];
  verificationStatus: string | null;
  sourceUrl: string | null;
}

function toItem(e: QcoEntry): CertificationSchemeItem | null {
  if (!e.is_number) return null;
  return {
    standardNumber: e.is_number,
    title: e.title ?? e.is_number,
    category: e.category ?? null,
    scheme: e.scheme ?? null,
    mandatoryQco: e.mandatory_qco === true,
    scopeSummary: e.scope_summary ?? null,
    certificationRoute: e.certification_route ?? null,
    testingParameters: e.key_testing_parameters ?? [],
    verificationStatus: e.verification_status ?? null,
    sourceUrl: e.source_url ?? null,
  };
}

export async function loadCertificationSchemes(): Promise<CertificationSchemeItem[]> {
  const filePath = path.join(process.cwd(), "data/bis-standards-dataset/qco-standards.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const entries: QcoEntry[] = JSON.parse(raw);
  return entries.map(toItem).filter((i): i is CertificationSchemeItem => i !== null);
}

/**
 * Finds a scheme entry whose standard number's base IS number matches —
 * e.g. a document with standardNumber "IS 5522:2014" matches a reference
 * entry for "IS 5522:2016" only if the base number (5522) matches AND the
 * edition matches exactly, since a different edition can carry different
 * certification requirements. Returns null rather than guessing across
 * editions.
 */
export async function findCertificationSchemeForStandard(standardNumber: string | null): Promise<CertificationSchemeItem | null> {
  if (!standardNumber) return null;
  const schemes = await loadCertificationSchemes();
  const normalize = (s: string) => s.trim().toLowerCase();
  return schemes.find((s) => normalize(s.standardNumber) === normalize(standardNumber)) ?? null;
}
