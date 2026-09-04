/**
 * Verifies which free OpenRouter models reliably return schema-exact JSON
 * for the app's ACTUAL structured schemas (QueryIntentSchema,
 * LLMAnswerSchema) — the bar for being added to
 * KNOWN_STRUCTURED_OUTPUT_MODELS in src/lib/providers/openrouter-provider.ts.
 *
 * Same call path the provider uses: ai-sdk `generateObject` against the
 * OpenRouter chat model. Each schema is run N times; a model passes only
 * if every run validates AND the obvious facts are extracted correctly
 * (no fabricated standard numbers, the named product recognised).
 *
 * Run: npm run verify:models   (or: dotenv -e .env.local -- tsx scripts/verify-structured-models.ts "model/id:free")
 */
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { QueryIntentSchema } from "../src/lib/intent";
import { LLMAnswerSchema } from "../src/lib/answer";

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("OPENROUTER_API_KEY not set");
  process.exit(1);
}

const CANDIDATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "z-ai/glm-5.2:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "minimax/minimax-m2.7:free",
      "inclusionai/ling-3.0-flash-fin:free",
    ];

const RUNS = Number(process.env.RUNS ?? 5);

const INTENT_SYSTEM =
  "You extract structured intent from user questions about Indian Standards (BIS). Use null for anything not stated. isRelevant is false only for clearly off-topic queries (weather, recipes, code).";

const ANSWER_SYSTEM =
  "You are a BIS information assistant. Answer ONLY from the evidence chunks provided. Never state a standard number that is not in the evidence. Only reference standardNumber values from the candidate list.";

const ANSWER_PROMPT = `User query: what tests apply to packaged drinking water

Candidate standards (already ranked and grounded by the engine — do not re-rank):
[1] standardNumber=IS 14543:2016 | title="Packaged Drinking Water" | groundingState=verified
  <source_document>
  This standard prescribes requirements and methods of sampling and test for packaged drinking water. Tests include pH value, turbidity, total dissolved solids, and microbiological limits.
  </source_document>
[2] standardNumber=IS 13428:2005 | title="Packaged Natural Mineral Water" | groundingState=verified
  <source_document>
  Sampling and test methods for mineral water, including limits for heavy metals and radioactivity.
  </source_document>`;

interface Check {
  name: string;
  run: (model: ReturnType<ReturnType<typeof createOpenRouter>["chat"]>) => Promise<{ ok: boolean; note: string }>;
}

const CHECKS: Check[] = [
  {
    name: "QueryIntentSchema · 'certification for LED bulbs'",
    run: async (model) => {
      const { object } = await generateObject({
        model,
        schema: QueryIntentSchema,
        system: INTENT_SYSTEM,
        prompt: "What certification does an LED bulb need under BIS?",
        maxOutputTokens: 1024,
      });
      const productOk = /led|bulb|lamp|light/i.test(object.product ?? "");
      const certOk = object.certificationRequested === true;
      const relevantOk = object.isRelevant === true;
      return {
        ok: productOk && certOk && relevantOk,
        note: `product=${JSON.stringify(object.product)} cert=${object.certificationRequested} relevant=${object.isRelevant} intent=${object.intent}`,
      };
    },
  },
  {
    name: "QueryIntentSchema · off-topic 'weather tomorrow'",
    run: async (model) => {
      const { object } = await generateObject({
        model,
        schema: QueryIntentSchema,
        system: INTENT_SYSTEM,
        prompt: "What's the weather forecast for tomorrow?",
        maxOutputTokens: 1024,
      });
      return { ok: object.isRelevant === false, note: `isRelevant=${object.isRelevant}` };
    },
  },
  {
    name: "LLMAnswerSchema · grounded answer, no fabricated numbers",
    run: async (model) => {
      const { object } = await generateObject({
        model,
        schema: LLMAnswerSchema,
        system: ANSWER_SYSTEM,
        prompt: ANSWER_PROMPT,
        maxOutputTokens: 800,
      });
      const allowed = new Set(["IS 14543:2016", "IS 13428:2005", null]);
      const named = object.recommendationExplanations.map((e) => e.standardNumber);
      const noFabrication = named.every((n) => allowed.has(n));
      const answered = object.answer.trim().length > 20;
      const mentionsReal = /14543/.test(object.answer);
      return {
        ok: noFabrication && answered && mentionsReal,
        note: `answerLen=${object.answer.length} named=${JSON.stringify(named)} noFab=${noFabrication}`,
      };
    },
  },
];

async function verifyModel(id: string) {
  const model = createOpenRouter({ apiKey: KEY! }).chat(id);
  console.log("\n" + "=".repeat(74));
  console.log(id);
  let passAll = true;
  for (const check of CHECKS) {
    let passes = 0;
    const notes: string[] = [];
    for (let i = 0; i < RUNS; i++) {
      try {
        const r = await check.run(model);
        if (r.ok) passes++;
        notes.push(`${r.ok ? "ok " : "BAD"} ${r.note}`);
      } catch (e) {
        notes.push("ERR " + (e instanceof Error ? e.message : String(e)).slice(0, 110));
      }
    }
    const ok = passes === RUNS;
    if (!ok) passAll = false;
    console.log(`  [${passes}/${RUNS}] ${check.name}`);
    for (const n of notes) console.log(`        ${n}`);
  }
  console.log(`  => ${passAll ? "PASS — safe to allowlist" : "FAIL — do not allowlist"}`);
  return passAll;
}

(async () => {
  const results: Record<string, boolean> = {};
  for (const id of CANDIDATES) {
    try {
      results[id] = await verifyModel(id);
    } catch (e) {
      console.log(`  ${id}: harness error ${e instanceof Error ? e.message : String(e)}`);
      results[id] = false;
    }
  }
  console.log("\n" + "=".repeat(74));
  console.log("SUMMARY");
  for (const [id, ok] of Object.entries(results)) console.log(`  ${ok ? "PASS" : "fail"}  ${id}`);
  process.exit(0);
})();
