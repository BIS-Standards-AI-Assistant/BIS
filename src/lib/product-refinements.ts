/**
 * Product-specific exact measurement and specification recommendations generator.
 * Maps searched products into exact physical measurements, ratings, capacities,
 * and standards-distinguishing options (e.g., "1 Litre", "750 ml", "500 ml",
 * "Vacuum Insulated", "Stainless Steel 304" for bottles).
 */

interface ProductRule {
  pattern: RegExp;
  refinements: string[];
}

const PRODUCT_REFINEMENT_RULES: ProductRule[] = [
  {
    pattern: /\b(bottles?|flasks?|water bottles?|sippers?|tumblers?|thermos)\b/i,
    refinements: [
      "1 Litre",
      "750 ml",
      "500 ml",
      "Vacuum Insulated",
      "Stainless Steel 304",
      "Single Wall Flask",
    ],
  },
  {
    pattern: /\b(cookers?|pressure cookers?)\b/i,
    refinements: [
      "3 Litre",
      "5 Litre",
      "2 Litre",
      "Induction Base",
      "Stainless Steel (IS 2347)",
      "Aluminium Body",
    ],
  },
  {
    pattern: /\b(leds?|bulbs?|lamps?|lights?|lightings?|luminaires?|tubes?)\b/i,
    refinements: [
      "9 Watt",
      "12 Watt",
      "15 Watt",
      "B22 Cap Base",
      "6500K Cool Daylight",
      "Self-Ballasted (IS 16102)",
    ],
  },
  {
    pattern: /\b(helmets?|headgear|head protections?)\b/i,
    refinements: [
      "Motorcycle / Two-Wheeler (IS 4151)",
      "Medium (580 mm)",
      "Large (600 mm)",
      "Full Face Helmet",
      "Industrial Safety (IS 2925)",
    ],
  },
  {
    pattern: /\b(wires?|cables?|conductors?|cords?)\b/i,
    refinements: [
      "1.5 sq mm",
      "2.5 sq mm",
      "4.0 sq mm",
      "1100V Grade",
      "Flame Retardant (FR)",
      "Copper Conductor (IS 694)",
    ],
  },
  {
    pattern: /\b(pipes?|conduits?|tubings?|pvc|cpvc|upvc|hdpe)\b/i,
    refinements: [
      "20 mm (1/2 inch)",
      "25 mm (3/4 inch)",
      "50 mm (2 inch)",
      "110 mm",
      "6 kgf/cm² Pressure",
      "Potable Water Supply (IS 4985)",
    ],
  },
  {
    pattern: /\b(cements?|concretes?|mortars?)\b/i,
    refinements: [
      "53 Grade (OPC)",
      "43 Grade (OPC)",
      "PPC (Fly Ash based)",
      "50 kg Bag",
      "White Portland Cement",
    ],
  },
  {
    pattern: /\b(steels?|tmts?|rebars?|iron bars?|reinforcements?)\b/i,
    refinements: [
      "10 mm Diameter",
      "12 mm Diameter",
      "16 mm Diameter",
      "Fe 500D Grade (High Ductility)",
      "Fe 550D Grade",
      "TMT Rebar (IS 1786)",
    ],
  },
  {
    pattern: /\b(drinking waters?|mineral waters?|packaged waters?)\b/i,
    refinements: [
      "1 Litre Bottle",
      "500 ml Bottle",
      "20 Litre Bulk Jar",
      "Packaged Drinking Water (IS 14543)",
      "Natural Mineral Water (IS 13428)",
    ],
  },
  {
    pattern: /\b(acs?|air conditioners?|coolings?|split ac)\b/i,
    refinements: [
      "1.5 Ton",
      "1.0 Ton",
      "2.0 Ton",
      "5-Star Inverter",
      "Split AC (IS 1391 Part 2)",
    ],
  },
  {
    pattern: /\b(geysers?|water heaters?)\b/i,
    refinements: [
      "15 Litre",
      "25 Litre",
      "10 Litre",
      "3 Litre Instant",
      "8 Bar Pressure Rating",
      "Storage Geyser (IS 2082)",
    ],
  },
  {
    pattern: /\b(refrigerators?|fridges?)\b/i,
    refinements: [
      "190 Litre",
      "260 Litre",
      "350 Litre",
      "Double Door Frost Free",
      "5-Star Inverter",
    ],
  },
  {
    pattern: /\b(stoves?|gas stoves?|lpg|burners?)\b/i,
    refinements: [
      "2 Burner",
      "3 Burner",
      "4 Burner",
      "Stainless Steel Body",
      "Toughened Glass Top",
      "LPG Stove (IS 4246)",
    ],
  },
  {
    pattern: /\b(plywoods?|woods?|timbers?|boards?|blockboards?)\b/i,
    refinements: [
      "18 mm Thickness",
      "12 mm Thickness",
      "19 mm Thickness",
      "BWR Grade (IS 303)",
      "Marine Grade (IS 710)",
    ],
  },
  {
    pattern: /\b(golds?|silvers?|jeweller(?:y|ies)|jewelry|hallmarks?)\b/i,
    refinements: [
      "22 Karat (916 Purity)",
      "18 Karat (750 Purity)",
      "14 Karat (585 Purity)",
      "Hallmarked Jewellery",
      "Silver 925 Hallmarked",
    ],
  },
  {
    pattern: /\b(batter(?:y|ies)|cells?|accumulators?)\b/i,
    refinements: [
      "150 Ah Capacity",
      "200 Ah Capacity",
      "100 Ah Capacity",
      "12 Volt",
      "Lithium-Ion Pack (IS 16046)",
    ],
  },
  {
    pattern: /\b(irons?|electric irons?)\b/i,
    refinements: [
      "1000 Watt",
      "750 Watt",
      "1200 Watt",
      "Dry Electric Iron (IS 366)",
      "Steam Electric Iron",
    ],
  },
  {
    pattern: /\b(fans?|ceiling fans?)\b/i,
    refinements: [
      "1200 mm Sweep",
      "1400 mm Sweep",
      "900 mm Sweep",
      "BLDC Motor (28W)",
      "3-Blade (IS 374)",
    ],
  },
  {
    pattern: /\b(shoes?|boots?|footwears?)\b/i,
    refinements: [
      "Size 8 (UK/India)",
      "Size 9 (UK/India)",
      "Size 10 (UK/India)",
      "Steel Toe Cap (IS 15298)",
      "Electrical Hazard Resistant",
    ],
  },
  {
    pattern: /\b(tvs?|televisions?|led tvs?)\b/i,
    refinements: [
      "32 Inch",
      "43 Inch",
      "55 Inch",
      "4K Ultra HD",
      "Smart TV (IS 18112)",
    ],
  },
  {
    pattern: /\b(solar|pv|photovoltaics?|solar panels?)\b/i,
    refinements: [
      "440W to 550W Module",
      "Monocrystalline Perc",
      "24 Volt Solar System",
      "Grid-Tie Inverter",
      "IS 14286 Certified",
    ],
  },
  {
    pattern: /\b(extinguishers?|fire extinguishers?)\b/i,
    refinements: [
      "4 kg Capacity",
      "6 kg Capacity",
      "2 kg Capacity",
      "ABC Dry Powder (IS 15683)",
      "CO2 Type",
    ],
  },
  {
    pattern: /\b(sanitary|toilets?|wash basins?|tiles?|ceramics?)\b/i,
    refinements: [
      "600 x 600 mm (Tiles)",
      "600 x 1200 mm (Tiles)",
      "Wall Hung Water Closet",
      "Table Top Wash Basin",
      "Vitreous China (IS 2556)",
    ],
  },
  {
    pattern: /\b(toys?|dolls?|board games?)\b/i,
    refinements: [
      "Under 36 Months",
      "Age 3+ Years",
      "Plastic Non-Electric (IS 9873)",
      "Battery Operated (IS 15644)",
    ],
  },
];

