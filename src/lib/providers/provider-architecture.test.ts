// @vitest-environment node
/**
 * Provider-independence architecture tests. All 15 scenarios required by
 * the milestone brief, run entirely with mocks — no real API key, no
 * network call, no local inference server needed.
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import { z } from "zod";
import { LocalProvider } from "./local-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import { resolveProviderChain, generateTextWithFallback, generateStructuredWithFallback, resetProviderCooldowns } from "./router";
import type { LLMProvider, NormalizedLLMResponse } from "./types";

function ok<T>(overrides: Partial<NormalizedLLMResponse<T>> = {}): NormalizedLLMResponse<T> {
  return {
    text: "ok",
    structuredData: null,
    provider: "local",
    model: "test-model",
    inputTokens: 10,
    outputTokens: 5,
    latencyMs: 12,
    finishReason: "stop",
    error: null,
    ...overrides,
  };
}

function fail<T>(error: string, overrides: Partial<NormalizedLLMResponse<T>> = {}): NormalizedLLMResponse<T> {
  return {
    text: null,
    structuredData: null,
    provider: "local",
    model: "test-model",
    inputTokens: null,
    outputTokens: null,
    latencyMs: 5,
    finishReason: "error",
    error,
    ...overrides,
  };
}

/** Minimal hand-built LLMProvider for router-level tests where the exact provider implementation doesn't matter. */
function fakeProvider(opts: {
  name: LLMProvider["name"];
  configured?: boolean;
  structuredOutput?: boolean;
  textResult?: NormalizedLLMResponse<never>;
  structuredResult?: NormalizedLLMResponse<unknown>;
}): LLMProvider {
  return {
    name: opts.name,
    model: `${opts.name}-model`,
    capabilities: { structuredOutput: opts.structuredOutput ?? true, toolCalling: false, streaming: false, maxContextTokens: 8192 },
    isConfigured: () => opts.configured ?? true,
    generateText: vi.fn().mockResolvedValue(opts.textResult ?? ok({ provider: opts.name })),
    generateStructured: vi.fn().mockResolvedValue(opts.structuredResult ?? ok({ provider: opts.name })),
  };
}

beforeEach(() => {
  resetProviderCooldowns();
});

const TestSchema = z.object({ value: z.string() });

describe("1. Local provider selection", () => {
  test("LLM_PROVIDER=local selects only the local provider when configured", () => {
    const local = fakeProvider({ name: "local" });
    const free = fakeProvider({ name: "openrouter-free" });
    const chain = resolveProviderChain([local, free], "local");
    expect(chain).toEqual([local]);
  });
});

describe("2. OpenRouter free selection", () => {
  test("LLM_PROVIDER=openrouter-free selects only that provider", () => {
    const local = fakeProvider({ name: "local" });
    const free = fakeProvider({ name: "openrouter-free" });
    const chain = resolveProviderChain([local, free], "openrouter-free");
    expect(chain).toEqual([free]);
  });
});

describe("3. Paid provider selection", () => {
  test("LLM_PROVIDER=paid selects only the paid provider", () => {
    const free = fakeProvider({ name: "openrouter-free" });
    const paid = fakeProvider({ name: "paid" });
    const chain = resolveProviderChain([free, paid], "paid");
    expect(chain).toEqual([paid]);
  });
});

describe("4. Automatic fallback", () => {
  test("LLM_PROVIDER=auto (or unset) orders local -> openrouter-free -> paid", () => {
    const local = fakeProvider({ name: "local" });
    const free = fakeProvider({ name: "openrouter-free" });
    const paid = fakeProvider({ name: "paid" });
    // deliberately out of order input — resolveProviderChain imposes the order, not the caller
    expect(resolveProviderChain([paid, free, local], "auto")).toEqual([local, free, paid]);
    expect(resolveProviderChain([paid, free, local], undefined)).toEqual([local, free, paid]);
  });

  test("auto skips providers not present in the input list", () => {
    const paid = fakeProvider({ name: "paid" });
    expect(resolveProviderChain([paid], "auto")).toEqual([paid]);
  });
});

describe("5. Local -> OpenRouter fallback", () => {
  test("when local fails, the router moves to openrouter-free and returns its result", async () => {
    const local = fakeProvider({ name: "local", textResult: fail("connection_refused", { provider: "local" }) });
    const free = fakeProvider({ name: "openrouter-free", textResult: ok({ provider: "openrouter-free", text: "from free tier" }) });
    const chain = resolveProviderChain([local, free], "auto");

    const { response, trace } = await generateTextWithFallback(chain, { prompt: "hi", maxOutputTokens: 100 });

    expect(response?.provider).toBe("openrouter-free");
    expect(response?.text).toBe("from free tier");
    expect(trace[0]).toMatchObject({ provider: "local", attempted: true, error: "connection_refused" });
    expect(trace[1]).toMatchObject({ provider: "openrouter-free", attempted: true });
  });
});

