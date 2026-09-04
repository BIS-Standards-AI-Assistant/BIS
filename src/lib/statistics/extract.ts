import { normalise, unitDimension, type Dimension } from "./units";

/**
 * Quantitative fact extraction from technical document text (§4-§6, §11, §59).
 *
 * The hardest requirement in the spec is §5: **do not extract every
 * number**. A BIS document is dense with clause numbers, page numbers,
 * standard identifiers and revision years, none of which are statistics. A
 * naive number-grabber produces a dashboard of noise that looks analytical
 * and means nothing — the "AI slop" §61 rules out.
 *
 * So this extractor is unit-led and context-led, not number-led: a number
 * is promoted only when it carries a recognised unit or an explicit
 * quantitative phrasing, and it is rejected outright when it sits in a
 * metadata construction ("Clause 4.2", "IS 15410:2003", "Page 17").
 *
 * Deliberately deterministic. §56 allows an LLM for semantic extraction,
 * but §57 then requires programmatic validation that the value really
 * appears in the source — so the regex layer has to exist regardless, and
 * it is the layer that can be tested exhaustively.
 */

export type StatisticType =
  | "measurement" | "minimum" | "maximum" | "range"
  | "percentage" | "count" | "duration" | "tolerance" | "other";

export interface StatisticSource {
  page?: number | null;
  section?: string | null;
  clause?: string | null;
  /** The sentence the value was read from, for §28's excerpt. */
  excerpt: string;
}

export interface ExtractedStatistic {
  /** What the number describes, read from the text before it. */
  parameter: string | null;
  /** As written in the document — never overwritten (§9). */
  displayValue: string;
  value: number | null;
  unit: string | null;
  min?: number;
  max?: number;
  statisticType: StatisticType;
  dimension: Dimension;
  normalizedValue?: number;
  normalizedUnit?: string;
  source: StatisticSource;
  /** "extracted" is stated in the text; "needs_review" could not be read confidently. */
  validationStatus: "extracted" | "needs_review";
  /** Why it needs review, shown to the user rather than hidden (§30, §45). */
  reviewReason?: string;
}

/** Units we will promote a number for. Order matters: longest first, so "kPa" wins over "Pa". */
const UNIT_ALTERNATION = [
  "°C", "µm", "mPa", "MPa", "kPa", "kHz", "kW", "kV", "mV", "mA", "kN", "kg", "mg", "ml", "mm", "cm", "km",
  "Hz", "Pa", "bar", "hours", "hour", "days", "day", "min", "sec", "kn",
  "%", "V", "A", "W", "N", "L", "l", "g", "m", "s", "h", "K", "t",
].join("|");

/**
 * Constructions that are document metadata, never statistics (§5). Matched
 * against the text immediately preceding a number.
 */
const METADATA_PREFIX = /(?:clause|cl\.|section|sec\.|para(?:graph)?|page|p\.|pp\.|table|figure|fig\.|annex(?:ure)?|part|sec|IS|ISO|IEC|amendment|revision|rev\.)\s*$/i;

/** A standard identifier anywhere in the window, e.g. "IS 15410:2003". */
const STANDARD_ID = /\b(?:IS|ISO|IEC|EN)\s?\d{2,5}(?:\s*\([^)]*\))?(?::\s?\d{4})?/gi;

const NUM = String.raw`-?\d+(?:\.\d+)?`;

/**
 * Ordered patterns. Each captures a quantitative construction with its
 * unit. Ranges and inequalities come first: "≤ 20 kg" must never be read as
 * the bare measurement "20 kg" (§11), because dropping the inequality turns
 * a limit into an observation.
 */
const PATTERNS: { type: StatisticType; re: RegExp; read: (m: RegExpExecArray) => Partial<ExtractedStatistic> }[] = [
  {
    type: "tolerance",
    re: new RegExp(String.raw`(${NUM})\s*(${UNIT_ALTERNATION})?\s*(?:±|\+\/-)\s*(${NUM})\s*(${UNIT_ALTERNATION}|%)`, "gi"),
    read: (m) => ({ value: Number(m[1]), unit: m[2] ?? m[4], statisticType: "tolerance" }),
  },
  {
    type: "range",
    re: new RegExp(String.raw`(?:between\s+)?(${NUM})\s*(?:${UNIT_ALTERNATION})?\s*(?:–|—|-|to|and)\s*(${NUM})\s*(${UNIT_ALTERNATION})`, "gi"),
    read: (m) => ({ min: Number(m[1]), max: Number(m[2]), unit: m[3], statisticType: "range" }),
  },
  {
    type: "maximum",
    re: new RegExp(String.raw`(?:≤|<=|max(?:imum)?(?:\s+of)?|not\s+(?:more|greater)\s+than|up\s+to)\s*(${NUM})\s*(${UNIT_ALTERNATION})`, "gi"),
    read: (m) => ({ max: Number(m[1]), value: Number(m[1]), unit: m[2], statisticType: "maximum" }),
  },
  {
    type: "minimum",
    re: new RegExp(String.raw`(?:≥|>=|min(?:imum)?(?:\s+of)?|not\s+less\s+than|at\s+least)\s*(${NUM})\s*(${UNIT_ALTERNATION})`, "gi"),
    read: (m) => ({ min: Number(m[1]), value: Number(m[1]), unit: m[2], statisticType: "minimum" }),
  },
  {
    type: "percentage",
    re: new RegExp(String.raw`(${NUM})\s*%`, "gi"),
    read: (m) => ({ value: Number(m[1]), unit: "%", statisticType: "percentage" }),
  },
  {
    type: "measurement",
    re: new RegExp(String.raw`(${NUM})\s*(${UNIT_ALTERNATION})\b`, "gi"),
    read: (m) => ({ value: Number(m[1]), unit: m[2], statisticType: "measurement" }),
  },
];

