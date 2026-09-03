import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { standards, documents } from "@/db/schema";
import { getCertificationSchemeTool } from "./tools/certification-tools";
import { extractQueryIntent } from "./intent";
import { analyzeCoverage } from "./coverage-analysis";
import type { AggregatedEvidence } from "./evidence-aggregation";
import type { RetrievedChunk, EvidenceRef } from "@/types/api";

/**
 * True server-side chat context scoping (P0 audit, 2026-09-03). The
 * client sends only stable identifiers (standardNumbers) — never trusted
 * factual content like a "reason" string or evidence text — and every
 * answer below is built from a fresh DB read keyed on those identifiers.
 * This module never calls out to global retrieval; a caller that wants
 * global search must go through classifyChatIntent's "wider_search"
 * branch first and then the ordinary /api/v1/query pipeline, never
 * silently here.
 */

export type ChatSubIntent =
  | "why_relevant"
  | "evidence"
  | "missing_info"
  | "certification"
  | "testing"
  | "wider_search"
  | "other";

const WIDER_SEARCH_PATTERN =
  /\b(other standards?|find other|search (?:more|wider|broader|beyond|for other)|explore (?:other|more)|different standards?|anything else|something else|new search)\b/i;
const WHY_PATTERN = /\bwhy\b|\bwhat makes\b.*\b(relevant|applicable|match)\b/i;
const EVIDENCE_PATTERN = /\bevidence\b|\bshow me\b|\bsources?\b|\bproof\b|\bexcerpt/i;
const MISSING_PATTERN = /\bmissing\b|\bwhat information\b|\bwhat.*(unclear|unknown|not (?:established|clear))\b/i;
const CERT_PATTERN = /\bcertif|licen[cs]e|scheme|isi mark/i;
const TESTING_PATTERN = /\btest(s|ing|ed)?\b|\blaborator/i;

/** Deterministic sub-intent classification for a chat follow-up — regex-based, same philosophy as query-planner.ts: a fact about the literal text, not an LLM guess. */
export function classifyChatIntent(message: string): ChatSubIntent {
  const m = message.toLowerCase();
  if (WIDER_SEARCH_PATTERN.test(m)) return "wider_search";
  if (WHY_PATTERN.test(m)) return "why_relevant";
  if (EVIDENCE_PATTERN.test(m)) return "evidence";
  if (MISSING_PATTERN.test(m)) return "missing_info";
  if (CERT_PATTERN.test(m)) return "certification";
  if (TESTING_PATTERN.test(m)) return "testing";
  return "other";
}

export interface ScopedStandard {
  standardId: string;
  standardNumber: string;
  title: string | null;
  chunks: Array<{
    chunkId: string;
    documentId: string;
    documentTitle: string;
    sourceUrl: string;
    section: string | null;
    clause: string | null;
    page: number | null;
    text: string;
  }>;
}

/** Resolves real standard/document/chunk rows for the given canonical numbers — never trusts anything about them beyond the identifier itself. Silently drops any number that doesn't match a real row (no fabricated standards). */
export async function resolveScopedContext(standardNumbers: string[]): Promise<ScopedStandard[]> {
  if (standardNumbers.length === 0) return [];
  const db = getDb();
  const standardRows = await db.query.standards.findMany({
    where: inArray(standards.canonicalNumber, standardNumbers.slice(0, 10)),
  });

  const result: ScopedStandard[] = [];
  for (const s of standardRows) {
    const docs = await db.query.documents.findMany({
      where: eq(documents.standardId, s.id),
      with: { chunks: true },
    });
    result.push({
      standardId: s.id,
      standardNumber: s.canonicalNumber,
      title: s.title,
      chunks: docs.flatMap((d) =>
        d.chunks.map((c) => ({
          chunkId: c.id,
          documentId: d.id,
          documentTitle: d.title,
          sourceUrl: d.sourceUrl,
          section: c.section,
          clause: c.clause,
          page: c.page,
          text: c.text,
        })),
      ),
    });
  }
  return result;
}