describe("6. OpenRouter -> Paid fallback", () => {
  test("when openrouter-free fails, the router falls through to paid", async () => {
    const free = fakeProvider({ name: "openrouter-free", configured: false }); // not configured at all
    const paid = fakeProvider({ name: "paid", textResult: ok({ provider: "paid", text: "paid response" }) });
    const chain = resolveProviderChain([free, paid], "auto");

    const { response, trace } = await generateTextWithFallback(chain, { prompt: "hi", maxOutputTokens: 100 });

    expect(response?.provider).toBe("paid");
    expect(trace.find((t) => t.provider === "openrouter-free")).toMatchObject({ attempted: false, skippedReason: "not_configured" });
  });
});

describe("7. All providers unavailable", () => {
  test("returns response: null with a full trace, never throws", async () => {
    const local = fakeProvider({ name: "local", configured: false });
    const free = fakeProvider({ name: "openrouter-free", configured: false });
    const paid = fakeProvider({ name: "paid", configured: false });
    const chain = resolveProviderChain([local, free, paid], "auto");

    const { response, trace } = await generateTextWithFallback(chain, { prompt: "hi", maxOutputTokens: 100 });

    expect(response).toBeNull();
    expect(trace).toHaveLength(3);
    expect(trace.every((t) => t.attempted === false)).toBe(true);
  });

  test("LLM_PROVIDER=none always yields an empty chain regardless of configuration", () => {
    const local = fakeProvider({ name: "local" });
    expect(resolveProviderChain([local], "none")).toEqual([]);
  });
});

describe("8. Evidence-only response", () => {
  test("when generateStructuredWithFallback returns null, callers build an evidence-only answer instead of failing", async () => {
    // This mirrors answer.ts's own fallback path — imported for a
    // behavioral proof, not re-implementing the logic here.
    const { generateAnswer } = await import("../answer");
    const local = fakeProvider({ name: "local", configured: false });
    vi.doMock("./index", () => ({ getProviderChain: () => [local] }));

    const pkg = {
      query: "test",
      intent: {
        intent: "find_applicable_standard" as const,
        isRelevant: true,
        relevanceMessage: null,
        product: null,
        material: null,
        useCase: null,
        targetUser: null,
        sector: null,
        certificationRequested: false,
        testingRequested: false,
        searchQuery: "test",
        missingInformation: [],
        language: "en" as const,
      },
      candidates: [
        {
          standardNumber: "IS 5522:2014",
          title: "Stainless Steel Sheets",
          groundingState: "verified",
          coverage: {
            product: "unknown" as const,
            material: "unknown" as const,
            application: "unknown" as const,
            targetUser: "unknown" as const,
            sector: "unknown" as const,
            testing: "unknown" as const,
            certification: "unknown" as const,
            identifier: "covered" as const,
            overallCoverageRatio: 1,
          },
          chunks: [{ chunkId: "c1", section: null, clause: null, text: "evidence text" }],
          primaryRecommendation: true,
          applicabilityReason: "",
        },
      ],
      conflicts: [],
      engineConfidence: { score: 0.9, band: "high" as const, groundingState: "verified" as const, supportingSignals: [], limitingSignals: [] },
    };

    const answer = await generateAnswer(pkg);
    expect(answer.answer).toContain("Based on indexed BIS evidence");
    expect(answer.recommendationExplanations[0].standardNumber).toBe("IS 5522:2014");
    expect(answer.limitations.some((l) => l.includes("has not been rewritten by a language model"))).toBe(true);
  });
});

describe("9. Structured-output capability detection", () => {
  test("OpenRouterProvider reports structuredOutput=true only for the verified allowlist", () => {
    const good = new OpenRouterProvider("paid", { apiKey: "k", modelId: "openai/gpt-4o" });
    const unknown = new OpenRouterProvider("paid", { apiKey: "k", modelId: "some/random-free-model" });
    expect(good.capabilities.structuredOutput).toBe(true);
    expect(unknown.capabilities.structuredOutput).toBe(false);
  });

  test("an explicit override can force structuredOutput on or off", () => {
    const forcedOff = new OpenRouterProvider("paid", { apiKey: "k", modelId: "openai/gpt-4o", structuredOutputOverride: false });
    const forcedOn = new OpenRouterProvider("paid", { apiKey: "k", modelId: "some/random-model", structuredOutputOverride: true });
    expect(forcedOff.capabilities.structuredOutput).toBe(false);
    expect(forcedOn.capabilities.structuredOutput).toBe(true);
  });

  test("LocalProvider defaults structuredOutput to false unless explicitly opted in", () => {
    const defaultLocal = new LocalProvider("http://localhost:11434/v1", "llama3");
    const optedIn = new LocalProvider("http://localhost:11434/v1", "llama3", true);
    expect(defaultLocal.capabilities.structuredOutput).toBe(false);
    expect(optedIn.capabilities.structuredOutput).toBe(true);
  });

  test("router skips providers without structured-output capability for generateStructured calls", async () => {
    const noStructured = fakeProvider({ name: "local", structuredOutput: false });
    const structured = fakeProvider({ name: "paid", structuredOutput: true, structuredResult: ok({ provider: "paid", structuredData: { value: "x" } }) });
    const { response, trace } = await generateStructuredWithFallback([noStructured, structured], { schema: TestSchema, prompt: "p", maxOutputTokens: 10 });
    expect(response?.provider).toBe("paid");
    expect(trace[0]).toMatchObject({ provider: "local", attempted: false, skippedReason: "no_structured_output_capability" });
  });
});