/** Counts need an explicit noun — a bare "10" is not a sample size. */
const COUNT_PATTERN = new RegExp(
  String.raw`\b(sample size|number of samples|no\.\s*of\s*samples|sample|specimens?|units?|tests?|cycles?)\s*(?:of|:|=)?\s*(\d{1,4})\b|\b(\d{1,4})\s+(samples?|specimens?|units?|cycles?)\b`,
  "gi",
);

/** The words immediately before a value, used as its parameter name. */
function readParameter(text: string, at: number): string | null {
  const before = text.slice(Math.max(0, at - 90), at);
  // "Rated voltage:" / "Tensile strength shall be" -> "Rated voltage"
  const labelled = /([A-Za-z][A-Za-z\s/()-]{2,60}?)\s*(?::|shall\s+be|shall\s+not\s+be|is|of|=)\s*$/i.exec(before);
  if (labelled) return labelled[1].trim().replace(/\s+/g, " ");
  const trailing = /([A-Za-z][A-Za-z\s/()-]{2,40})\s*$/.exec(before);
  return trailing ? trailing[1].trim().replace(/\s+/g, " ") : null;
}

function isMetadataContext(text: string, at: number): boolean {
  const before = text.slice(Math.max(0, at - 24), at);
  if (METADATA_PREFIX.test(before)) return true;
  // Inside a standard identifier, e.g. the "15410" of "IS 15410:2003".
  STANDARD_ID.lastIndex = 0;
  const window = text.slice(Math.max(0, at - 24), at + 24);
  const offset = at - Math.max(0, at - 24);
  let m: RegExpExecArray | null;
  while ((m = STANDARD_ID.exec(window)) !== null) {
    if (offset >= m.index && offset < m.index + m[0].length) return true;
  }
  return false;
}

/** A four-digit number reading as a year is a date, not a measurement. */
function looksLikeYear(value: number, unit: string | null): boolean {
  return !unit && Number.isInteger(value) && value >= 1900 && value <= 2100;
}

export interface ExtractOptions {
  page?: number | null;
  section?: string | null;
  clause?: string | null;
}

/**
 * Extracts statistics from one passage of document text.
 *
 * Overlaps are resolved by pattern order: a span already claimed by a
 * tolerance or range is not re-read as a bare measurement, so "10–20 kg"
 * yields one range rather than two measurements.
 */
export function extractStatistics(text: string, options: ExtractOptions = {}): ExtractedStatistic[] {
  const claimed: [number, number][] = [];
  const out: ExtractedStatistic[] = [];

  const overlaps = (start: number, end: number) =>
    claimed.some(([s, e]) => start < e && end > s);

  for (const { re, read } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (overlaps(start, end)) continue;
      if (isMetadataContext(text, start)) continue;

      const partial = read(m);
      const unit = partial.unit ?? null;
      if (partial.value !== undefined && partial.value !== null && looksLikeYear(partial.value, unit)) continue;

      claimed.push([start, end]);
      const dimension = unitDimension(unit ?? undefined);
      const normalised =
        partial.value !== undefined && partial.value !== null && unit ? normalise(partial.value, unit) : null;

      const stat: ExtractedStatistic = {
        parameter: readParameter(text, start),
        displayValue: m[0].trim(),
        value: partial.value ?? null,
        unit,
        min: partial.min,
        max: partial.max,
        statisticType: partial.statisticType ?? "other",
        dimension,
        normalizedValue: normalised?.value,
        normalizedUnit: normalised?.unit,
        source: { ...options, excerpt: excerptAround(text, start, end) },
        validationStatus: "extracted",
      };

      // A range whose bounds are inverted was misread — flag, never "fix" (§57).
      if (stat.min !== undefined && stat.max !== undefined && stat.min > stat.max) {
        stat.validationStatus = "needs_review";
        stat.reviewReason = "The range reads as minimum greater than maximum.";
      }
      if (!unit && stat.statisticType !== "count") {
        stat.validationStatus = "needs_review";
        stat.reviewReason = "No unit could be read for this value.";
      }
      out.push(stat);
    }
  }

  // Counts, which have no unit and so need their own explicit construction.
  COUNT_PATTERN.lastIndex = 0;
  let c: RegExpExecArray | null;
  while ((c = COUNT_PATTERN.exec(text)) !== null) {
    const start = c.index;
    const end = start + c[0].length;
    if (overlaps(start, end) || isMetadataContext(text, start)) continue;
    claimed.push([start, end]);
    const value = Number(c[2] ?? c[3]);
    out.push({
      parameter: (c[1] ?? c[4] ?? "count").trim(),
      displayValue: c[0].trim(),
      value,
      unit: null,
      statisticType: "count",
      dimension: "count",
      source: { ...options, excerpt: excerptAround(text, start, end) },
      validationStatus: "extracted",
    });
  }

  return out.sort((a, b) => text.indexOf(a.displayValue) - text.indexOf(b.displayValue));
}

/** A short window around the value, for §28 — not a large copied passage. */
function excerptAround(text: string, start: number, end: number): string {
  const from = Math.max(0, start - 70);
  const to = Math.min(text.length, end + 70);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}
