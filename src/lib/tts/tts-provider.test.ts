import { describe, test, expect, vi } from "vitest";
import { GoogleTtsProvider, voiceFor } from "./google-provider";

type Fetch = typeof fetch;

function ok(audioContent = Buffer.from("fake-mp3").toString("base64")) {
  return vi.fn<Fetch>().mockResolvedValue(
    new Response(JSON.stringify({ audioContent }), { status: 200, headers: { "Content-Type": "application/json" } }),
  );
}

describe("voiceFor", () => {
  test("maps the two answer languages to Indian-locale standard voices", () => {
    expect(voiceFor("en")).toEqual({ languageCode: "en-IN", name: "en-IN-Standard-A" });
    expect(voiceFor("hi")).toEqual({ languageCode: "hi-IN", name: "hi-IN-Standard-A" });
  });

  test("never throws on an unexpected language", () => {
    expect(voiceFor("ta").name).toBe("en-IN-Standard-A");
    expect(voiceFor("").name).toBe("en-IN-Standard-A");
  });
});

describe("GoogleTtsProvider", () => {
  test("isConfigured reflects only the API key", () => {
    expect(new GoogleTtsProvider("key", ok()).isConfigured()).toBe(true);
    expect(new GoogleTtsProvider(undefined, ok()).isConfigured()).toBe(false);
  });

  test("returns a normalized failure instead of throwing when unconfigured", async () => {
    const f = ok();
    const result = await new GoogleTtsProvider(undefined, f).synthesize({ text: "hi", language: "en" });
    expect(result.audio).toBeNull();
    expect(result.error).toMatch(/not_configured/);
    expect(f).not.toHaveBeenCalled();
  });

  test("sends the text and the language's voice, and decodes the audio", async () => {
    const f = ok();
    const result = await new GoogleTtsProvider("test-key", f).synthesize({
      text: "पैकेज्ड पेयजल",
      language: "hi",
    });

    expect(result.error).toBeNull();
    // byteLength rather than `instanceof ArrayBuffer`: under jsdom the test
    // file and the module run in different realms, so instanceof compares
    // against a different ArrayBuffer constructor and fails on a valid
    // buffer. The contract that matters is "real audio bytes came back".
    expect(result.audio?.byteLength).toBeGreaterThan(0);
    expect(result.mimeType).toBe("audio/mpeg");
    expect(result.voice).toBe("hi-IN-Standard-A");

    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("texttospeech.googleapis.com");
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.input.text).toBe("पैकेज्ड पेयजल");
    expect(sent.voice).toEqual({ languageCode: "hi-IN", name: "hi-IN-Standard-A" });
    expect(sent.audioConfig.audioEncoding).toBe("MP3");
  });

  test("rejects empty text before spending any quota", async () => {
    const f = ok();
    const result = await new GoogleTtsProvider("k", f).synthesize({ text: "   ", language: "en" });
    expect(result.error).toBe("empty_text");
    expect(f).not.toHaveBeenCalled();
  });

  test("an upstream HTTP error becomes a normalized error, not an exception", async () => {
    const f = vi.fn<Fetch>().mockResolvedValue(new Response("quota exceeded", { status: 429 }));
    const result = await new GoogleTtsProvider("k", f).synthesize({ text: "hello", language: "en" });
    expect(result.audio).toBeNull();
    expect(result.error).toMatch(/HTTP 429/);
  });

  test("a response with no audioContent is reported rather than treated as success", async () => {
    const f = vi.fn<Fetch>().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const result = await new GoogleTtsProvider("k", f).synthesize({ text: "hello", language: "en" });
    expect(result.audio).toBeNull();
    expect(result.error).toBe("no_audio_returned");
  });

  test("a network throw becomes a normalized error", async () => {
    const f = vi.fn<Fetch>().mockRejectedValue(new Error("connection refused"));
    const result = await new GoogleTtsProvider("k", f).synthesize({ text: "hello", language: "en" });
    expect(result.error).toMatch(/connection refused/);
  });

  test("the API key never appears in a returned error message", async () => {
    // The key travels in the query string, so a leaked URL would leak the
    // credential into logs.
    const f = vi.fn<Fetch>().mockResolvedValue(new Response("bad request", { status: 400 }));
    const result = await new GoogleTtsProvider("super-secret-key", f).synthesize({ text: "hello", language: "en" });
    expect(result.error).not.toContain("super-secret-key");
  });
});
