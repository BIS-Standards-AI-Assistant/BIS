import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { standards, documents } from "@/db/schema";
import { getCertificationSchemeTool } from "./tools/certification-tools";
import { extractQueryIntent, OFF_TOPIC_PATTERN } from "./intent";
import { analyzeCoverage } from "./coverage-analysis";
import type { AggregatedEvidence } from "./evidence-aggregation";
import type { RetrievedChunk, EvidenceRef } from "@/types/api";
import { getProviderChain, generateTextWithFallback } from "./providers";
import { refusalCopy } from "./refusal";
import { type AnswerLanguage, LANGUAGE_NAMES } from "./language";

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
  | "laboratories"
  | "wider_search"
  | "other";

const WIDER_SEARCH_PATTERN =
  /\b(other standards?|find other|search (?:more|wider|broader|beyond|for other)|explore (?:other|more)|different standards?|anything else|something else|new search)\b/i;
const WHY_PATTERN = /\bwhy\b|\bwhat makes\b.*\b(relevant|applicable|match)\b/i;
const EVIDENCE_PATTERN = /\bevidence\b|\bshow me\b|\bsources?\b|\bproof\b|\bexcerpt/i;
const MISSING_PATTERN = /\bmissing\b|\bwhat information\b|\bwhat.*(unclear|unknown|not (?:established|clear))\b/i;
// "Where do I get this tested / certified / find a lab / do business" —
// checked before CERT_PATTERN/TESTING_PATTERN because those would otherwise
// claim words like "certified" or "tested" first and answer with testing
// *parameters* instead of pointing at the actual laboratory directory.
const LABORATORY_PATTERN =
  /\blaborator|\blabs?\b|\bwhere\b.*\b(?:do business|get (?:it |this |the product )?(?:tested|certified)|find (?:a )?(?:lab|testing (?:facility|centre|center)))\b/i;
const CERT_PATTERN = /\bcertif|licen[cs]e|scheme|isi mark/i;
const TESTING_PATTERN = /\btest(s|ing|ed)?\b/i;

