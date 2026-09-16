/**
 * PRD §9 — multilingual parity evaluation.
 *
 *   "Multilingual parity: Same query in English and [language] returns
 *    equivalent grounded answers."
 *
 * WHAT "EQUIVALENT" MEANS HERE, and why it is not string similarity. PRD
 * §7 is explicit that the corpus and vector index are English-only, that a
 * non-English query is translated to English before retrieval, and that
 * "citations are always shown in their original form (actual IS number and
 * title as BIS publishes it), never translated. Only the surrounding
 * explanation text is in [language]." So the prose is *supposed* to differ
 * between runs; the thing that must not differ is what the system grounded
 * its answer in. Parity is therefore measured on:
 *
 *   1. the set of primary recommended standard numbers  (must match exactly)
 *   2. the outcome                                      (both answer, or both refuse)
 *
 * and separately checked for two contract violations §7 warns about:
 *
 *   3. a non-English run must actually have been detected as that language and translated
 *   4. a non-English run's cited standard numbers must still be in Latin script,
 *      i.e. the identifiers were not translated or transliterated
 *
 * Originally English/Hindi only; extended to Marathi and Bengali
 * (2026-09-16) once src/lib/language.ts's AnswerLanguage widened to include
 * them. Each case now carries one baseline English query plus a translation
 * per fully-supported non-English language — the English side runs once per
 * case and is compared against every language, not re-run per pair, so
 * adding a language is O(1) extra queries per case, not O(languages²).
 *
 * The translated queries below are LLM-authored, mirroring the English
 * ones — same disclosure as the Marathi/Bengali refusal copy in
 * src/lib/refusal.ts: flagged for a native-speaker spot-check, not assumed
 * perfect.
 *
 * Usage: npm run eval:multilingual
 * Requires DATABASE_URL. Translation is best-effort: with no LLM provider
 * configured, translateQueryToEnglish falls back to the original text, and
 * this evaluation will report that rather than silently passing.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { runQueryPipeline } from "@/lib/query-pipeline";
import type { AnswerLanguage } from "@/lib/language";

/** Every fully-supported language other than English — see src/lib/language.ts. */
const NON_ENGLISH_LANGUAGES = ["hi", "mr", "bn"] as const;
type NonEnglishLanguage = (typeof NON_ENGLISH_LANGUAGES)[number];

const LANGUAGE_LABEL: Record<NonEnglishLanguage, string> = { hi: "Hindi", mr: "Marathi", bn: "Bengali" };

interface ParityCase {
  id: string;
  en: string;
  translations: Record<NonEnglishLanguage, string>;
}

