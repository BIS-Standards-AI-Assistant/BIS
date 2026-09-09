/**
 * Real Ollama (local LLM provider) smoke test.
 *
 * Verifies, in order and before touching the BIS database or the rest of
 * the pipeline:
 *   1. the Ollama server is reachable at LOCAL_LLM_BASE_URL
 *   2. the configured LOCAL_LLM_MODEL is actually pulled
 *   3. a REAL generateText round trip through the existing LocalProvider
 *      succeeds (application -> provider abstraction -> Ollama -> model)
 *   4. (only if LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT=true) a real
 *      generateStructured round trip
 *
 * It prints latency for every real call and exits non-zero on any hard
 * failure, so it can gate CI or a pre-demo check. No secrets are involved
 * in the local path, but the script still never echoes env values.
 *
 * Run:  npm run ollama:smoke
 * (equivalently: dotenv -e .env.local -- tsx scripts/ollama-smoke.ts)
 *
 * Defaults (host install, no .env needed):
 *   LOCAL_LLM_BASE_URL = http://localhost:11434/v1
 *   LOCAL_LLM_MODEL    = llama3.2:3b
 */
import { z } from "zod";
import { LocalProvider } from "../src/lib/providers/local-provider";

const BASE_URL = process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1";
const MODEL = process.env.LOCAL_LLM_MODEL || "llama3.2:3b";
const STRUCTURED_OPT_IN = process.env.LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT === "true";

function line(s = "") {
  console.log(s);
}

function fail(msg: string, hint?: string): never {
  line();
  line(`FAILED: ${msg}`);
  if (hint) line(`  → ${hint}`);
  process.exit(1);
}

/** GET {base}/models — reachability + which models are pulled. */
async function listModels(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${BASE_URL}/models`, { signal: controller.signal });
    if (!res.ok) fail(`Ollama responded ${res.status} at ${BASE_URL}/models`, "Is this an OpenAI-compatible endpoint? For Ollama the base URL must end in /v1");
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(
      `cannot reach an Ollama server at ${BASE_URL} (${message})`,
      "Start it with `ollama serve` (host) or `docker compose --profile local up ollama` (Docker), then retry.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  line("=".repeat(72));
  line("Ollama local-provider smoke test");
  line(`  base URL: ${BASE_URL}`);
  line(`  model:    ${MODEL}`);
  line(`  structured-output opt-in: ${STRUCTURED_OPT_IN}`);
  line("=".repeat(72));

  // 1 + 2. Reachability and model presence.
  const models = await listModels();
  line(`\n[1/${STRUCTURED_OPT_IN ? 3 : 2}] server reachable — models pulled: ${models.length ? models.join(", ") : "(none)"}`);

  const modelPresent = models.some((m) => m === MODEL || m.split(":")[0] === MODEL.split(":")[0]);
  if (!modelPresent) {
    fail(`configured model "${MODEL}" is not pulled on this server`, `Run:  ollama pull ${MODEL}`);
  }
  line(`      model "${MODEL}" is available ✓`);

  // 3. Real text round trip through the existing provider abstraction.
  const provider = new LocalProvider(BASE_URL, MODEL, STRUCTURED_OPT_IN);
  line(`\n[2/${STRUCTURED_OPT_IN ? 3 : 2}] real generateText round trip...`);
  const textResult = await provider.generateText({
    system:
      "You are a BIS (Bureau of Indian Standards) assistant. Answer only from the evidence provided. Keep it to one sentence.",
    prompt:
      'Evidence: "IS 14543:2016 specifies requirements for packaged drinking water (other than natural mineral water)."\n\nQuestion: Which Indian Standard covers packaged drinking water?',
    maxOutputTokens: 120,
  });

  if (textResult.error || !textResult.text) {
    fail(`generateText failed: ${textResult.error ?? "empty response"}`);
  }
  line(`      OK — ${textResult.latencyMs} ms · finishReason=${textResult.finishReason} · tokens in/out=${textResult.inputTokens ?? "?"}/${textResult.outputTokens ?? "?"}`);
  line(`      response: ${textResult.text!.replace(/\s+/g, " ").trim().slice(0, 300)}`);

  // 4. Structured round trip — only when the operator has opted in for this
  //    model. A non-opted-in model is CORRECT to refuse structured output;
  //    that is not a smoke-test failure.
  if (STRUCTURED_OPT_IN) {
    line(`\n[3/3] real generateStructured round trip (opt-in is set)...`);
    const schema = z.object({
      standardNumber: z.string().describe("the IS number, e.g. IS 14543:2016"),
      coversPackagedDrinkingWater: z.boolean(),
    });
    const structuredResult = await provider.generateStructured({
      schema,
      system:
        'Respond ONLY with a raw JSON object: {"standardNumber": string, "coversPackagedDrinkingWater": boolean}. No prose, no markdown.',
      prompt:
        'Evidence: "IS 14543:2016 specifies requirements for packaged drinking water."\n\nExtract the standard number and whether it covers packaged drinking water.',
      maxOutputTokens: 200,
    });
    if (structuredResult.error || !structuredResult.structuredData) {
      line(`      structured output did NOT validate: ${structuredResult.error ?? "no data"}`);
      line(`      → This model is not reliable for JSON-schema output. Leave`);
      line(`        LOCAL_LLM_SUPPORTS_STRUCTURED_OUTPUT unset so the router`);
      line(`        skips it for structured calls (intent + answer) and the`);
      line(`        deterministic / evidence-only path handles those.`);
      fail("generateStructured round trip failed while opted in");
    }
    line(`      OK — ${structuredResult.latencyMs} ms · ${JSON.stringify(structuredResult.structuredData)}`);
  }

  line("\n" + "=".repeat(72));
  line("PASS — application → provider abstraction → Ollama → model round trip verified");
  line("=".repeat(72));
  process.exit(0);
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack ?? err.message : String(err));
});
