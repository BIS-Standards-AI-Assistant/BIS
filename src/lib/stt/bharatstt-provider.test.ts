import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { BharatSTTProvider } from "./bharatstt-provider";

describe("BharatSTTProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("returns health true when BharatSTT /health returns 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const provider = new BharatSTTProvider({ serviceUrl: "http://localhost:8000/transcribe" });
    const available = await provider.isAvailable();
    expect(available).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/health", expect.any(Object));
  });

  test("returns health false when BharatSTT /health is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const provider = new BharatSTTProvider({ serviceUrl: "http://localhost:8000/transcribe" });
    const available = await provider.isAvailable();
    expect(available).toBe(false);
  });

  test("transcribes audio and parses response properly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        transcript: "What is the standard for drinking water?",
        language: "en",
        confidence: null,
        duration_ms: 2500,
        route: "english",
        mixer_applied: false,
      }),
    } as unknown as Response);

    const provider = new BharatSTTProvider({ serviceUrl: "http://localhost:8000/transcribe" });
    const res = await provider.transcribe(
      { buffer: Buffer.from("audio-data"), mimeType: "audio/wav", fileName: "query.wav" },
      { language: "en" }
    );

    expect(res.text).toBe("What is the standard for drinking water?");
    expect(res.language).toBe("en");
    expect(res.confidence).toBeNull();
    expect(res.provider).toBe("bharatstt");
    expect(res.durationMs).toBe(2500);
    expect(res.metadata?.route).toBe("english");
  });

  test("wraps HTTP 413 payload too large", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
    } as Response);

    const provider = new BharatSTTProvider({ serviceUrl: "http://localhost:8000/transcribe" });
    await expect(
      provider.transcribe({ buffer: Buffer.from("big-audio"), mimeType: "audio/wav" })
    ).rejects.toThrow("AUDIO_PAYLOAD_TOO_LARGE");
  });

  test("wraps HTTP 415 unsupported format", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 415,
    } as Response);

    const provider = new BharatSTTProvider({ serviceUrl: "http://localhost:8000/transcribe" });
    await expect(
      provider.transcribe({ buffer: Buffer.from("bad-audio"), mimeType: "audio/xyz" })
    ).rejects.toThrow("UNSUPPORTED_AUDIO_FORMAT");
  });
});
