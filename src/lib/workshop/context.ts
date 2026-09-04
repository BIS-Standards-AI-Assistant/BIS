import type { AssistantMessage } from "@/lib/assistant-conversation";
import type { QueryResponse } from "@/types/api";
import type { Provenance } from "@/lib/provenance";

/**
 * The structured intermediate representation between a conversation and a
 * generated artifact (§4).
 *
 * The rule this file exists to enforce: **never concatenate the raw
 * conversation and hand it to a model** (§4). Everything the Workshop acts
 * on passes through this shape first, where each fact carries where it came
 * from and can be shown to the user for correction before anything is
 * generated (§6).
 *
 * Extraction here is deterministic — it reads the pipeline's own structured
 * output and the user's own turns. It calls no model. That matters for two
 * reasons: SIH.md §23 requires the system to work with no LLM at all, and an
 * extractor that itself hallucinates would poison every artifact downstream.
 */

/** A fact plus where it came from, so §23/§65 provenance survives into artifacts. */
export interface ContextValue<T> {
  value: T;
  provenance: Provenance;
  /** Which conversation turn or pipeline field produced it. */
  derivedFrom: string;
}

export interface StandardReference {
  standardNumber: string;
  title: string | null;
  /** Whether the pipeline established applicability, not merely relevance. */
  applicability: string;
  groundingState: "verified" | "supported_inference" | "insufficient_evidence";
  /** True when the user named this standard themselves (§52). */
  userSpecified: boolean;
}

export interface SourceReference {
  standardNumber: string | null;
  documentTitle: string;
  clause: string | null;
  page: number | null;
  sourceUrl: string;
}

/** The eight Product DNA axes (§5). Absent means "not established", never "none". */
export interface ProductDNA {
  material?: ContextValue<string>;
  userBase?: ContextValue<string>;
  intendedUse?: ContextValue<string>;
  manufacturingProcess?: ContextValue<string>;
  electricalComponents?: ContextValue<string>;
  safetyCharacteristics?: ContextValue<string>;
  environment?: ContextValue<string>;
  market?: ContextValue<string>;
}

export const PRODUCT_DNA_AXES: (keyof ProductDNA)[] = [
  "material",
  "userBase",
  "intendedUse",
  "manufacturingProcess",
  "electricalComponents",
  "safetyCharacteristics",
  "environment",
  "market",
];

export const AXIS_LABELS: Record<keyof ProductDNA, string> = {
  material: "Material",
  userBase: "User",
  intendedUse: "Intended use",
  manufacturingProcess: "Manufacturing process",
  electricalComponents: "Electrical components",
  safetyCharacteristics: "Safety characteristics",
  environment: "Environment",
  market: "Market",
};

/** Two different answers to the same question, both said by the user (§55). */
export interface ContextConflict {
  axis: keyof ProductDNA | "product";
  values: string[];
  /** The user's own words, so they can see what they said and pick. */
  excerpts: string[];
}

export interface ProductComplianceContext {
  product: {
    name?: ContextValue<string>;
    description?: ContextValue<string>;
  };
  productDNA: ProductDNA;
  standards: StandardReference[];
  sourceReferences: SourceReference[];
  /** What the user appears to be trying to do (§5, "user intent"). */
  intent: "understand" | "prepare_testing" | "prepare_certification" | "check_compliance" | "compare" | "unknown";
  /** Axes with no value — what the missing-information engine asks about (§7). */
  missing: (keyof ProductDNA)[];
  /** Contradictions found across turns — surfaced, never silently resolved (§55). */
  conflicts: ContextConflict[];
  conversationSummary: string;
  confidence: QueryResponse["confidence"] | null;
}

// --------------------------------------------------------------- extraction

/** Standard identifiers as BIS writes them, e.g. "IS 15410:2003", "IS 302 (Part 2/Sec 6):2009". */
const IS_NUMBER = /\bIS\s?\d{1,5}(?:\s*\([^)]*\))?(?::\s?\d{4})?/gi;

const INTENT_PATTERNS: [ProductComplianceContext["intent"], RegExp][] = [
  ["prepare_testing", /\b(test|testing|lab|laborator|sample|parameter)\w*\b/i],
  // "apply for a licence" is certification intent; "which standards apply"
  // is not — a bare \bapply\b matched both and mislabelled the common case.
  ["prepare_certification", /\b(?:certif\w*|licen[cs]e\w*|isi mark|scheme\w*|application|registration)\b|\bapply\s+(?:for|to)\b/i],
  ["check_compliance", /\b(complian|conform|does my|is my|already)\w*\b/i],
  ["compare", /\b(compare|difference|versus|vs\.?)\b/i],
];

/**
 * Reads the user's own turns for a stated value on one axis.
 *
 * Deliberately narrow: it matches only explicit phrasings ("made of X",
 * "for children"), because a loose extractor that guesses "children" from
 * the word "kids-friendly" would be inventing product attributes, and those
 * attributes go on to drive which standards the artifact claims apply.
 * Anything not clearly stated is left absent and asked about instead (§7).
 */
