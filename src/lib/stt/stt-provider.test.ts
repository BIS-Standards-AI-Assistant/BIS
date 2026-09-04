import { describe, test, expect, vi } from "vitest";
import { OpenAICompatibleSttProvider } from "./openai-compatible-provider";

function provider(fetchImpl: typeof fetch, overrides: Partial<{ base: string; key: string; model: string }> = {}) {
  return new OpenAICompatibleSttProvider(
    overrides.base ?? "https://api.example.test/v1",
    overrides.key ?? "test-key",
    overrides.model ?? "whisper-large-v3-turbo",
    fetchImpl,
  );
}

const audio = new TextEncoder().encode("fake audio bytes").buffer;

describe("OpenAICompatibleSttProvider", () => {
  test("isConfigured is false unless base URL, key and model are all present", () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(provider(f).isConfigured()).toBe(true);
    expect(new OpenAICompatibleSttProvider(undefined, "k", "m", f).isConfigured()).toBe(false);
    expect(new OpenAICompatibleSttProvider("u", undefined, "m", f).isConfigured()).toBe(false);
    expect(new OpenAICompatibleSttProvider("u", "k", undefined, f).isConfigured()).toBe(false);
  });

  test("returns a normalized failure instead of throwing when unconfigured", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    const result = await new OpenAICompatibleSttProvider(undefined, undefined, undefined, f).transcribe({
      audio,
      mimeType: "audio/webm",
    });
    expect(result.text).toBeNull();
    expect(result.error).toMatch(/not_configured/);
    expect(f).not.toHaveBeenCalled();
  });

  test("posts multipart form data to /audio/transcriptions with auth and model", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ text: "packaged drinking water standard" }), { status: 200 }));
    const result = await provider(f).transcribe({ audio, mimeType: "audio/webm" });

    expect(result.text).toBe("packaged drinking water standard");
    expect(result.error).toBeNull();

    const [url, init] = f.mock.calls[0];
    if (!init) throw new Error("fetch was called without an init object");
    expect(url).toBe("https://api.example.test/v1/audio/transcriptions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3-turbo");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  test("forwards the language hint when given, omits it when not", async () => {
    const f = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ text: "ok" }), { status: 200 }));
    const p = provider(f);

    await p.transcribe({ audio, mimeType: "audio/webm", language: "hi" });
    expect(f.mock.calls[0][1]!.body as FormData).toBeInstanceOf(FormData);
    expect((f.mock.calls[0][1]!.body as FormData).get("language")).toBe("hi");

    await p.transcribe({ audio, mimeType: "audio/webm" });
    expect((f.mock.calls[1][1]!.body as FormData).get("language")).toBeNull();
  });

  test("an upstream HTTP error becomes a normalized error, not an exception", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response("rate limited", { status: 429 }));
    const result = await provider(f).transcribe({ audio, mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toMatch(/HTTP 429/);
  });

  test("a blank transcript is reported as empty_transcript rather than a fake success", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ text: "   " }), { status: 200 }));
    const result = await provider(f).transcribe({ audio, mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toBe("empty_transcript");
  });

  test("a network throw becomes a normalized error, not an exception", async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error("connection refused"));
    const result = await provider(f).transcribe({ audio, mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toMatch(/connection refused/);
  });

  test("picks a file extension matching the container so the API can sniff the format", async () => {
    const f = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ text: "ok" }), { status: 200 }));
    const p = provider(f);
    for (const [mime, ext] of [
      ["audio/webm;codecs=opus", "webm"],
      ["audio/mp4", "mp4"],
      ["audio/ogg", "ogg"],
    ] as const) {
      await p.transcribe({ audio, mimeType: mime });
      const form = f.mock.calls.at(-1)![1]!.body as FormData;
      expect((form.get("file") as File).name).toBe(`audio.${ext}`);
    }
  });
});