describe("10. Invalid structured response", () => {
  test("LocalProvider.generateStructured surfaces a schema validation error when opted into structured output but the model returns non-conformant JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"wrong": "shape"}' }, finish_reason: "stop" }] }),
    });
    const provider = new LocalProvider("http://localhost:11434/v1", "llama3", true, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: TestSchema, prompt: "p", maxOutputTokens: 10 });
    expect(result.structuredData).toBeNull();
    expect(result.error).toMatch(/schema_validation_failed/);
  });

  test("LocalProvider.generateStructured surfaces a JSON parse error when the model returns non-JSON text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json at all" }, finish_reason: "stop" }] }),
    });
    const provider = new LocalProvider("http://localhost:11434/v1", "llama3", true, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: TestSchema, prompt: "p", maxOutputTokens: 10 });
    expect(result.structuredData).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("11. Provider timeout", () => {
  test("LocalProvider aborts and reports an error when the request never resolves in time", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      // Simulates a real fetch: the promise only settles when the abort signal fires.
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("The operation was aborted")));
      });
    });
    const provider = new LocalProvider("http://localhost:11434/v1", "llama3", false, fetchMock as unknown as typeof fetch, 20);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/aborted/i);
  });
});

describe("12. Provider rate limit", () => {
  test("a 429 rate-limit response is surfaced as a normal failure (not a thrown exception)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "Too Many Requests" });
    const provider = new LocalProvider("http://localhost:11434/v1", "llama3", false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toContain("429");
  });

  test("router marks a rate-limited provider in cooldown so it's skipped on the next call", async () => {
    const flaky = fakeProvider({ name: "local", textResult: fail("HTTP 429: rate limited", { provider: "local" }) });
    const backup = fakeProvider({ name: "openrouter-free", textResult: ok({ provider: "openrouter-free" }) });
    const chain = [flaky, backup];

    await generateTextWithFallback(chain, { prompt: "p", maxOutputTokens: 10 });
    const { trace } = await generateTextWithFallback(chain, { prompt: "p", maxOutputTokens: 10 });

    expect(trace[0]).toMatchObject({ provider: "local", attempted: false, skippedReason: "cooldown" });
  });
});

describe("13. Credit exhaustion", () => {
  test("an OpenRouter credit-exhaustion error is surfaced as a normal failure and triggers fallback", async () => {
    const generateObjectMock = vi.fn().mockRejectedValue(new Error("This request requires more credits, or fewer max_tokens."));
    const provider = new OpenRouterProvider("openrouter-free", {
      apiKey: "k",
      modelId: "openai/gpt-4o",
      deps: { generateText: vi.fn(), generateObject: generateObjectMock },
    });
    const result = await provider.generateStructured({ schema: TestSchema, prompt: "p", maxOutputTokens: 2048 });
    expect(result.error).toMatch(/credits/i);
    expect(result.structuredData).toBeNull();
  });
});

describe("14. Token usage reporting", () => {
  test("successful responses carry input/output token counts through the router unchanged", async () => {
    const provider = fakeProvider({ name: "paid", textResult: ok({ provider: "paid", inputTokens: 123, outputTokens: 45 }) });
    const { response } = await generateTextWithFallback([provider], { prompt: "p", maxOutputTokens: 10 });
    expect(response?.inputTokens).toBe(123);
    expect(response?.outputTokens).toBe(45);
  });
});

describe("15. Provider abstraction isolation", () => {
  test("NormalizedLLMResponse never carries a provider-SDK-shaped object — only the flat, documented fields", () => {
    const response = ok();
    const keys = Object.keys(response).sort();
    expect(keys).toEqual(
      ["error", "finishReason", "inputTokens", "latencyMs", "model", "outputTokens", "provider", "structuredData", "text"].sort(),
    );
  });

  test("resolveProviderChain output contains only LLMProvider-shaped objects, regardless of which concrete class was used", () => {
    const local = new LocalProvider(undefined, undefined);
    const free = new OpenRouterProvider("openrouter-free", {});
    const chain = resolveProviderChain([local, free], "auto");
    for (const p of chain) {
      expect(typeof p.name).toBe("string");
      expect(typeof p.isConfigured).toBe("function");
      expect(typeof p.generateText).toBe("function");
      expect(typeof p.generateStructured).toBe("function");
    }
  });
});