/** Deterministic sub-intent classification for a chat follow-up — regex-based, same philosophy as query-planner.ts: a fact about the literal text, not an LLM guess. */
export function classifyChatIntent(message: string): ChatSubIntent {
  const m = message.toLowerCase();
  if (WIDER_SEARCH_PATTERN.test(m)) return "wider_search";
  if (WHY_PATTERN.test(m)) return "why_relevant";
  if (EVIDENCE_PATTERN.test(m)) return "evidence";
  if (MISSING_PATTERN.test(m)) return "missing_info";
  if (LABORATORY_PATTERN.test(m)) return "laboratories";
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

type DocumentWithChunks = {
  id: string;
  title: string;
  sourceUrl: string;
  standardNumber: string | null;
  standardId: string | null;
  chunks: Array<{
    id: string;
    section: string | null;
    clause: string | null;
    page: number | null;
    text: string;
  }>;
};

function toScopedChunks(docs: DocumentWithChunks[]): ScopedStandard["chunks"] {
  return docs.flatMap((d) =>
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
  );
}

/**
 * Resolves real standard/document/chunk rows for the given canonical
 * numbers — never trusts anything about them beyond the identifier itself.
 * Silently drops any number that doesn't match a real row (no fabricated
 * standards).
 *
 * Two tables can hold the corpus and both are consulted, because only
 * consulting the first made every scoped follow-up unanswerable:
 *
 * - `standards` is the canonical "one standard, many documents" registry
 *   (schema.ts §standards). It is populated by the data-normalization
 *   scripts, not by ingestion, so a deployment that has only ever run
 *   ingestion has documents and chunks but an empty registry.
 * - `documents.standardNumber` is what ingestion writes and what retrieval
 *   reads, so it is the number the client actually receives in a query
 *   response — and therefore the number it sends back here.
 *
 * Resolving only against the registry meant that on such a deployment
 * every follow-up returned "No standards from the current results could be
 * resolved in the database," whatever was asked. Documents are matched on
 * the same exact-string identifier, so nothing about the trust model
 * changes: an unknown number still resolves to nothing.
 */
export async function resolveScopedContext(standardNumbers: string[]): Promise<ScopedStandard[]> {
  if (standardNumbers.length === 0) return [];
  const wanted = standardNumbers.slice(0, 10);
  const db = getDb();

  const registryRows = await db.query.standards.findMany({
    where: inArray(standards.canonicalNumber, wanted),
  });
  const registryByNumber = new Map(registryRows.map((r) => [r.canonicalNumber, r]));

  // Documents reached either way: through the registry's FK, and directly
  // by the number ingestion recorded. Merged by document id so a document
  // linked both ways is not counted (or quoted) twice.
  const [byNumber, byRegistryId] = await Promise.all([
    db.query.documents.findMany({ where: inArray(documents.standardNumber, wanted), with: { chunks: true } }),
    registryRows.length > 0
      ? db.query.documents.findMany({
          where: inArray(
            documents.standardId,
            registryRows.map((r) => r.id),
          ),
          with: { chunks: true },
        })
      : Promise.resolve([]),
  ]);

  const docsFor = new Map<string, Map<string, DocumentWithChunks>>();
  const add = (number: string | null | undefined, doc: DocumentWithChunks) => {
    if (!number || !wanted.includes(number)) return;
    const existing = docsFor.get(number) ?? new Map<string, DocumentWithChunks>();
    existing.set(doc.id, doc);
    docsFor.set(number, existing);
  };
  for (const d of byNumber) add(d.standardNumber, d);
  for (const d of byRegistryId) {
    add(registryRows.find((r) => r.id === d.standardId)?.canonicalNumber, d);
  }

  // Input order is the order the reader saw the standards in.
  const result: ScopedStandard[] = [];
  for (const number of wanted) {
    const registry = registryByNumber.get(number);
    const docs = [...(docsFor.get(number)?.values() ?? [])];
    if (!registry && docs.length === 0) continue;
    result.push({
      standardId: registry?.id ?? docs[0].id,
      standardNumber: number,
      title: registry?.title ?? docs[0]?.title ?? null,
      chunks: toScopedChunks(docs),
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
    // These chunks are fetched directly by standard id, not by semantic
    // search, so no similarity was ever computed for them — null, not 0.
    semanticSimilarity: null,
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
  /**
   * Language the `answer` text is actually written in — NOT necessarily the
   * language the question was asked in. Five of six subIntent branches
   * build a deterministic template string directly from English evidence
   * fields (standard titles, certification scheme names) and always answer
   * "en" regardless of input language — translating a template string
   * word-by-word without an LLM risks a worse, half-translated result than
   * honestly staying in English. Only the freeform/LLM branch
   * (buildFreeformAnswer) can honor the requested language, the same way
   * src/lib/answer.ts's languageInstruction does for the main query
   * pipeline. This field exists so callers (e.g. SpeakButton) read text
   * aloud in the language it's actually written in, never a mismatched one.
   */
  answerLanguage: AnswerLanguage;
}

const NO_EVIDENCE_ANSWER = "I don't have enough evidence in the current results to establish that.";

/** Builds an answer strictly from `scoped`'s real DB-resolved content — never falls back to global search. */
export async function buildScopedAnswer(
  subIntent: ChatSubIntent,
  originalQuery: string,
  message: string,
  scoped: ScopedStandard[],
  language: AnswerLanguage = "en",
): Promise<ScopedAnswer> {
  if (scoped.length === 0) {
    return {
      answer: NO_EVIDENCE_ANSWER,
      evidence: [],
      limitations: ["No standards from the current results could be resolved in the database."],
      answerLanguage: "en",
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
      return { answer: lines.join("\n\n"), evidence: [], limitations: [], answerLanguage: "en" };
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
        return { answer: NO_EVIDENCE_ANSWER, evidence: [], limitations: ["No indexed chunks exist for the selected standard(s)."], answerLanguage: "en" };
      }
      return {
        answer: `Indexed evidence for ${scoped.map((s) => s.standardNumber).join(", ")}:`,
        evidence,
        limitations: [],
        answerLanguage: "en",
      };
    }

    case "laboratories": {
      // The real BIS recognised-laboratory dataset (data/bis-standards-
      // dataset/recognised-laboratories.json) has no per-standard testing-
      // scope field and no coordinates — matching "labs that can test
      // *this* product" would be fabrication (see ProductComplianceMap.tsx
      // and LaboratoriesDirectory.tsx, which enforce the same rule). This
      // answer says so plainly and points at the real, working directory
      // instead of guessing.
      return {
        answer:
          "This assistant can't match a laboratory to a specific product or standard — the BIS recognised-laboratory " +
          "list records location and recognition status only, with no per-standard testing scope. Open the Labs tab " +
          "in this panel, or Testing → Laboratory Search in the top navigation, to browse BIS-recognised " +
          "laboratories by state or city, then confirm testing scope directly with the laboratory or BIS.",
        evidence: [],
        limitations: ["Laboratory-to-standard/product matching is not available in the current dataset."],
        answerLanguage: "en",
      };
    }

    case "certification":
    case "testing": {
      const parts: string[] = [];
      let anyRecord = false;
      for (const s of scoped) {
        const res = await getCertificationSchemeTool.execute({ canonicalNumber: s.standardNumber });
        if (res.status === "ok" && res.data) {
          anyRecord = true;
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

      // The structured certification/testing tables are a separate
      // reference dataset from the ingested documents, and a deployment can
      // have the documents without it. When it has nothing, the question is
      // still answerable from the document text — a BIS product manual
      // states its scheme of inspection and testing in prose — so quote
      // that rather than stopping at "no record". The "no record" line
      // stays: it is the honest status of the reference dataset, and the
      // reader should see which of the two they are reading.
      if (!anyRecord) {
        const fromText = buildEvidenceOnlyFollowUp(message, scoped);
        if (fromText.evidence.length > 0) {
          return {
            answer:
              parts.join("\n") +
              "\n\nThe indexed document text does cover this. These passages mention what you asked about:",
            evidence: fromText.evidence,
            limitations: [
              "No structured certification or testing record exists for this standard in the reference dataset — the passages above are the source document's own wording, not a structured scheme record.",
            ],
            answerLanguage: "en",
          };
        }
      }
      return { answer: parts.join("\n"), evidence: [], limitations: [], answerLanguage: "en" };
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
      return { answer: gaps.join("\n"), evidence: [], limitations: [], answerLanguage: "en" };
    }

    default:
      return buildFreeformAnswer(originalQuery, message, scoped, language);
  }
}

function freeformLanguageInstruction(language: AnswerLanguage): string {
  if (language === "en") return "";
  return ` Write your answer in ${LANGUAGE_NAMES[language]}. Do NOT translate standard numbers (e.g. "IS 14543:2016") or standard titles — reproduce those exactly as given in the evidence; only the surrounding explanation is in ${LANGUAGE_NAMES[language]}.`;
}

/**
 * A genuinely open-ended follow-up ("which states offer tax relief for
 * this?") matches none of the fixed intent patterns above, and the fixed
 * intents deliberately don't try to guess at open-ended questions — they
 * are precise, evidence-shaped answers for precise, evidence-shaped
 * questions. This is the one place an LLM is allowed to phrase an answer,
 * and only under a hard constraint: it may only draw on the indexed chunk
 * text already resolved into `scoped` (real DB rows for real standard
 * numbers, resolved above `scoped`'s definition) — never on its own
 * training knowledge, and it must say so plainly when that text doesn't
 * answer the question, rather than filling the gap with plausible-sounding
 * invention. If every configured provider fails (or none is configured),
 * this falls back to the same honest NO_EVIDENCE_ANSWER the rest of this
 * module uses — evidence-only behavior always still works with zero LLM
 * dependency, per docs/ARCHITECTURE.md.
 *
 * Before any of that: OFF_TOPIC_PATTERN (src/lib/intent.ts) runs on the
 * raw message first — a fixed keyword check, deliberately NOT an LLM
 * judgment call. An LLM-based check was tried and reverted: asked to judge
 * a bare follow-up in isolation (no conversation context), it produced a
 * real false positive on a legitimate pronoun-heavy question ("how heavy
 * is this thing allowed to be?", mid-conversation about a helmet
 * standard) — ambiguous alone, obviously on-topic in context, and a
 * scoped chat already only exists because `scoped` resolved to real
 * standards, so a bare keyword check is enough to catch an actual pivot
 * ("tell me a joke") without the false-positive risk. Every other refusal
 * in this app is a fixed string a model can't talk its way around
 * (src/lib/refusal.ts) — this keeps that property without adding a new
 * way to be wrong.
 *
 * This used to be pinned to the "openrouter-free" provider specifically,
 * on the reasoning that the one path where a model freely phrases prose
 * deserves the provider best verified to stay grounded. The pin was a
 * single-provider chain with no fallback, so on a deployment configured
 * for any other provider (LLM_PROVIDER=gemini, say) every open-ended
 * follow-up silently reached a provider that was not the configured one,
 * failed, and came back as "I don't have enough evidence" — which reads
 * as the corpus having nothing to say rather than as a provider outage.
 * It now uses the app's configured chain like every other call site, so
 * grounding is enforced by the system prompt and the evidence-only
 * fallback below, not by which vendor answered.
 */
/**
 * Questions no standards corpus can answer, whoever is asked — market
 * size, competitors, pricing, where to site a factory. They are not
 * off-topic in the OFF_TOPIC_PATTERN sense (a reader asking where to
 * manufacture a helmet is asking in good faith, about the product under
 * discussion), but the indexed corpus is Indian Standards and BIS service
 * documents, and no amount of retrieval will turn that into market
 * intelligence. Handled deterministically, before the LLM, for two
 * reasons: the answer is the same every time, and a model asked a
 * market question while holding standards excerpts is exactly the setup
 * that produces a confident, invented answer.
 */
const BEYOND_CORPUS_PATTERN = new RegExp(
  [
    // Market and commercial standing.
    String.raw`\b(?:competitors?|competition|rivals?|market (?:share|size|leader|research|trend|demand)`,
    String.raw`|profit|revenue|turnover|sales figures?)\b`,
    // Where to put a factory. Deliberately requires a production word:
    // "best place for the ISI mark" is a standards question, not this.
    String.raw`|\b(?:manufactur\w*|production|factory|plant)\s+(?:location|hub|base|site|city|state|country)\b`,
    String.raw`|\b(?:best|cheapest|ideal|top|good)\s+(?:\w+\s+){0,2}(?:place|location|city|state|country|region|hub|site)\s+(?:to|for)\s+(?:manufactur|produc|make|build|set)`,
    String.raw`|\bwhere (?:should|can|do) (?:i|we) (?:manufactur|produce|set ?up|build|open)\b`,
  ].join(""),
  "i",
);

function beyondCorpusAnswer(scoped: ScopedStandard[]): ScopedAnswer {
  const numbers = scoped.map((s) => s.standardNumber).join(", ");
  return {
    answer:
      "That is outside what this service holds. BIS Standards Navigator indexes Indian Standards and BIS " +
      "service documents — it has no market, competitor, pricing or site-selection data, and inventing an " +
      `answer from the standards text would not be one. For ${numbers} it can tell you what the indexed ` +
      "clauses actually require, what evidence supports them, the certification scheme and testing parameters " +
      "on record, and which BIS-recognised laboratories exist by state (Testing → Laboratory Search).",
    evidence: [],
    limitations: ["Market, competitor, pricing and site-selection questions are outside the indexed BIS corpus."],
    answerLanguage: "en",
  };
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "along", "also", "always", "another", "because", "been", "before",
  "being", "below", "between", "both", "does", "doing", "during", "each", "from", "have", "having", "here",
  "into", "just", "like", "more", "most", "much", "must", "need", "needs", "only", "other", "over", "same",
  "should", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "under", "until", "very", "what", "when", "where", "which", "while", "will", "with", "would",
  "your", "tell", "give", "show", "know", "want", "make", "does", "many",
]);

/**
 * The evidence-only answer for an open-ended follow-up — what the reader
 * gets when no LLM provider is configured or every one of them fails.
 * Tier 0 of docs/ARCHITECTURE.md's cost tiers: the service stays useful
 * with deterministic code and Postgres alone.
 *
 * It does not write prose about the evidence, because writing prose is
 * the part that needs a model. It finds the indexed passages whose text
 * actually contains what was asked about and hands them over verbatim,
 * with their clause and page, for the reader to judge — which is the
 * evidence-first path (claim → evidence → source) with the claim step
 * left out rather than guessed at. Previously this case returned a bare
 * "I don't have enough evidence in the current results to establish
 * that", which said the corpus was empty-handed when the truth was that
 * no model had been reachable to phrase the answer.
 */
export function buildEvidenceOnlyFollowUp(message: string, scoped: ScopedStandard[]): ScopedAnswer {
  const terms = [
    ...new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4 && !STOP_WORDS.has(t)),
    ),
  ];

  const ranked = scoped
    .flatMap((s) =>
      s.chunks.map((c) => {
        const text = c.text.toLowerCase();
        return { standardNumber: s.standardNumber, chunk: c, hits: terms.filter((t) => text.includes(t)).length };
      }),
    )
    .filter((c) => c.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  if (ranked.length === 0) {
    const covered = scoped
      .map((s) => {
        const clauses = [...new Set(s.chunks.map((c) => c.clause).filter(Boolean))].slice(0, 6);
        const where = clauses.length > 0 ? ` (indexed clauses include ${clauses.join(", ")})` : "";
        return `${s.standardNumber}${s.title ? ` — ${s.title}` : ""}${where}`;
      })
      .join("; ");
    return {
      answer:
        `No passage in the indexed text for ${scoped.map((s) => s.standardNumber).join(", ")} mentions what you ` +
        `asked about, so there is nothing here to answer it from. What is indexed: ${covered}. You can ask what ` +
        "evidence supports a standard, its certification scheme or testing parameters on record, or ask to " +
        "search wider BIS knowledge for a different topic.",
      evidence: [],
      limitations: ["Answered from indexed evidence only — no AI provider was available to interpret the question."],
      answerLanguage: "en",
    };
  }

  return {
    answer:
      "Answering from the indexed BIS text directly. These are the passages in " +
      `${[...new Set(ranked.map((r) => r.standardNumber))].join(", ")} that mention what you asked about, quoted ` +
      "as they appear in the source — read them and judge whether they answer it:",
    evidence: ranked.map((r) => ({
      chunkId: r.chunk.chunkId,
      documentId: r.chunk.documentId,
      document: r.chunk.documentTitle,
      standardNumber: r.standardNumber,
      section: r.chunk.section,
      clause: r.chunk.clause,
      page: r.chunk.page,
      text: r.chunk.text,
      sourceUrl: r.chunk.sourceUrl,
    })),
    limitations: ["Answered from indexed evidence only — no AI provider was available to summarise it in prose."],
    answerLanguage: "en",
  };
}

async function buildFreeformAnswer(
  originalQuery: string,
  message: string,
  scoped: ScopedStandard[],
  language: AnswerLanguage = "en",
): Promise<ScopedAnswer> {
  if (OFF_TOPIC_PATTERN.test(message.toLowerCase())) {
    const refusal = refusalCopy("out_of_scope", "en");
    return { answer: refusal.answer, evidence: [], limitations: [refusal.limitation], answerLanguage: "en" };
  }

  if (BEYOND_CORPUS_PATTERN.test(message)) return beyondCorpusAnswer(scoped);

  const evidenceBlock = scoped
    .map((s) => {
      const excerpts = s.chunks
        .slice(0, 4)
        .map((c) => `  - "${c.text.trim().slice(0, 500)}"`)
        .join("\n");
      return `${s.standardNumber} (${s.title ?? "untitled"}):\n${excerpts || "  - no indexed evidence chunk available"}`;
    })
    .join("\n\n");

  const chain = getProviderChain();
  const { response } = await generateTextWithFallback(chain, {
    system:
      "You are a research assistant for BIS Standards Navigator, a government service. " +
      "You answer ONLY from the indexed BIS evidence excerpts given to you below — never from general knowledge, " +
      "never inventing a fact, statistic, regulation, tax rule, government scheme, or standard clause that is not " +
      "literally present in the excerpts. If the excerpts do not contain information that answers the question, " +
      "say so plainly and explain what the indexed evidence does cover instead — do not fill the gap with a " +
      "plausible-sounding guess. When the question is outside what a standards corpus can answer at all (market " +
      "size, competitors, pricing, where to site a factory), say that plainly in one sentence and point the reader " +
      "to what this service does hold: the indexed clauses of the standards in scope, the certification scheme and " +
      "testing parameters on record, and the BIS recognised-laboratory directory. " +
      "Keep the answer concise (2-4 sentences) and do not use markdown formatting." +
      freeformLanguageInstruction(language),
    prompt:
      `The reader originally searched for: ${originalQuery}\n\n` +
      `They are now asking: ${message}\n\n` +
      `Indexed BIS evidence for the standards in scope:\n\n${evidenceBlock}`,
    maxOutputTokens: 1200,
  });

  if (response?.text?.trim()) {
    return { answer: response.text.trim(), evidence: [], limitations: [], answerLanguage: language };
  }

  return buildEvidenceOnlyFollowUp(message, scoped);
}