function toAggregatedEvidence(s: ScopedStandard): AggregatedEvidence {
  const retrievedChunks: RetrievedChunk[] = s.chunks.map((c) => ({
    chunkId: c.chunkId,
    documentId: c.documentId,
    standardNumber: s.standardNumber,
    title: c.documentTitle,
    sourceUrl: c.sourceUrl,
    sourceOrg: "BIS",
    section: c.section,
    clause: c.clause,
    page: c.page,
    text: c.text,
    semanticScore: 0,
    keywordScore: 0,
    identifierMatch: false,
    score: 0,
    rerankReason: "chat-context scoped lookup, not a ranked retrieval result",
  }));
  return {
    documentId: s.chunks[0]?.documentId ?? s.standardId,
    standardNumber: s.standardNumber,
    title: s.title ?? "",
    sourceUrl: s.chunks[0]?.sourceUrl ?? "",
    sourceOrg: "BIS",
    chunkCount: retrievedChunks.length,
    bestChunkScore: 0,
    meanChunkScore: 0,
    weightedScore: 0,
    clauseDiversity: new Set(s.chunks.map((c) => c.clause).filter(Boolean)).size,
    identifierMatch: false,
    multiSourceChunkCount: 0,
    chunks: retrievedChunks,
  };
}

export interface ScopedAnswer {
  answer: string;
  evidence: EvidenceRef[];
  limitations: string[];
}

const NO_EVIDENCE_ANSWER = "I don't have enough evidence in the current results to establish that.";

/** Builds an answer strictly from `scoped`'s real DB-resolved content — never falls back to global search. */
export async function buildScopedAnswer(
  subIntent: ChatSubIntent,
  originalQuery: string,
  scoped: ScopedStandard[],
): Promise<ScopedAnswer> {
  if (scoped.length === 0) {
    return {
      answer: NO_EVIDENCE_ANSWER,
      evidence: [],
      limitations: ["No standards from the current results could be resolved in the database."],
    };
  }

  switch (subIntent) {
    case "why_relevant": {
      const lines = scoped.map((s) => {
        const snippet = s.chunks[0]?.text?.trim().slice(0, 240);
        return snippet
          ? `${s.standardNumber} (${s.title ?? "untitled"}): indexed evidence includes "${snippet}${s.chunks[0].text.length > 240 ? "…" : ""}"`
          : `${s.standardNumber} (${s.title ?? "untitled"}): no indexed evidence chunk is available to explain why it appeared.`;
      });
      return { answer: lines.join("\n\n"), evidence: [], limitations: [] };
    }

    case "evidence": {
      const evidence: EvidenceRef[] = scoped.flatMap((s) =>
        s.chunks.slice(0, 3).map((c) => ({
          chunkId: c.chunkId,
          documentId: c.documentId,
          document: c.documentTitle,
          standardNumber: s.standardNumber,
          section: c.section,
          clause: c.clause,
          page: c.page,
          text: c.text,
          sourceUrl: c.sourceUrl,
        })),
      );
      if (evidence.length === 0) {
        return { answer: NO_EVIDENCE_ANSWER, evidence: [], limitations: ["No indexed chunks exist for the selected standard(s)."] };
      }
      return {
        answer: `Indexed evidence for ${scoped.map((s) => s.standardNumber).join(", ")}:`,
        evidence,
        limitations: [],
      };
    }

    case "certification":
    case "testing": {
      const parts: string[] = [];
      for (const s of scoped) {
        const res = await getCertificationSchemeTool.execute({ canonicalNumber: s.standardNumber });
        if (res.status === "ok" && res.data) {
          const data = res.data;
          parts.push(
            subIntent === "certification"
              ? `${s.standardNumber}: certification scheme ${data.scheme}${data.certificationRoute ? `, route: ${data.certificationRoute}` : ""}.`
              : data.testingParameters.length > 0
                ? `${s.standardNumber}: key testing parameters — ${data.testingParameters.join(", ")}.`
                : `${s.standardNumber}: no testing parameters are indexed for this standard.`,
          );
        } else {
          parts.push(`${s.standardNumber}: no certification scheme record is indexed for this standard.`);
        }
      }
      return { answer: parts.join("\n"), evidence: [], limitations: [] };
    }

    case "missing_info": {
      const intent = await extractQueryIntent(originalQuery);
      const gaps: string[] = [];
      for (const s of scoped) {
        const coverage = analyzeCoverage(intent, toAggregatedEvidence(s), []);
        const missing = (Object.entries(coverage) as [string, string][]).filter(
          ([key, status]) => key !== "overallCoverageRatio" && status !== "covered",
        );
        gaps.push(
          missing.length > 0
            ? `${s.standardNumber}: ${missing.map(([key]) => key).join(", ")} not confirmed by indexed evidence.`
            : `${s.standardNumber}: no specific evidence gap detected against the requested dimensions.`,
        );
      }
      return { answer: gaps.join("\n"), evidence: [], limitations: [] };
    }

    default:
      return {
        answer: NO_EVIDENCE_ANSWER,
        evidence: [],
        limitations: [
          "This question could not be confidently matched to the current research context. Try asking about relevance, evidence, certification, or testing — or explicitly ask to search wider BIS knowledge.",
        ],
      };
  }
}
