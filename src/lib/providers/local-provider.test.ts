// @vitest-environment node
/**
 * Dedicated LocalProvider (Ollama / any OpenAI-compatible server) tests.
 * All mocked — no local inference server needed. A real end-to-end round
 * trip against a running Ollama is covered separately by
 * `npm run ollama:smoke` (scripts/ollama-smoke.ts), which is what actually
 * proves the integration works; these tests pin the adapter's contract.
 */
import { describe, test, expect, vi } from "vitest";
import { z } from "zod";
import { LocalProvider } from "./local-provider";

const BASE = "http://localhost:11434/v1";
const MODEL = "llama3.2:3b";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    statusText: "OK",
  };
}

function completion(content: string) {
  return jsonResponse({
    choices: [{ message: { content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 11, completion_tokens: 7 },
  });
}

describe("LocalProvider — configuration", () => {
  test("isConfigured() is false until both base URL and model are set", () => {
    expect(new LocalProvider(undefined, undefined).isConfigured()).toBe(false);
    expect(new LocalProvider(BASE, undefined).isConfigured()).toBe(false);
    expect(new LocalProvider(undefined, MODEL).isConfigured()).toBe(false);
    expect(new LocalProvider(BASE, MODEL).isConfigured()).toBe(true);
  });

  test("model getter reflects the configured model, or 'unknown' when unset", () => {
    expect(new LocalProvider(BASE, MODEL).model).toBe(MODEL);
    expect(new LocalProvider(BASE, undefined).model).toBe("unknown");
  });

  test("name is always 'local'", () => {
    expect(new LocalProvider(BASE, MODEL).name).toBe("local");
  });

  test("an unconfigured provider fails fast without a network call", async () => {
    const fetchMock = vi.fn();
    const provider = new LocalProvider(undefined, undefined, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toMatch(/not_configured/);
    expect(result.finishReason).toBe("error");
  });
});

describe("LocalProvider — text generation", () => {
  test("a well-formed completion is normalized (text, tokens, latency, provider)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("Packaged drinking water is covered by IS 14543."));
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ system: "s", prompt: "p", maxOutputTokens: 100 });

    expect(result.error).toBeNull();
    expect(result.text).toContain("IS 14543");
    expect(result.provider).toBe("local");
    expect(result.model).toBe(MODEL);
    expect(result.inputTokens).toBe(11);
    expect(result.outputTokens).toBe(7);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Sanity-check the request shape: correct URL suffix, non-streaming.
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/chat/completions`);
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.model).toBe(MODEL);
    expect(sent.stream).toBe(false);
    expect(sent.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "p" },
    ]);
  });

  test("system message is omitted when not provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("ok"));
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.messages).toEqual([{ role: "user", content: "p" }]);
  });

  test("finish_reason 'length' is surfaced", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "truncated" }, finish_reason: "length" }] }),
    );
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 1 });
    expect(result.finishReason).toBe("length");
  });
});

describe("LocalProvider — error normalization", () => {
  test("connection failure (server down) → connection_failed:", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^connection_failed:/);
    expect(result.text).toBeNull();
  });

  test("aborted request (timeout) → timeout:", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("The operation was aborted")));
      }),
    );
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch, 15);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^timeout: no response within 15ms/);
  });

  test("404 with a 'not found / pull' body → model_not_found: (distinct from server down)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { message: `model "${MODEL}" not found, try pulling it first` } }),
      statusText: "Not Found",
    });
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^model_not_found:/);
    expect(result.error).toContain(MODEL);
  });

  test("other non-2xx (e.g. 500) → http_error: (still carries the status)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "internal error",
      statusText: "Internal Server Error",
    });
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^http_error: HTTP 500/);
  });

  test("2xx but body is not JSON → invalid_response:", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
      text: async () => "<html>...</html>",
    });
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^invalid_response:/);
  });

  test("2xx but empty completion → invalid_response:", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "   " }, finish_reason: "stop" }] }),
    );
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateText({ prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toMatch(/^invalid_response: model returned an empty completion/);
  });
});

describe("LocalProvider — structured-output capability", () => {
  test("structuredOutput defaults to false and is opt-in", () => {
    expect(new LocalProvider(BASE, MODEL).capabilities.structuredOutput).toBe(false);
    expect(new LocalProvider(BASE, MODEL, true).capabilities.structuredOutput).toBe(true);
  });

  test("generateStructured refuses outright when not opted in — no network call, no fake JSON", async () => {
    const fetchMock = vi.fn();
    const provider = new LocalProvider(BASE, MODEL, false, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: z.object({ v: z.string() }), prompt: "p", maxOutputTokens: 10 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.structuredData).toBeNull();
    expect(result.error).toMatch(/capability_unsupported/);
  });

  test("opted in + schema-conformant JSON → parsed structuredData", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"v":"hello"}'));
    const provider = new LocalProvider(BASE, MODEL, true, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: z.object({ v: z.string() }), prompt: "p", maxOutputTokens: 10 });
    expect(result.error).toBeNull();
    expect(result.structuredData).toEqual({ v: "hello" });
  });

  test("opted in + valid JSON but wrong shape → schema_validation_failed:, never a malformed object passed off as valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"wrong":"shape"}'));
    const provider = new LocalProvider(BASE, MODEL, true, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: z.object({ v: z.string() }), prompt: "p", maxOutputTokens: 10 });
    expect(result.structuredData).toBeNull();
    expect(result.error).toMatch(/schema_validation_failed/);
  });

  test("opted in + non-JSON text → error, structuredData null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("here is your answer, no JSON though"));
    const provider = new LocalProvider(BASE, MODEL, true, fetchMock as unknown as typeof fetch);
    const result = await provider.generateStructured({ schema: z.object({ v: z.string() }), prompt: "p", maxOutputTokens: 10 });
    expect(result.structuredData).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("LocalProvider — timeout configuration", () => {
  test("an explicit timeout is used; a non-finite / non-positive value falls back to the 15s default", async () => {
    const abortingFetch = (ms: number) =>
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          setTimeout(() => reject(new Error("fetch should have been aborted before now")), ms + 500);
        }),
      ) as unknown as typeof fetch;

    const explicit = await new LocalProvider(BASE, MODEL, false, abortingFetch(10), 10).generateText({ prompt: "p", maxOutputTokens: 1 });
    expect(explicit.error).toBe("timeout: no response within 10ms");

    // NaN / 0 / negative are rejected in favour of the 15s default (asserted
    // via the message the timeout path emits, not by reading a private).
    const bad = await new LocalProvider(BASE, MODEL, false, abortingFetch(15_000), Number.NaN).generateText({ prompt: "p", maxOutputTokens: 1 });
    expect(bad.error).toBe("timeout: no response within 15000ms");
  }, 20_000);
});
