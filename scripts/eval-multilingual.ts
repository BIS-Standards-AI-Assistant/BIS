/**
 * PRD §9 — multilingual parity evaluation.
 *
 *   "Multilingual parity: Same query in English and Hindi returns
 *    equivalent grounded answers."
 *
 * WHAT "EQUIVALENT" MEANS HERE, and why it is not string similarity. PRD
 * §7 is explicit that the corpus and vector index are English-only, that a
 * Hindi query is translated to English before retrieval, and that
 * "citations are always shown in their original form (actual IS number and
 * title as BIS publishes it), never translated. Only the surrounding
 * explanation text is in Hindi." So the prose is *supposed* to differ
 * between the two runs; the thing that must not differ is what the system
 * grounded its answer in. Parity is therefore measured on:
 *
 *   1. the set of primary recommended standard numbers  (must match exactly)
 *   2. the outcome                                      (both answer, or both refuse)
 *
 * and separately checked for two contract violations §7 warns about:
 *
 *   3. a Hindi run must actually have been detected as Hindi and translated
 *   4. a Hindi run's cited standard numbers must still be in Latin script,
 *      i.e. the identifiers were not translated or transliterated
 *
 * The Hindi queries below are translations of the English ones in
 * data/evaluation/refusal-calibration-queries.json, kept in this file
 * rather than that one because they exist to test the language layer, not
 * the corpus boundary.
 *
 * Usage: npm run eval:multilingual
 * Requires DATABASE_URL. Translation is best-effort: with no LLM provider
 * configured, translateQueryToEnglish falls back to the original text, and
 * this evaluation will report that rather than silently passing.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { runQueryPipeline } from "@/lib/query-pipeline";

interface ParityCase {
  id: string;
  en: string;
  hi: string;
}

const CASES: ParityCase[] = [
  { id: "ML1", en: "What are the requirements for packaged drinking water?", hi: "पैकेज्ड पेयजल के लिए क्या आवश्यकताएं हैं?" },
  { id: "ML2", en: "stainless steel cookware specification", hi: "स्टेनलेस स्टील के बर्तनों का विनिर्देश" },
  { id: "ML3", en: "protective helmet for two wheeler riders", hi: "दोपहिया वाहन चालकों के लिए सुरक्षा हेलमेट" },
  { id: "ML4", en: "safety requirements for toys", hi: "खिलौनों के लिए सुरक्षा आवश्यकताएं" },
  { id: "ML5", en: "unplasticized PVC pipes for water supply", hi: "जल आपूर्ति के लिए अनप्लास्टिसाइज्ड पीवीसी पाइप" },
];

/**
 * Free provider tiers are rate-limited per MINUTE, not just per day — the
 * configured Gemini free tier allows 20 generate_content requests/minute,
 * and each pipeline run makes up to three (translate, intent, synthesis).
 * An unpaced evaluation therefore exhausts the quota partway through and
 * the remaining queries silently degrade to the no-provider path, which
 * looks exactly like a product failure in the results. That happened on
 * the first run of this suite: every Hindi query reported
 * translated=false and the parity score read 0/5 for what was actually a
 * spent quota. Pacing keeps a long run honest.
 *
 * A single 429 also puts the provider in a 60s cooldown
 * (COOLDOWN_MS in src/lib/providers/router.ts). Translation is the first
 * call each request makes, so on a rate-limited free tier it is the call
 * that absorbs that cooldown while later calls in the same request find it
 * expired — which is exactly how a quota problem disguises itself as
 * "translation is broken". For a run that actually measures parity on a
 * free tier, pace above the cooldown: EVAL_PACE_MS=65000.
 *
 * Override with EVAL_PACE_MS=0 when running against a paid provider.
 */
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 6000);
const pace = () => new Promise((r) => setTimeout(r, PACE_MS));

interface Side {
  outcome: string;
  standards: string[];
  language?: string;
  translated?: boolean;
  answerLanguage?: string;
  latencyMs: number;
  answerPreview: string;
}

async function runSide(query: string, language: "en" | "hi"): Promise<Side> {
  const started = Date.now();
  const r = (await runQueryPipeline(query, { language })) as {
    outcome?: string;
    answer?: string;
    language?: string;
    translated?: boolean;
    answerLanguage?: string;
    recommendations?: Array<{ standardNumber: string | null; primaryRecommendation?: boolean }>;
  };
  return {
    outcome: r.outcome ?? "unknown",
    standards: (r.recommendations ?? [])
      .filter((rec) => rec.primaryRecommendation)
      .map((rec) => rec.standardNumber)
      .filter((s): s is string => s !== null)
      .sort(),
    language: r.language,
    translated: r.translated,
    answerLanguage: r.answerLanguage,
    latencyMs: Date.now() - started,
    answerPreview: (r.answer ?? "").slice(0, 90),
  };
}

