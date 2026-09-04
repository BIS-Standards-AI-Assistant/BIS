/**
 * The data-trust model (§41), expressed as types rather than as a styling
 * convention.
 *
 * The single most important rule in this product is that a reader can tell
 * what an official BIS document says from what the system inferred. Making
 * that a `Provenance` value that every trust-bearing component demands means
 * a developer cannot render a compliance claim without stating where it came
 * from — the type checker asks the question for us.
 *
 * This is the UI counterpart of the rules the pipeline already enforces
 * (src/lib/grounding.ts, src/lib/chat-context.ts): never present an
 * inference as a source, and never manufacture certainty.
 */

export type Provenance =
  /** Reproduced from a BIS or other official government document. */
  | "official"
  /** The user told us this — their product description, their upload. */
  | "user"
  /** The system's reading of official evidence. Reasoning, not record. */
  | "ai"
  /** Derived from evidence but not stated by it. Weaker than "ai". */
  | "inference";

export interface ProvenanceMeta {
  label: string;
  /** One line a non-expert can act on. Shown in the tooltip/aside. */
  description: string;
}

export const PROVENANCE: Record<Provenance, ProvenanceMeta> = {
  official: {
    label: "Official source",
    description: "Reproduced from a published BIS or government document.",
  },
  user: {
    label: "You told us",
    description: "Taken from what you described or uploaded. Not verified by BIS.",
  },
  ai: {
    label: "AI interpretation",
    description: "The system's reading of the evidence below. Check the source before relying on it.",
  },
  inference: {
    label: "Inferred",
    description: "Derived from the evidence, not stated by it directly. Treat as a lead, not a requirement.",
  },
};

/**
 * Confidence in words (§11). Percentages are deliberately absent: an
 * arbitrary "97%" invites a precision the pipeline cannot support, and the
 * existing engine already reasons in these terms (src/lib/confidence.ts).
 */
export type ConfidenceLevel =
  | "high"
  | "likely"
  | "possible"
  | "needs-verification"
  | "insufficient";

export interface ConfidenceMeta {
  label: string;
  /** What this level actually means — never left to the reader to guess. */
  meaning: string;
  tone: "success" | "warning" | "danger" | "neutral";
}

export const CONFIDENCE: Record<ConfidenceLevel, ConfidenceMeta> = {
  high: {
    label: "High confidence",
    meaning: "Indexed BIS evidence directly supports this.",
    tone: "success",
  },
  likely: {
    label: "Likely applicable",
    meaning: "Evidence supports this, but the match was not stated outright.",
    tone: "success",
  },
  possible: {
    label: "Possible match",
    meaning: "Related evidence exists; applicability is not established.",
    tone: "warning",
  },
  "needs-verification": {
    label: "Needs verification",
    meaning: "Check this against the official document before relying on it.",
    tone: "warning",
  },
  insufficient: {
    label: "Insufficient information",
    meaning: "There is not enough evidence to answer. Nothing is being asserted.",
    tone: "danger",
  },
};

/**
 * Maps the pipeline's own states onto the reader-facing scale, so the two
 * cannot drift apart. `insufficient_evidence` deliberately lands on
 * "insufficient" rather than a hedged "possible" — §10 forbids dressing an
 * unanswerable question up as a weak answer.
 */
export function confidenceFromGrounding(
  grounding: "verified" | "supported_inference" | "insufficient_evidence",
): ConfidenceLevel {
  switch (grounding) {
    case "verified":
      return "high";
    case "supported_inference":
      return "likely";
    case "insufficient_evidence":
      return "insufficient";
  }
}

/** What a claim of this provenance is allowed to look like. Official evidence never gets AI styling, and vice versa. */
export function isAuthoritative(provenance: Provenance): boolean {
  return provenance === "official";
}
