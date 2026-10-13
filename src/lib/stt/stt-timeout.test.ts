import { test, expect, vi } from "vitest";
import { OpenAICompatibleSttProvider } from "./openai-compatible-provider";

const audio = new TextEncoder().encode("fake audio bytes").buffer;

test("the timeout also covers a response body that never finishes", async () => {
  vi.useFakeTimers();
  try {
    const f = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const signal = (init as RequestInit).signal!;
      const res = new Response("{}", { status: 200 });
      // Headers arrive; the body then stalls until the request is aborted.
      Object.defineProperty(res, "json", {
        value: () =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
          ),
      });
      return res;
    });
    const stt = new OpenAICompatibleSttProvider("https://api.example.test/v1", "k", "whisper", f, 1000);
    const pending = stt.transcribe({ audio, mimeType: "audio/webm" });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result.text).toBeNull();
    expect(result.error).toMatch(/aborted/);
  } finally {
    vi.useRealTimers();
  }
});

test("an upstream error body is bounded in the returned error", async () => {
  const page = `<html>${"x".repeat(50_000)}</html>`;
  const f = vi.fn<typeof fetch>().mockResolvedValue(new Response(page, { status: 502 }));
  const stt = new OpenAICompatibleSttProvider("https://api.example.test/v1", "k", "whisper", f);
  const result = await stt.transcribe({ audio, mimeType: "audio/webm" });
  expect(result.error).toMatch(/^HTTP 502: <html>x+/);
  expect(result.error!.length).toBeLessThan(400);
});

test("no timer is left running after a request completes", async () => {
  vi.useFakeTimers();
  try {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error("connection refused"));
    const stt = new OpenAICompatibleSttProvider("https://api.example.test/v1", "k", "whisper", f);
    await stt.transcribe({ audio, mimeType: "audio/webm" });
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