/**
 * Filter out forbidden generic non-actionable labels.
 */
const FORBIDDEN_GENERIC_PATTERNS = [
  /^intended\s+use$/i,
  /^material(\s+grade)?$/i,
  /^size(\s+or\s+capacity)?$/i,
  /^capacity$/i,
  /^target\s+age(\s+group)?$/i,
  /^application$/i,
  /^specification$/i,
];

export function isForbiddenGeneric(item: string): boolean {
  const trimmed = item.trim();
  return FORBIDDEN_GENERIC_PATTERNS.some((p) => p.test(trimmed));
}

export interface CandidateStandardHint {
  standardNumber?: string | null;
  title?: string | null;
}

/**
 * Derives concrete product-specific measurements, capacities, and specs for a query.
 */
export function getProductRefinements(
  query: string,
  product?: string | null,
  candidates?: CandidateStandardHint[],
): string[] {
  const textToMatch = `${query} ${product ?? ""}`.trim();

  // 1. Check direct product rules
  for (const rule of PRODUCT_REFINEMENT_RULES) {
    if (rule.pattern.test(textToMatch)) {
      return rule.refinements.slice(0, 5);
    }
  }

  // 2. Derive from candidate standards if available
  if (candidates && candidates.length > 0) {
    const derived: string[] = [];
    for (const c of candidates) {
      if (c.standardNumber && c.title) {
        const cleanTitle = c.title
          .replace(/specification for\s*/i, "")
          .replace(/requirements for\s*/i, "")
          .trim();
        if (cleanTitle && cleanTitle.length < 35 && !derived.includes(cleanTitle)) {
          derived.push(`${cleanTitle} (${c.standardNumber})`);
        } else if (c.standardNumber && !derived.includes(c.standardNumber)) {
          derived.push(`${c.standardNumber} Standard`);
        }
      }
    }
    if (derived.length >= 2) {
      return derived.slice(0, 4);
    }
  }

  // 3. Fallback to common physical measurements / classifications
  return [
    "Standard Size / Capacity",
    "Commercial Grade",
    "Domestic Use",
    "Mandatory ISI Scheme-I",
  ];
}
