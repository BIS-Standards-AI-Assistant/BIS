// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { GeminiProvider } from "./gemini-provider";
import { GroqProvider } from "./groq-provider";

// No network: the AI SDK calls and the provider factories are mocked, so
// these tests exercise only this app's adapter logic around them.
const generateText = vi.fn();
const generateObject = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  generateObject: (...args: unknown[]) => generateObject(...args),
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => (modelId: string) => ({ fake: "gemini", modelId }),
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({ chatModel: (modelId: string) => ({ fake: "groq", modelId }) }),
}));

const Schema = z.object({ answer: z.string(), score: z.number() });
const structuredRequest = { system: "sys", prompt: "q", maxOutputTokens: 500, schema: Schema };

function sdkText(text: string, finishReason = "stop") {
  return { text, finishReason, usage: { inputTokens: 11, outputTokens: 22 } };
}

beforeEach(() => {
  generateText.mockReset();
  generateObject.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe.each([
  ["GeminiProvider", (o?: { apiKey?: string; modelId?: string }) => new GeminiProvider(o), "gemini"],
  ["GroqProvider", (o?: { apiKey?: string; modelId?: string }) => new GroqProvider(o), "groq"],
] as const)("%s", (_name, make, providerName) => {
  test("without an API key it is unconfigured and fails fast, never calling the SDK", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const provider = make();
    expect(provider.isConfigured()).toBe(false);

    const text = await provider.generateText({ prompt: "q", maxOutputTokens: 10 });
    expect(text).toMatchObject({ text: null, finishReason: "error", provider: providerName });
    expect(text.error).toMatch(/^not_configured/);

    const structured = await provider.generateStructured(structuredRequest);
    expect(structured).toMatchObject({ structuredData: null, finishReason: "error" });
    expect(generateText).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
  });

  test("generateText returns the normalized response with token usage", async () => {
    generateText.mockResolvedValue(sdkText("hello"));
    const result = await make({ apiKey: "k", modelId: "m-1" }).generateText({ system: "s", prompt: "p", maxOutputTokens: 50 });
    expect(result).toMatchObject({
      text: "hello",
      structuredData: null,
      provider: providerName,
      model: "m-1",
      inputTokens: 11,
      outputTokens: 22,
      finishReason: "stop",
      error: null,
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ system: "s", prompt: "p", maxOutputTokens: 50, model: expect.objectContaining({ modelId: "m-1" }) }),
    );
  });

  test("a truncated response is reported as finishReason 'length'", async () => {
    generateText.mockResolvedValue(sdkText("partial", "length"));
    expect((await make({ apiKey: "k" }).generateText({ prompt: "p", maxOutputTokens: 5 })).finishReason).toBe("length");
  });

  test("missing usage becomes null token counts rather than undefined or zero", async () => {
    generateText.mockResolvedValue({ text: "hi", finishReason: "stop" });
    const result = await make({ apiKey: "k" }).generateText({ prompt: "p", maxOutputTokens: 5 });
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
  });

  test("an SDK exception becomes a normal failure response, not a throw", async () => {
    generateText.mockRejectedValue(new Error("429 Too Many Requests"));
    const result = await make({ apiKey: "k" }).generateText({ prompt: "p", maxOutputTokens: 5 });
    expect(result).toMatchObject({ text: null, finishReason: "error", error: "429 Too Many Requests" });
  });

  test("generateStructured parses, normalizes and validates fenced JSON from the model", async () => {
    generateText.mockResolvedValue(sdkText('```json\n{"answer": "IS 1293 applies", "score": 0.9}\n```'));
    const result = await make({ apiKey: "k" }).generateStructured(structuredRequest);
    expect(result.error).toBeNull();
    expect(result.text).toBeNull();
    expect(result.structuredData).toMatchObject({ answer: "IS 1293 applies", score: 0.9 });
    expect(result.inputTokens).toBe(11);
  });

  test("generateStructured appends a JSON-only instruction to the caller's system prompt", async () => {
    generateText.mockResolvedValue(sdkText('{"answer": "a", "score": 1}'));
    await make({ apiKey: "k" }).generateStructured(structuredRequest);
    const { system } = generateText.mock.calls[0][0] as { system: string };
    expect(system.startsWith("sys\n\n")).toBe(true);
    expect(system).toMatch(/JSON/);
  });
});

