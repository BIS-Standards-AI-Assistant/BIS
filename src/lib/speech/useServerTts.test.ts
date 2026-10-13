import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useServerTts } from "./useServerTts";

function okAudioResponse() {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }),
    json: async () => ({}),
  } as unknown as Response;
}

let revoked: string[] = [];

beforeEach(() => {
  revoked = [];
  global.fetch = vi.fn(async () => okAudioResponse()) as unknown as typeof fetch;
  global.URL.createObjectURL = vi.fn(() => "blob:tts");
  global.URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => vi.restoreAllMocks());

function rejectPlayWith(name: string) {
  window.HTMLMediaElement.prototype.play = vi.fn(async () => {
    throw new DOMException("play() refused", name);
  });
}

describe("useServerTts: the audio arrives but the browser will not play it", () => {
  test("an autoplay block is reported as such, not as a connection problem", async () => {
    rejectPlayWith("NotAllowedError");
    const { result } = renderHook(() => useServerTts({ language: "en" }));

    act(() => result.current.speak("answer"));

    await waitFor(() => expect(result.current.state.kind).toBe("error"));
    const state = result.current.state as { kind: "error"; message: string; unavailable: boolean };
    expect(state.message).toBe("Your browser blocked audio playback.");
    expect(state.message).not.toMatch(/connection/i);
    expect(state.unavailable).toBe(false);
  });

  test("an unplayable file is reported as a playback failure", async () => {
    rejectPlayWith("NotSupportedError");
    const { result } = renderHook(() => useServerTts({ language: "en" }));

    act(() => result.current.speak("answer"));

    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "error", message: "Could not play the audio." }));
  });

  test("the object URL is released when playback is refused", async () => {
    rejectPlayWith("NotAllowedError");
    const { result } = renderHook(() => useServerTts({ language: "en" }));

    act(() => result.current.speak("answer"));

    await waitFor(() => expect(result.current.state.kind).toBe("error"));
    expect(revoked).toEqual(["blob:tts"]);
  });

  test("play() aborted by stop() is not an error", async () => {
    let rejectPlay: (e: unknown) => void = () => {};
    window.HTMLMediaElement.prototype.play = vi.fn(
      () => new Promise<void>((_, reject) => (rejectPlay = reject)),
    );
    const { result } = renderHook(() => useServerTts({ language: "en" }));

    act(() => result.current.speak("answer"));
    await waitFor(() => expect(result.current.state.kind).toBe("speaking"));

    act(() => result.current.stop());
    await act(async () => rejectPlay(new DOMException("interrupted by pause()", "AbortError")));
    expect(result.current.state.kind).toBe("idle");
  });

  test("a network failure still says to check the connection", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useServerTts({ language: "en" }));

    act(() => result.current.speak("answer"));

    await waitFor(() => expect(result.current.state).toMatchObject({ kind: "error", message: expect.stringMatching(/connection/i) }));
  });
});