/** A BIS identifier must survive translation unchanged — "IS 14543:2016", not "आईएस". */
function identifiersStayLatin(standards: string[]): boolean {
  return standards.every((s) => /^[\x20-\x7E]+$/.test(s));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — this evaluation needs the live index.");
    process.exit(1);
  }

  console.log("PRD §9 — multilingual parity (English vs Hindi)\n");
  const rows = [];
  let parityPass = 0;
  let sharedAnyPass = 0;

  for (const c of CASES) {
    await pace();
    const en = await runSide(c.en, "en");
    await pace();
    const hi = await runSide(c.hi, "hi");

    const sameStandards =
      en.standards.length === hi.standards.length && en.standards.every((s, i) => s === hi.standards[i]);
    const sameOutcome = en.outcome === hi.outcome;
    const pass = sameStandards && sameOutcome;
    if (pass) parityPass++;

    // Strict set equality is the headline metric, but on its own it hides
    // the difference between "Hindi found something else entirely" and
    // "Hindi found the right standard plus or minus a peer". Measured
    // 2026-09-09, the Hindi side usually retrieves the correct standard
    // and differs only in the surrounding candidate set, because
    // translation rewords the query and reranking then sees a slightly
    // different field. That is a materially weaker failure than a wrong
    // answer, so it is recorded rather than averaged away.
    const overlap = en.standards.filter((s) => hi.standards.includes(s));
    const enCoveredByHi = en.standards.length > 0 && overlap.length === en.standards.length;
    const anyShared = overlap.length > 0;
    if (anyShared) sharedAnyPass++;

    const latinIds = identifiersStayLatin(hi.standards);
    const detectedHindi = hi.language === "hi";
    const answeredInHindi = hi.answerLanguage === "hi";

    rows.push({ id: c.id, en: { query: c.en, ...en }, hi: { query: c.hi, ...hi }, sameStandards, sameOutcome, pass, overlap, enCoveredByHi, anyShared, latinIds, detectedHindi, answeredInHindi });

    console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.id}  "${c.en.slice(0, 40)}"`);
    console.log(`          EN  ${en.outcome.padEnd(30)} [${en.standards.join(", ") || "-"}]  ${en.latencyMs}ms`);
    console.log(`          HI  ${hi.outcome.padEnd(30)} [${hi.standards.join(", ") || "-"}]  ${hi.latencyMs}ms`);
    console.log(
      `          detected=${hi.language ?? "?"} translated=${hi.translated ?? "?"} answerLang=${hi.answerLanguage ?? "?"} identifiersLatin=${latinIds}`,
    );
    if (!sameStandards) {
      console.log(`          ^ standards differ: EN [${en.standards.join(", ")}] vs HI [${hi.standards.join(", ")}]`);
      console.log(`            shared: [${overlap.join(", ") || "none"}]`);
    }
  }

  // Reported separately from parity, because they are different failures
  // with different fixes: a spent free-tier quota is an infrastructure
  // problem, a genuine parity gap is a product one. Conflating them is how
  // the first run of this suite read as 0/5 product failure.
  const translationFailures = rows.filter((r) => !r.hi.translated);
  const detectionFailures = rows.filter((r) => !r.detectedHindi);
  const identifierFailures = rows.filter((r) => !r.latinIds);
  const untranslatedAnswers = rows.filter((r) => !r.answeredInHindi);

  console.log("\n--- Summary ---");
  console.log(`  strict parity (identical primary standards + same outcome): ${parityPass}/${CASES.length}`);
  console.log(`  partial parity (Hindi retrieved at least one of the English standards): ${sharedAnyPass}/${CASES.length}`);
  console.log(`  Hindi correctly detected: ${CASES.length - detectionFailures.length}/${CASES.length}`);
  console.log(`  Hindi actually translated to English before retrieval: ${CASES.length - translationFailures.length}/${CASES.length}`);
  if (translationFailures.length > 0) {
    console.log(
      [
        "    NOTE: an untranslated Hindi query is embedded as Devanagari against an",
        "    English-only index, so its retrieval is near-noise and a parity failure",
        "    here says nothing about parity — this run did NOT measure it.",
        "",
        "    Most likely cause: a rate-limited provider. One 429 puts the provider in",
        "    a 60s cooldown (COOLDOWN_MS in src/lib/providers/router.ts), and",
        "    translation is the FIRST call each request makes, so it is the call that",
        "    consistently absorbs that cooldown. Re-run with pacing above the cooldown:",
        "      EVAL_PACE_MS=65000 npm run eval:multilingual",
      ].join("\n"),
    );
  }
  console.log(`  answers written in Hindi: ${CASES.length - untranslatedAnswers.length}/${CASES.length}`);
  console.log(`  identifiers left untranslated (PRD §7): ${CASES.length - identifierFailures.length}/${CASES.length}`);

  const outPath = path.join(__dirname, "..", "data", "evaluation", "multilingual-parity-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note:
          "Parity is measured on the primary recommended standard numbers and the outcome, " +
          "not on answer text — PRD §7 requires the prose to be in the query's language while " +
          "citations stay in their published Latin-script form.",
        summary: {
          parityPass,
          sharedAnyPass,
          total: CASES.length,
          hindiDetected: CASES.length - detectionFailures.length,
          hindiTranslated: CASES.length - translationFailures.length,
          answeredInHindi: CASES.length - untranslatedAnswers.length,
          identifiersUntranslated: CASES.length - identifierFailures.length,
        },
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);

  if (parityPass < CASES.length || identifierFailures.length > 0) process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
