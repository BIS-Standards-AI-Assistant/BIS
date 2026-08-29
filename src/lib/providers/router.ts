import type { GenerateStructuredRequest, GenerateTextRequest, LLMProvider, NormalizedLLMResponse, ProviderName } from "./types";

/**
 * Fallback orchestration. Provider order is DATA (resolved here from
 * config), never hardcoded into intent.ts/answer.ts — those modules only
 * ever see a `LLMProvider[]` chain and a `NormalizedLLMResponse`.
 *
 * Cost-control policy (deliberately simple, not exotic):
 * - retry limit = 0 per provider — a failed call moves to the next
 *   provider rather than retrying the one that just failed. Retrying an
 *   already-failed expensive call rarely helps and risks doubling cost for
 *   no benefit (credit exhaustion and rate limits don't resolve by asking
 *   again immediately).
 * - cooldown: a provider that just failed is skipped for COOLDOWN_MS on
 *   subsequent calls within this process, so one flaky/exhausted provider
 *   doesn't get re-attempted (and re-fail, wasting a request) on every
 *   single query.
 * - no infinite loops: the chain is a fixed, finite list — if every
 *   provider fails or is unavailable, the result is `response: null` and
 *   the caller (intent.ts/answer.ts) falls back to deterministic behavior.
 */
const COOLDOWN_MS = 60_000;
const cooldownUntil = new Map<ProviderName, number>();

function isInCooldown(name: ProviderName, now: number): boolean {
  const until = cooldownUntil.get(name);
  return until !== undefined && now < until;
}

function markFailure(name: ProviderName, now: number): void {
  cooldownUntil.set(name, now + COOLDOWN_MS);
}

/** Test-only: clears cooldown state between test cases. Not used in application code. */
export function resetProviderCooldowns(): void {
  cooldownUntil.clear();
}

export type SkipReason = "no_structured_output_capability" | "not_configured" | "cooldown";

export interface FallbackTraceEntry {
  provider: ProviderName;
  model: string;
  attempted: boolean;
  skippedReason?: SkipReason;
  latencyMs?: number;
  error?: string;
}

export interface FallbackResult<T> {
  /** null means every provider in the chain failed or was unavailable — caller must use its own deterministic/evidence-only fallback. */
  response: NormalizedLLMResponse<T> | null;
  trace: FallbackTraceEntry[];
}

/**
 * Never logs API keys, credentials, user query content, or prompt text —
 * only provider identity, timing, and error-message metadata.
 */
function logProviderEvent(event: string, fields: Record<string, unknown>): void {
  console.log(`[llm-provider] ${event}`, JSON.stringify(fields));
}

const ROUTING_ORDER: ProviderName[] = ["local", "openrouter-free", "paid"];

/**
 * Resolves which providers to try, and in what order, from `LLM_PROVIDER`.
 * "auto" (the default) uses local -> openrouter-free -> paid; an explicit
 * value pins to exactly that provider; "none" always returns an empty
 * chain (forcing evidence-only behavior everywhere).
 */
export function resolveProviderChain(providers: LLMProvider[], routingEnv: string | undefined = process.env.LLM_PROVIDER): LLMProvider[] {
  const mode = (routingEnv ?? "auto").toLowerCase();
  if (mode === "none") return [];

  const byName = new Map(providers.map((p) => [p.name, p]));
  if (mode !== "auto") {
    const provider = byName.get(mode as ProviderName);
    return provider ? [provider] : [];
  }
  return ROUTING_ORDER.map((name) => byName.get(name)).filter((p): p is LLMProvider => p !== undefined);
}

async function tryChain<T>(
  chain: LLMProvider[],
  capability: "text" | "structured",
  call: (provider: LLMProvider) => Promise<NormalizedLLMResponse<T>>,
): Promise<FallbackResult<T>> {
  const trace: FallbackTraceEntry[] = [];
  const now = Date.now();

  for (const provider of chain) {
    if (capability === "structured" && !provider.capabilities.structuredOutput) {
      trace.push({ provider: provider.name, model: provider.model, attempted: false, skippedReason: "no_structured_output_capability" });
      continue;
    }
    if (!provider.isConfigured()) {
      trace.push({ provider: provider.name, model: provider.model, attempted: false, skippedReason: "not_configured" });
      continue;
    }
    if (isInCooldown(provider.name, now)) {
      trace.push({ provider: provider.name, model: provider.model, attempted: false, skippedReason: "cooldown" });
      continue;
    }

    const result = await call(provider);
    if (result.error) {
      markFailure(provider.name, now);
      trace.push({ provider: provider.name, model: provider.model, attempted: true, latencyMs: result.latencyMs, error: result.error });
      logProviderEvent("provider_failed", { provider: provider.name, model: provider.model, latencyMs: result.latencyMs, error: result.error });
      continue;
    }

    trace.push({ provider: provider.name, model: provider.model, attempted: true, latencyMs: result.latencyMs });
    logProviderEvent("provider_succeeded", {
      provider: provider.name,
      model: provider.model,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
    return { response: result, trace };
  }

  logProviderEvent("all_providers_exhausted", { chainLength: chain.length, trace });
  return { response: null, trace };
}

export async function generateTextWithFallback(chain: LLMProvider[], req: GenerateTextRequest): Promise<FallbackResult<never>> {
  return tryChain(chain, "text", (p) => p.generateText(req));
}

export async function generateStructuredWithFallback<T>(chain: LLMProvider[], req: GenerateStructuredRequest<T>): Promise<FallbackResult<T>> {
  return tryChain(chain, "structured", (p) => p.generateStructured(req));
}
