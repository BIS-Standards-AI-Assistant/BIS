import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { standards, qcos } from "@/db/schema";
import { findCertificationSchemeForStandard, type CertificationSchemeItem } from "../certification-schemes";
import type { ToolDefinition, ToolResult } from "./types";

const StandardNumberInput = z.object({ canonicalNumber: z.string().min(1) });

async function findStandardRow(canonicalNumber: string) {
  const db = getDb();
  return db.query.standards.findFirst({ where: eq(standards.canonicalNumber, canonicalNumber) });
}

export interface QcoRecord {
  qcoId: string;
  title: string;
  issuingAuthority: string | null;
  notificationNumber: string | null;
  notificationDate: string | null;
  effectiveDate: string | null;
  applicability: string | null;
  mandatory: boolean;
  verificationStatus: string;
}

export interface MandatoryStatusResult {
  standardNumber: string;
  /**
   * true only when a verified QCO row exists for this standard. Never
   * "false" as a positive claim of voluntariness — rag.md §33: "If no
   * QCO evidence exists, do not say 'Certification is voluntary.'"
   * `hasVerifiedQco: false` means exactly what it says: no QCO evidence
   * was found in this database, not that none exists in reality.
   */
  hasVerifiedQco: boolean;
  qcos: QcoRecord[];
}

const findQcosForStandard = async (standardId: string): Promise<QcoRecord[]> => {
  const db = getDb();
  const rows = await db.query.qcos.findMany({ where: eq(qcos.standardId, standardId) });
  return rows.map((r) => ({
    qcoId: r.id,
    title: r.title,
    issuingAuthority: r.issuingAuthority,
    notificationNumber: r.notificationNumber,
    notificationDate: r.notificationDate,
    effectiveDate: r.effectiveDate,
    applicability: r.applicability,
    mandatory: r.mandatory,
    verificationStatus: r.verificationStatus,
  }));
};

/** rag.md §7 `checkMandatoryStatus()` — see MandatoryStatusResult doc for why this never asserts "voluntary". */
export const checkMandatoryStatusTool: ToolDefinition<z.infer<typeof StandardNumberInput>, MandatoryStatusResult> = {
  name: "checkMandatoryStatus",
  description: "Checks whether a verified Quality Control Order (QCO) exists for a standard, making it mandatory.",
  inputSchema: StandardNumberInput,
  deterministic: true,
  async execute({ canonicalNumber }): Promise<ToolResult<MandatoryStatusResult>> {
    const standardRow = await findStandardRow(canonicalNumber);
    if (!standardRow) return { status: "not_found" };

    const qcoRows = await findQcosForStandard(standardRow.id);
    return {
      status: "ok",
      data: {
        standardNumber: standardRow.canonicalNumber,
        hasVerifiedQco: qcoRows.length > 0,
        qcos: qcoRows,
      },
      provenance: qcoRows.length > 0
        ? qcoRows.map((q) => ({ source: "qcos table", verificationStatus: q.verificationStatus }))
        : [{ source: "qcos table (no matching rows)" }],
    };
  },
};

/** rag.md §7 `findQCO()` — the QCO-record-returning counterpart to checkMandatoryStatus's summary. */
export const findQcoTool: ToolDefinition<z.infer<typeof StandardNumberInput>, QcoRecord[]> = {
  name: "findQCO",
  description: "Returns the verified Quality Control Order records for a standard, if any.",
  inputSchema: StandardNumberInput,
  deterministic: true,
  async execute({ canonicalNumber }): Promise<ToolResult<QcoRecord[]>> {
    const standardRow = await findStandardRow(canonicalNumber);
    if (!standardRow) return { status: "not_found" };

    const qcoRows = await findQcosForStandard(standardRow.id);
    if (qcoRows.length === 0) return { status: "not_found" };
    return {
      status: "ok",
      data: qcoRows,
      provenance: qcoRows.map((q) => ({ source: "qcos table", verificationStatus: q.verificationStatus })),
    };
  },
};

/**
 * rag.md §7 `getCertificationScheme()`. Deliberately reuses the existing
 * fact-checked JSON-backed lookup (src/lib/certification-schemes.ts)
 * rather than the `certification_schemes` DB table — the audit
 * (docs/INTELLIGENCE_ENGINE_AUDIT.md §2) found that table has no direct
 * standard FK (only an indirect shared-source link with qcos), so the
 * JSON lookup that's already the UI's source of truth is the more
 * reliable path here, not a second, weaker join.
 */
export const getCertificationSchemeTool: ToolDefinition<z.infer<typeof StandardNumberInput>, CertificationSchemeItem> = {
  name: "getCertificationScheme",
  description: "Finds the certification scheme (e.g. Scheme-I, CRS, Hallmarking) applicable to a standard.",
  inputSchema: StandardNumberInput,
  deterministic: true,
  async execute({ canonicalNumber }): Promise<ToolResult<CertificationSchemeItem>> {
    const item = await findCertificationSchemeForStandard(canonicalNumber);
    if (!item) return { status: "not_found" };
    return {
      status: "ok",
      data: item,
      provenance: [{ source: item.sourceUrl ?? "data/bis-standards-dataset/qco-standards.json", verificationStatus: item.verificationStatus ?? undefined }],
    };
  },
};
