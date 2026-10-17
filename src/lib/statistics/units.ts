/**
 * Unit normalisation with dimensional safety (§9, §10).
 *
 * Two rules govern everything here:
 *
 * 1. **The original is never destroyed.** A normalised value is an
 *    addition, never a replacement — "230 V ± 10%" as written is the
 *    compliance-relevant text, and a UI that shows only the normalised
 *    number has lost the requirement.
 * 2. **Conversion never crosses dimensions.** Volts do not become amps and
 *    °C does not become kg. Every unit belongs to exactly one dimension,
 *    and a conversion between dimensions is impossible by construction
 *    rather than by convention.
 */

export type Dimension =
  | "length" | "mass" | "volume" | "time" | "temperature"
  | "voltage" | "current" | "power" | "pressure" | "frequency"
  | "force" | "percentage" | "currency" | "count" | "unknown";

interface UnitDef {
  dimension: Dimension;
  /** Multiply by this to reach the dimension's base unit. */
  factor: number;
  base: string;
  /** Temperature is affine, not linear — handled separately. */
  offset?: number;
}

/**
 * Keyed by the unit's real, case-sensitive symbol. Case carries meaning in
 * SI prefixes — "mPa" is a millipascal and "MPa" a megapascal, a factor of
 * 10⁹ apart — so a lookup that lowercased first read every viscosity in
 * mPa·s as a megapascal pressure.
 */
const UNITS: Record<string, UnitDef> = {
  // length -> mm
  mm: { dimension: "length", factor: 1, base: "mm" },
  cm: { dimension: "length", factor: 10, base: "mm" },
  m: { dimension: "length", factor: 1000, base: "mm" },
  km: { dimension: "length", factor: 1_000_000, base: "mm" },
  µm: { dimension: "length", factor: 0.001, base: "mm" },
  um: { dimension: "length", factor: 0.001, base: "mm" },
  // mass -> g
  mg: { dimension: "mass", factor: 0.001, base: "g" },
  g: { dimension: "mass", factor: 1, base: "g" },
  kg: { dimension: "mass", factor: 1000, base: "g" },
  t: { dimension: "mass", factor: 1_000_000, base: "g" },
  // volume -> ml
  ml: { dimension: "volume", factor: 1, base: "ml" },
  mL: { dimension: "volume", factor: 1, base: "ml" },
  l: { dimension: "volume", factor: 1000, base: "ml" },
  L: { dimension: "volume", factor: 1000, base: "ml" },
  // time -> s
  s: { dimension: "time", factor: 1, base: "s" },
  sec: { dimension: "time", factor: 1, base: "s" },
  min: { dimension: "time", factor: 60, base: "s" },
  h: { dimension: "time", factor: 3600, base: "s" },
  hr: { dimension: "time", factor: 3600, base: "s" },
  hour: { dimension: "time", factor: 3600, base: "s" },
  hours: { dimension: "time", factor: 3600, base: "s" },
  day: { dimension: "time", factor: 86400, base: "s" },
  days: { dimension: "time", factor: 86400, base: "s" },
  // temperature -> °C (affine)
  "°C": { dimension: "temperature", factor: 1, base: "°C" },
  C: { dimension: "temperature", factor: 1, base: "°C" },
  K: { dimension: "temperature", factor: 1, base: "°C", offset: -273.15 },
  // electrical
  mV: { dimension: "voltage", factor: 0.001, base: "V" },
  V: { dimension: "voltage", factor: 1, base: "V" },
  kV: { dimension: "voltage", factor: 1000, base: "V" },
  MV: { dimension: "voltage", factor: 1_000_000, base: "V" },
  mA: { dimension: "current", factor: 0.001, base: "A" },
  A: { dimension: "current", factor: 1, base: "A" },
  mW: { dimension: "power", factor: 0.001, base: "W" },
  W: { dimension: "power", factor: 1, base: "W" },
  kW: { dimension: "power", factor: 1000, base: "W" },
  MW: { dimension: "power", factor: 1_000_000, base: "W" },
  Hz: { dimension: "frequency", factor: 1, base: "Hz" },
  kHz: { dimension: "frequency", factor: 1000, base: "Hz" },
  MHz: { dimension: "frequency", factor: 1_000_000, base: "Hz" },
  // pressure / force
  mPa: { dimension: "pressure", factor: 0.001, base: "Pa" },
  Pa: { dimension: "pressure", factor: 1, base: "Pa" },
  kPa: { dimension: "pressure", factor: 1000, base: "Pa" },
  MPa: { dimension: "pressure", factor: 1_000_000, base: "Pa" },
  bar: { dimension: "pressure", factor: 100_000, base: "Pa" },
  N: { dimension: "force", factor: 1, base: "N" },
  kN: { dimension: "force", factor: 1000, base: "N" },
  // dimensionless
  "%": { dimension: "percentage", factor: 1, base: "%" },
};

