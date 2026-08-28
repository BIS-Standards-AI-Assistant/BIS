/**
 * Deterministic validation over data/evaluation/generation-results.json.
 * No LLM calls. Every check here is a direct comparison against the golden
 * expectations or a direct database lookup — the point is to verify the
 * LLM's own citation claims rather than trust them.
 *
 * Usage: npx dotenv-cli -e .env.local -- tsx scripts/validate-generation.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";

const CONFIDENCE_ORDER = ["none", "low", "medium", "high"] as const;
const GROUNDING_ORDER = ["insufficient_evidence", "supported_inference", "verified"] as const;

type Confidence = (typeof CONFIDENCE_ORDER)[number];
type Grounding = (typeof GROUNDING_ORDER)[number];

interface GoldenQuery {
  id: string;
  category: string;
  query: string;
  expectedStandardIds: string[];
  expectedGrounding?: Grounding;
  expectedConfidenceMin?: Confidence;
  expectedConfidenceExact?: Confidence;
  requiresCitation?: boolean;
  shouldReturnRecommendations?: boolean | null;
  mustNotContainStandard?: string;
  mustNotAssertMandatoryCertification?: boolean;
}

interface Recommendation {
  standardNumber: string | null;
  groundingState: Grounding;
  evidence: Array<{ chunkId: string; documentId: string; section: string | null; clause: string | null; sourceUrl: string }>;
}

interface QueryResponse {
  answer: string;
  recommendations: Recommendation[];
  certification: { available: boolean; notes: string | null };
  confidence: Confidence;
  limitations: string[];
}

interface StoredResult {
  id: string;
  response?: QueryResponse;
  httpStatus: number | null;
  error: string | null;
}

type FailureMode =
  | "NONE"
  | "RETRIEVAL_FAILURE"
  | "EVIDENCE_SELECTION_FAILURE"
  | "GROUNDING_FAILURE"
  | "GENERATION_FAILURE"
  | "CITATION_FAILURE"
  | "POLICY_FAILURE"
  | "INFRASTRUCTURE_FAILURE";

interface ValidationRow {
  id: string;
  category: string;
  ran: boolean;
  standardCorrect: boolean | null;
  falseStandardDetected: boolean;
  groundingCorrect: boolean | null;
  confidenceCorrect: boolean | null;
  citationsChecked: number;
  citationsValid: number;
  policyViolation: boolean;
  failureMode: FailureMode;
  notes: string[];
}

async function citationIsValid(
  db: ReturnType<typeof getDb>,
  ev: Recommendation["evidence"][number],
): Promise<{ valid: boolean; reason?: string }> {
  const row = await db.query.chunks.findFirst({
    where: (c, { eq }) => eq(c.id, ev.chunkId),
    with: { document: true },
  });
  if (!row) return { valid: false, reason: "chunkId does not exist in database" };
  if (row.documentId !== ev.documentId) return { valid: false, reason: "documentId mismatch" };
  if ((row.section ?? null) !== (ev.section ?? null)) return { valid: false, reason: "section mismatch" };
  if ((row.clause ?? null) !== (ev.clause ?? null)) return { valid: false, reason: "clause mismatch" };
  if (row.document.sourceUrl !== ev.sourceUrl) return { valid: false, reason: "sourceUrl mismatch" };
  return { valid: true };
}

function confidenceMeetsMin(actual: Confidence, min: Confidence): boolean {
  return CONFIDENCE_ORDER.indexOf(actual) >= CONFIDENCE_ORDER.indexOf(min);
}

function groundingMeetsMin(actual: Grounding, min: Grounding): boolean {
  return GROUNDING_ORDER.indexOf(actual) >= GROUNDING_ORDER.indexOf(min);
}

async function main() {
  const goldenPath = path.join(__dirname, "..", "data", "evaluation", "golden-queries.json");
  const resultsPath = path.join(__dirname, "..", "data", "evaluation", "generation-results.json");
  const golden: GoldenQuery[] = JSON.parse(readFileSync(goldenPath, "utf-8"));
  const results: StoredResult[] = JSON.parse(readFileSync(resultsPath, "utf-8"));
  const db = getDb();

  const goldenById = new Map(golden.map((q) => [q.id, q]));
  const rows: ValidationRow[] = [];
  let realDocumentStandards: Set<string> | null = null;

  for (const result of results) {
    const q = goldenById.get(result.id);
    if (!q) continue;

    if (!result.response) {
      rows.push({
        id: q.id, category: q.category, ran: false,
        standardCorrect: null, falseStandardDetected: false, groundingCorrect: null,
        confidenceCorrect: null, citationsChecked: 0, citationsValid: 0,
        policyViolation: false, failureMode: "INFRASTRUCTURE_FAILURE",
        notes: [`Not run / errored: ${result.error ?? "unknown"}`],
      });
      continue;
    }

    const resp = result.response;
    const notes: string[] = [];
    let failureMode: FailureMode = "NONE";

    // Standard correctness
    let standardCorrect: boolean | null = null;
    if (q.shouldReturnRecommendations === true) {
      const gotStandards = resp.recommendations.map((r) => r.standardNumber).filter(Boolean);
      standardCorrect = q.expectedStandardIds.every((id) => gotStandards.includes(id));
      if (!standardCorrect) {
        notes.push(`Expected ${q.expectedStandardIds.join(",")}, got ${gotStandards.join(",") || "(none)"}`);
        failureMode = "EVIDENCE_SELECTION_FAILURE";
      }
    } else if (q.shouldReturnRecommendations === false) {
      standardCorrect = resp.recommendations.length === 0;
      if (!standardCorrect) {
        notes.push(`Expected no recommendations, got ${resp.recommendations.map((r) => r.standardNumber).join(",")}`);
        failureMode = "POLICY_FAILURE";
      }
    }

    // False-standard detection: does the model recommend a standard number
    // that doesn't correspond to any real ingested document at all? This is
    // checked against the live documents table, not the golden set, so it
    // catches outright fabrication even on queries with no fixed expectation.
    if (!realDocumentStandards) {
      const docs = await db.query.documents.findMany({ columns: { standardNumber: true } });
      realDocumentStandards = new Set(docs.map((d) => d.standardNumber).filter((s): s is string => !!s));
    }
    let falseStandardDetected = false;
    for (const rec of resp.recommendations) {
      if (rec.standardNumber && !realDocumentStandards.has(rec.standardNumber)) {
        falseStandardDetected = true;
        notes.push(`FABRICATED standard number not in database: ${rec.standardNumber}`);
        failureMode = "GENERATION_FAILURE";
      }
    }

    // mustNotContainStandard (fabricated-ID traps)
    let policyViolation = false;
    if (q.mustNotContainStandard && resp.answer.includes(q.mustNotContainStandard)) {
      policyViolation = true;
      notes.push(`Answer text contains the forbidden fabricated identifier "${q.mustNotContainStandard}"`);
      failureMode = "POLICY_FAILURE";
    }
    if (q.mustNotAssertMandatoryCertification && resp.certification.available) {
      // Soft check: flagged for manual review, not auto-failed, since
      // "available: true" with appropriately hedged notes could still be
      // correct — only an outright unhedged "mandatory" claim is the real
      // violation, and that needs a human read of the notes text.
      notes.push(`certification.available=true — manual review needed: "${resp.certification.notes}"`);
    }

    // Grounding correctness (checked per top recommendation, if any expected)
    let groundingCorrect: boolean | null = null;
    if (q.expectedGrounding && resp.recommendations.length > 0) {
      const topGrounding = resp.recommendations[0].groundingState;
      groundingCorrect = groundingMeetsMin(topGrounding, q.expectedGrounding);
      if (!groundingCorrect) {
        notes.push(`Expected groundingState >= ${q.expectedGrounding}, got ${topGrounding}`);
        if (failureMode === "NONE") failureMode = "GROUNDING_FAILURE";
      }
    }

    // Confidence correctness
    let confidenceCorrect: boolean | null = null;
    if (q.expectedConfidenceExact) {
      confidenceCorrect = resp.confidence === q.expectedConfidenceExact;
      if (!confidenceCorrect) {
        notes.push(`Expected confidence === ${q.expectedConfidenceExact}, got ${resp.confidence}`);
        if (failureMode === "NONE") failureMode = "GROUNDING_FAILURE";
      }
    } else if (q.expectedConfidenceMin) {
      confidenceCorrect = confidenceMeetsMin(resp.confidence, q.expectedConfidenceMin);
      if (!confidenceCorrect) {
        notes.push(`Expected confidence >= ${q.expectedConfidenceMin}, got ${resp.confidence}`);
        if (failureMode === "NONE") failureMode = "GROUNDING_FAILURE";
      }
    }

    // Citation integrity — every cited chunk checked against the live DB
    let citationsChecked = 0;
    let citationsValid = 0;
    for (const rec of resp.recommendations) {
      for (const ev of rec.evidence) {
        citationsChecked++;
        const check = await citationIsValid(db, ev);
        if (check.valid) citationsValid++;
        else {
          notes.push(`Invalid citation (chunk ${ev.chunkId.slice(0, 8)}): ${check.reason}`);
          if (failureMode === "NONE") failureMode = "CITATION_FAILURE";
        }
      }
    }
    if (q.requiresCitation && citationsChecked === 0 && resp.recommendations.length > 0) {
      notes.push("Recommendation made with zero evidence citations");
      if (failureMode === "NONE") failureMode = "CITATION_FAILURE";
    }

    rows.push({
      id: q.id, category: q.category, ran: true,
      standardCorrect, falseStandardDetected, groundingCorrect, confidenceCorrect,
      citationsChecked, citationsValid, policyViolation, failureMode, notes,
    });
  }

  const outPath = path.join(__dirname, "..", "data", "evaluation", "validation-results.json");
  writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");

  console.table(
    rows.map((r) => ({
      id: r.id,
      category: r.category,
      ran: r.ran,
      standard: r.standardCorrect,
      grounding: r.groundingCorrect,
      confidence: r.confidenceCorrect,
      citations: r.citationsChecked ? `${r.citationsValid}/${r.citationsChecked}` : "-",
      false_std: r.falseStandardDetected,
      failure: r.failureMode,
    })),
  );

  const ranRows = rows.filter((r) => r.ran);
  const totalCitations = ranRows.reduce((s, r) => s + r.citationsChecked, 0);
  const validCitations = ranRows.reduce((s, r) => s + r.citationsValid, 0);
  console.log(`\nRan: ${ranRows.length}/${rows.length}`);
  console.log(`Citation validity: ${validCitations}/${totalCitations}`);
  console.log(`False-standard detections: ${ranRows.filter((r) => r.falseStandardDetected).length}`);
  console.log(`Policy violations: ${ranRows.filter((r) => r.policyViolation).length}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
