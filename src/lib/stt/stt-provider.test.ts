import { describe, test, expect, beforeEach } from "vitest";
import { getSTTProvider, setCustomSTTProvider } from "./stt-provider";
import { MockSTTProvider } from "./mock-stt-provider";

describe("STT Provider Resolver", () => {
  beforeEach(() => {
    setCustomSTTProvider(null);
  });

  test("resolves NoneSTTProvider when provider is unconfigured or set to 'none'", async () => {
    const provider = getSTTProvider("none");
    expect(provider.name).toBe("none");
    expect(await provider.isAvailable()).toBe(false);
    await expect(
      provider.transcribe({ buffer: Buffer.from("test"), mimeType: "audio/wav" })
    ).rejects.toThrow("STT_PROVIDER_DISABLED");
  });

  test("resolves MockSTTProvider when provider is 'mock'", async () => {
    const provider = getSTTProvider("mock");
    expect(provider.name).toBe("mock");
    expect(await provider.isAvailable()).toBe(true);

    const res = await provider.transcribe({
      buffer: Buffer.from("dummy-audio-bytes"),
      mimeType: "audio/webm",
      durationMs: 2000,
    });

    expect(res.text).toBe("What is the certification process for IS 4151?");
    expect(res.language).toBe("en");
    expect(res.confidence).toBeNull(); // confidence not fabricated
    expect(res.provider).toBe("mock");
    expect(res.durationMs).toBe(2000);
  });

  test("MockSTTProvider supports error simulation", async () => {
    const mock = new MockSTTProvider({ shouldFail: true });
    expect(await mock.isAvailable()).toBe(false);
    await expect(
      mock.transcribe({ buffer: Buffer.from("audio"), mimeType: "audio/wav" })
    ).rejects.toThrow("Mock STT provider failure");
  });

  test("MockSTTProvider handles custom language options", async () => {
    const mock = new MockSTTProvider({
      defaultTranscript: "मुझे आईएस 4151 का प्रोसेस बताओ",
      defaultLanguage: "hi",
    });

    const res = await mock.transcribe(
      { buffer: Buffer.from("audio"), mimeType: "audio/wav" },
      { language: "hi" }
    );

    expect(res.text).toBe("मुझे आईएस 4151 का प्रोसेस बताओ");
    expect(res.language).toBe("hi");
  });
});