/** Every symbol that shares a lowercase spelling, for case-insensitive fallback. */
const BY_LOWERCASE = new Map<string, UnitDef[]>();
for (const [symbol, def] of Object.entries(UNITS)) {
  const key = symbol.toLowerCase();
  BY_LOWERCASE.set(key, [...(BY_LOWERCASE.get(key) ?? []), def]);
}

/**
 * The symbols a written unit could mean. An exact match is the unit;
 * otherwise a case-insensitive match covers documents set in capitals
 * ("KG", "MM") — and returns every candidate, so a spelling like "mpa"
 * that could be either a milli- or a mega- unit is reported as ambiguous
 * rather than resolved by guessing.
 */
function candidates(unit: string): UnitDef[] {
  const trimmed = unit.trim();
  const exact = Object.hasOwn(UNITS, trimmed) ? UNITS[trimmed] : undefined;
  if (exact) return [exact];
  return BY_LOWERCASE.get(trimmed.toLowerCase()) ?? [];
}

const sameUnit = (a: UnitDef, b: UnitDef) =>
  a.dimension === b.dimension && a.factor === b.factor && a.base === b.base && a.offset === b.offset;

/** The single unit a symbol denotes, or null when it is unknown or ambiguous. */
function lookup(unit: string): UnitDef | null {
  const [first, ...rest] = candidates(unit);
  // "ML" matches both "ml" and "mL", which are the same unit — not ambiguous.
  return first && rest.every((d) => sameUnit(first, d)) ? first : null;
}

export function unitDimension(unit: string | undefined): Dimension {
  if (!unit) return "unknown";
  const found = candidates(unit);
  // "mpa" is ambiguous in magnitude but not in dimension: both readings are pressures.
  const dimension = found[0]?.dimension;
  return dimension && found.every((d) => d.dimension === dimension) ? dimension : "unknown";
}

export interface Normalised {
  value: number;
  unit: string;
}

/**
 * Converts to the dimension's base unit. Returns null for an unknown unit
 * rather than guessing — an unrecognised unit must stay unnormalised, not
 * be silently treated as dimensionless. An ambiguous one ("mpa") is left
 * unnormalised too, since its magnitude cannot be known.
 */
export function normalise(value: number, unit: string | undefined): Normalised | null {
  if (!unit) return null;
  const def = lookup(unit);
  if (!def) return null;
  if (def.offset !== undefined) return { value: value + def.offset, unit: def.base };
  return { value: value * def.factor, unit: def.base };
}

/** Whether two units may be compared at all (§10). */
export function areComparable(a: string | undefined, b: string | undefined): boolean {
  const da = unitDimension(a);
  const db = unitDimension(b);
  return da !== "unknown" && da === db;
}

/**
 * Compares two quantities, refusing across dimensions. Returns null when
 * the comparison would be meaningless, so callers cannot accidentally
 * render "47 °C exceeds 5 A".
 */
export function compareQuantities(
  a: { value: number; unit?: string },
  b: { value: number; unit?: string },
): number | null {
  if (!areComparable(a.unit, b.unit)) return null;
  const na = normalise(a.value, a.unit);
  const nb = normalise(b.value, b.unit);
  if (!na || !nb) return null;
  return na.value - nb.value;
}