const CASES: ParityCase[] = [
  {
    id: "ML1",
    en: "What are the requirements for packaged drinking water?",
    translations: {
      hi: "पैकेज्ड पेयजल के लिए क्या आवश्यकताएं हैं?",
      mr: "पॅकेज्ड पिण्याच्या पाण्यासाठी काय आवश्यकता आहेत?",
      bn: "প্যাকেজড পানীয় জলের জন্য কী কী প্রয়োজনীয়তা রয়েছে?",
    },
  },
  {
    id: "ML2",
    en: "stainless steel cookware specification",
    translations: {
      hi: "स्टेनलेस स्टील के बर्तनों का विनिर्देश",
      mr: "स्टेनलेस स्टील भांड्यांचे तपशील",
      bn: "স্টেইনলেস স্টিল রান্নার বাসনের স্পেসিফিকেশন",
    },
  },
  {
    id: "ML3",
    en: "protective helmet for two wheeler riders",
    translations: {
      hi: "दोपहिया वाहन चालकों के लिए सुरक्षा हेलमेट",
      mr: "दुचाकी चालकांसाठी संरक्षक हेल्मेट",
      bn: "দুই চাকার যানবাহন চালকদের জন্য সুরক্ষামূলক হেলমেট",
    },
  },
  {
    id: "ML4",
    en: "safety requirements for toys",
    translations: {
      hi: "खिलौनों के लिए सुरक्षा आवश्यकताएं",
      mr: "खेळण्यांसाठी सुरक्षा आवश्यकता",
      bn: "খেলনার জন্য নিরাপত্তা প্রয়োজনীয়তা",
    },
  },
  {
    id: "ML5",
    en: "unplasticized PVC pipes for water supply",
    translations: {
      hi: "जल आपूर्ति के लिए अनप्लास्टिसाइज्ड पीवीसी पाइप",
      mr: "पाणीपुरवठ्यासाठी अनप्लास्टिसाइज्ड पीव्हीसी पाईप्स",
      bn: "জল সরবরাহের জন্য আনপ্লাস্টিসাইজড পিভিসি পাইপ",
    },
  },
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

async function runSide(query: string, language: AnswerLanguage): Promise<Side> {
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

/** A BIS identifier must survive translation unchanged — "IS 14543:2016", not a transliteration. */
function identifiersStayLatin(standards: string[]): boolean {
  return standards.every((s) => /^[\x20-\x7E]+$/.test(s));
}

interface Row {
  id: string;
  language: NonEnglishLanguage;
  en: { query: string } & Side;
  other: { query: string } & Side;
  sameStandards: boolean;
  sameOutcome: boolean;
  pass: boolean;
  overlap: string[];
  enCoveredByOther: boolean;
  anyShared: boolean;
  latinIds: boolean;
  detected: boolean;
  answeredInLanguage: boolean;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — this evaluation needs the live index.");
    process.exit(1);
  }

  console.log(`PRD §9 — multilingual parity (English vs ${NON_ENGLISH_LANGUAGES.map((l) => LANGUAGE_LABEL[l]).join("/")})\n`);
  const rows: Row[] = [];

  for (const c of CASES) {
    await pace();
    const en = await runSide(c.en, "en");

    for (const lang of NON_ENGLISH_LANGUAGES) {
      await pace();
      const other = await runSide(c.translations[lang], lang);

      const sameStandards =
        en.standards.length === other.standards.length && en.standards.every((s, i) => s === other.standards[i]);
      const sameOutcome = en.outcome === other.outcome;
      const pass = sameStandards && sameOutcome;

      // Strict set equality is the headline metric, but on its own it hides
      // the difference between "found something else entirely" and "found
      // the right standard plus or minus a peer" — see the original
      // Hindi-only version of this file for the measured rationale. That
      // is a materially weaker failure than a wrong answer, so it is
      // recorded rather than averaged away.
      const overlap = en.standards.filter((s) => other.standards.includes(s));
      const enCoveredByOther = en.standards.length > 0 && overlap.length === en.standards.length;
      const anyShared = overlap.length > 0;

      const latinIds = identifiersStayLatin(other.standards);
      const detected = other.language === lang;
      const answeredInLanguage = other.answerLanguage === lang;

      rows.push({
        id: c.id,
        language: lang,
        en: { query: c.en, ...en },
        other: { query: c.translations[lang], ...other },
        sameStandards,
        sameOutcome,
        pass,
        overlap,
        enCoveredByOther,
        anyShared,
        latinIds,
        detected,
        answeredInLanguage,
      });

      console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.id}/${lang}  "${c.en.slice(0, 40)}"`);
      console.log(`          EN  ${en.outcome.padEnd(30)} [${en.standards.join(", ") || "-"}]  ${en.latencyMs}ms`);
      console.log(`          ${lang.toUpperCase()}  ${other.outcome.padEnd(30)} [${other.standards.join(", ") || "-"}]  ${other.latencyMs}ms`);
      console.log(
        `          detected=${other.language ?? "?"} translated=${other.translated ?? "?"} answerLang=${other.answerLanguage ?? "?"} identifiersLatin=${latinIds}`,
      );
      if (!sameStandards) {
        console.log(`          ^ standards differ: EN [${en.standards.join(", ")}] vs ${lang.toUpperCase()} [${other.standards.join(", ")}]`);
        console.log(`            shared: [${overlap.join(", ") || "none"}]`);
      }
    }
  }

  console.log("\n--- Summary by language ---");
  const perLanguageSummary: Record<string, ReturnType<typeof summarizeLanguage>> = {};
  for (const lang of NON_ENGLISH_LANGUAGES) {
    const langRows = rows.filter((r) => r.language === lang);
    const summary = summarizeLanguage(langRows);
    perLanguageSummary[lang] = summary;

    console.log(`\n  ${LANGUAGE_LABEL[lang]} (${lang}):`);
    console.log(`    strict parity (identical primary standards + same outcome): ${summary.parityPass}/${langRows.length}`);
    console.log(`    partial parity (retrieved at least one of the English standards): ${summary.sharedAnyPass}/${langRows.length}`);
    console.log(`    correctly detected: ${summary.detectedPass}/${langRows.length}`);
    console.log(`    actually translated to English before retrieval: ${summary.translatedPass}/${langRows.length}`);
    if (summary.translatedPass < langRows.length) {
      console.log(
        [
          "      NOTE: an untranslated query is embedded in its own script against an",
          "      English-only index, so its retrieval is near-noise and a parity failure",
          "      here says nothing about parity — this run did NOT measure it.",
          "",
          "      Most likely cause: a rate-limited provider. One 429 puts the provider in",
          "      a 60s cooldown (COOLDOWN_MS in src/lib/providers/router.ts), and",
          "      translation is the FIRST call each request makes, so it is the call that",
          "      consistently absorbs that cooldown. Re-run with pacing above the cooldown:",
          "        EVAL_PACE_MS=65000 npm run eval:multilingual",
        ].join("\n"),
      );
    }
    console.log(`    answers written in ${LANGUAGE_LABEL[lang]}: ${summary.answeredPass}/${langRows.length}`);
    console.log(`    identifiers left untranslated (PRD §7): ${summary.identifierPass}/${langRows.length}`);
  }

  const outPath = path.join(__dirname, "..", "data", "evaluation", "multilingual-parity-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note:
          "Parity is measured on the primary recommended standard numbers and the outcome, " +
          "not on answer text — PRD §7 requires the prose to be in the query's language while " +
          "citations stay in their published Latin-script form. English runs once per case and " +
          "is compared against every fully-supported non-English language.",
        languages: NON_ENGLISH_LANGUAGES,
        summaryByLanguage: perLanguageSummary,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);

  const anyLanguageBelowFullParity = NON_ENGLISH_LANGUAGES.some((lang) => {
    const langRows = rows.filter((r) => r.language === lang);
    const s = perLanguageSummary[lang];
    return s.parityPass < langRows.length || s.identifierPass < langRows.length;
  });
  if (anyLanguageBelowFullParity) process.exitCode = 1;
}

function summarizeLanguage(langRows: Row[]) {
  return {
    parityPass: langRows.filter((r) => r.pass).length,
    sharedAnyPass: langRows.filter((r) => r.anyShared).length,
    detectedPass: langRows.filter((r) => r.detected).length,
    translatedPass: langRows.filter((r) => r.other.translated).length,
    answeredPass: langRows.filter((r) => r.answeredInLanguage).length,
    identifierPass: langRows.filter((r) => r.latinIds).length,
  };
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