const AXIS_PATTERNS: Partial<Record<keyof ProductDNA, RegExp[]>> = {
  material: [
    /\bmade (?:of|from)\s+([a-z\s]{3,30}?)(?:[.,;]|\band\b|$)/i,
    /\b(stainless steel|mild steel|aluminium|aluminum|copper|brass|pvc|polypropylene|polycarbonate|glass|rubber|silicone)\b/i,
  ],
  userBase: [/\bfor\s+(children|kids|infants|adults|industrial users|medical use|professionals)\b/i],
  intendedUse: [
    /\b(?:used|intended|meant)\s+(?:for|to)\s+([a-z\s]{3,40}?)(?:[.,;]|\band\b|$)/i,
    /\bfor\s+(drinking water|potable water|storing water|cooking|domestic use|industrial use)\b/i,
  ],
  environment: [/\b(indoor|outdoor|marine|underground|high temperature|corrosive)\b/i],
  market: [/\b(india|indian market|domestic market|export|imported)\b/i],
  electricalComponents: [/\b(\d{2,4}\s?v(?:olts?)?|battery|motor|heating element|mains powered)\b/i],
};

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m) return (m[1] ?? m[0]).trim().toLowerCase();
  }
  return null;
}

/**
 * Builds the context from a conversation plus the pipeline result that
 * produced its answers.
 *
 * Every user turn is read, not only the last (§54) — a product named in
 * message 1 and a voltage given in message 5 must both survive.
 */
export function extractComplianceContext(
  messages: AssistantMessage[],
  result: QueryResponse | null,
  activeQuery: string,
): ProductComplianceContext {
  const userTurns = messages.filter((m) => m.sender === "user").map((m) => m.text);
  // The query itself is a user statement, and is often the only one.
  const allUserText = [activeQuery, ...userTurns].filter(Boolean);
  const joined = allUserText.join("\n");

  // ---- Product DNA, with conflicts recorded rather than resolved (§55) ----
  const dna: ProductDNA = {};
  const conflicts: ContextConflict[] = [];

  for (const axis of PRODUCT_DNA_AXES) {
    const patterns = AXIS_PATTERNS[axis];
    if (!patterns) continue;

    const found: { value: string; from: string }[] = [];
    for (const turn of allUserText) {
      const value = firstMatch(turn, patterns);
      if (value && !found.some((f) => f.value === value)) found.push({ value, from: turn });
    }
    if (found.length === 0) continue;

    dna[axis] = { value: found[0].value, provenance: "user", derivedFrom: found[0].from };
    if (found.length > 1) {
      conflicts.push({
        axis,
        values: found.map((f) => f.value),
        excerpts: found.map((f) => f.from),
      });
    }
  }

  // The interpretation is the pipeline's own reading. It fills only axes the
  // user did not state outright, and is marked as interpretation, not fact.
  if (result?.interpretation) {
    const i = result.interpretation;
    const fromPipeline: [keyof ProductDNA, string | null][] = [
      ["material", i.material],
      ["userBase", i.targetUser],
      ["intendedUse", i.useCase],
      ["market", i.sector],
    ];
    for (const [axis, value] of fromPipeline) {
      if (value && !dna[axis]) {
        dna[axis] = { value, provenance: "ai", derivedFrom: "query interpretation" };
      }
    }
  }

  // ---- Standards: real ones from retrieval, plus any the user named (§52) ----
  const standards: StandardReference[] = (result?.recommendations ?? []).map((r) => ({
    standardNumber: r.standardNumber ?? "",
    title: r.title,
    applicability: r.applicability.state,
    groundingState: r.groundingState,
    userSpecified: false,
  })).filter((s) => s.standardNumber);

  const userNamed = new Set((joined.match(IS_NUMBER) ?? []).map((n) => n.replace(/\s+/g, " ").trim().toUpperCase()));
  for (const number of userNamed) {
    const existing = standards.find((s) => s.standardNumber.toUpperCase() === number);
    if (existing) {
      existing.userSpecified = true;
    } else {
      // Named by the user but not returned by retrieval — carried through as
      // unverified rather than dropped, so §52's conflict can be shown.
      standards.push({
        standardNumber: number,
        title: null,
        applicability: "INSUFFICIENT_EVIDENCE",
        groundingState: "insufficient_evidence",
        userSpecified: true,
      });
    }
  }

  const sourceReferences: SourceReference[] = (result?.recommendations ?? []).flatMap((r) =>
    r.evidence.map((e) => ({
      standardNumber: e.standardNumber,
      documentTitle: e.document,
      clause: e.clause,
      page: e.page,
      sourceUrl: e.sourceUrl,
    })),
  );

  const productName =
    result?.interpretation?.product ??
    (activeQuery ? activeQuery.trim() : undefined);

  return {
    product: {
      name: productName
        ? {
            value: productName,
            provenance: result?.interpretation?.product ? "ai" : "user",
            derivedFrom: result?.interpretation?.product ? "query interpretation" : "your search",
          }
        : undefined,
      description: activeQuery ? { value: activeQuery, provenance: "user", derivedFrom: "your search" } : undefined,
    },
    productDNA: dna,
    standards,
    sourceReferences,
    intent: detectIntent(joined),
    missing: PRODUCT_DNA_AXES.filter((axis) => !dna[axis]),
    conflicts,
    conversationSummary: summarise(allUserText),
    confidence: result?.confidence ?? null,
  };
}

function detectIntent(text: string): ProductComplianceContext["intent"] {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(text)) return intent;
  }
  return text.trim() ? "understand" : "unknown";
}

/**
 * A summary built by selection, not by generation (§53). Restating the
 * user's own sentences cannot introduce a fact they did not say; asking a
 * model to summarise could.
 */
function summarise(userText: string[]): string {
  return userText.map((t) => t.trim()).filter(Boolean).join(" ").slice(0, 600);
}

/** Whether there is enough to generate against, or whether to ask first (§7). */
export function hasSufficientContext(context: ProductComplianceContext): boolean {
  return Boolean(context.product.name) && context.standards.length > 0 && context.conflicts.length === 0;
}
