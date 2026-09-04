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
  l: { dimension: "volume", factor: 1000, base: "ml" },
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
  "°c": { dimension: "temperature", factor: 1, base: "°C" },
  c: { dimension: "temperature", factor: 1, base: "°C" },
  k: { dimension: "temperature", factor: 1, base: "°C", offset: -273.15 },
  // electrical
  mv: { dimension: "voltage", factor: 0.001, base: "V" },
  v: { dimension: "voltage", factor: 1, base: "V" },
  kv: { dimension: "voltage", factor: 1000, base: "V" },
  ma: { dimension: "current", factor: 0.001, base: "A" },
  a: { dimension: "current", factor: 1, base: "A" },
  w: { dimension: "power", factor: 1, base: "W" },
  kw: { dimension: "power", factor: 1000, base: "W" },
  hz: { dimension: "frequency", factor: 1, base: "Hz" },
  khz: { dimension: "frequency", factor: 1000, base: "Hz" },
  // pressure / force
  pa: { dimension: "pressure", factor: 1, base: "Pa" },
  kpa: { dimension: "pressure", factor: 1000, base: "Pa" },
  mpa: { dimension: "pressure", factor: 1_000_000, base: "Pa" },
  bar: { dimension: "pressure", factor: 100_000, base: "Pa" },
  n: { dimension: "force", factor: 1, base: "N" },
  kn: { dimension: "force", factor: 1000, base: "N" },
  // dimensionless
  "%": { dimension: "percentage", factor: 1, base: "%" },
};

export function unitDimension(unit: string | undefined): Dimension {
  if (!unit) return "unknown";
  return UNITS[unit.trim().toLowerCase()]?.dimension ?? "unknown";
}

export interface Normalised {
  value: number;
  unit: string;
}

/**
 * Converts to the dimension's base unit. Returns null for an unknown unit
 * rather than guessing — an unrecognised unit must stay unnormalised, not
 * be silently treated as dimensionless.
 */
export function normalise(value: number, unit: string | undefined): Normalised | null {
  if (!unit) return null;
  const def = UNITS[unit.trim().toLowerCase()];
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