describe("GroqProvider specifics", () => {
  test("structured output is claimed only for the live-verified models", () => {
    expect(new GroqProvider({ apiKey: "k", modelId: "openai/gpt-oss-120b" }).capabilities.structuredOutput).toBe(true);
    expect(new GroqProvider({ apiKey: "k", modelId: "openai/gpt-oss-20b" }).capabilities.structuredOutput).toBe(true);
    expect(new GroqProvider({ apiKey: "k", modelId: "llama-3.1-8b-instant" }).capabilities.structuredOutput).toBe(false);
  });

  test("model and key come from the environment when not passed explicitly", () => {
    vi.stubEnv("GROQ_API_KEY", "env-key");
    vi.stubEnv("GROQ_MODEL", "env-model");
    const provider = new GroqProvider();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.model).toBe("env-model");
  });

  test("a blank GROQ_MODEL falls back to the verified default model", () => {
    vi.stubEnv("GROQ_API_KEY", "env-key");
    vi.stubEnv("GROQ_MODEL", "");
    const provider = new GroqProvider();
    expect(provider.model).toBe("openai/gpt-oss-120b");
    expect(provider.capabilities.structuredOutput).toBe(true);
  });

  test("schema-invalid JSON is a failure, never partially returned", async () => {
    generateText.mockResolvedValue(sdkText('{"answer": "a", "score": "high"}'));
    const result = await new GroqProvider({ apiKey: "k" }).generateStructured(structuredRequest);
    expect(result.structuredData).toBeNull();
    expect(result.finishReason).toBe("error");
  });

  test("an empty model response is a failure", async () => {
    generateText.mockResolvedValue(sdkText(""));
    const result = await new GroqProvider({ apiKey: "k" }).generateStructured(structuredRequest);
    expect(result).toMatchObject({ structuredData: null, error: "empty response" });
  });
});

describe("GeminiProvider specifics", () => {
  test("accepts either GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY", () => {
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(new GeminiProvider().isConfigured()).toBe(true);
    vi.stubEnv("GEMINI_API_KEY", undefined);
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "google-key");
    expect(new GeminiProvider().isConfigured()).toBe(true);
  });

  test("a blank GEMINI_API_KEY does not hide GOOGLE_GENERATIVE_AI_API_KEY", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "google-key");
    expect(new GeminiProvider().isConfigured()).toBe(true);
  });

  test("a blank GEMINI_MODEL falls back to the default model", () => {
    vi.stubEnv("GEMINI_MODEL", "");
    expect(new GeminiProvider({ apiKey: "k" }).model).toBe("gemini-3.6-flash");
  });

  test("when text-mode JSON is unusable it falls back to the SDK's generateObject", async () => {
    generateText.mockResolvedValue(sdkText("Sorry, I can't produce JSON for that."));
    generateObject.mockResolvedValue({ object: { answer: "from object mode", score: 0.5 }, finishReason: "stop", usage: { inputTokens: 3, outputTokens: 4 } });
    const result = await new GeminiProvider({ apiKey: "k" }).generateStructured(structuredRequest);
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: Schema, system: "sys", prompt: "q" }));
    expect(result).toMatchObject({ structuredData: { answer: "from object mode", score: 0.5 }, inputTokens: 3, outputTokens: 4, error: null });
  });

  test("when both modes fail, the object-mode error is reported as a normal failure", async () => {
    generateText.mockResolvedValue(sdkText("not json"));
    generateObject.mockRejectedValue(new Error("schema mismatch"));
    const result = await new GeminiProvider({ apiKey: "k" }).generateStructured(structuredRequest);
    expect(result).toMatchObject({ structuredData: null, finishReason: "error", error: "schema mismatch" });
  });

  test("defaults maxOutputTokens to 2000 for the text-mode attempt when the caller passes 0", async () => {
    generateText.mockResolvedValue(sdkText('{"answer": "a", "score": 1}'));
    await new GeminiProvider({ apiKey: "k" }).generateStructured({ ...structuredRequest, maxOutputTokens: 0 });
    expect(generateText.mock.calls[0][0]).toMatchObject({ maxOutputTokens: 2000 });
  });
});
