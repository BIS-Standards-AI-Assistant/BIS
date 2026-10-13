import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { pickVoice, useSpeechSynthesis } from "./useSpeechSynthesis";

/**
 * jsdom has no speechSynthesis, so the browser API is faked. The fake does
 * what Chrome does on cancel(): the utterance that was playing later fires
 * an "interrupted" error, asynchronously, after the caller has moved on.
 */

interface FakeUtterance {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function voice(lang: string): SpeechSynthesisVoice {
  return { lang, name: lang, default: false, localService: true, voiceURI: lang } as SpeechSynthesisVoice;
}

let spoken: FakeUtterance[] = [];
let installed: SpeechSynthesisVoice[] = [];

beforeEach(() => {
  spoken = [];
  installed = [voice("en-IN"), voice("hi_IN")];
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => installed,
      speak: (u: FakeUtterance) => spoken.push(u),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
    text: string;
    lang = "";
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  };
});

afterEach(() => {
  delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
});

describe("useSpeechSynthesis: a replaced utterance cannot change state", () => {
  test("the previous utterance's late 'interrupted' leaves the new one speaking", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("first answer"));
    act(() => result.current.speak("second answer"));
    expect(result.current.state.kind).toBe("speaking");

    // Fired by the cancel() inside the second speak(), after it started.
    act(() => spoken[0].onerror?.({ error: "interrupted" }));
    expect(result.current.state.kind).toBe("speaking");
  });

  test("the previous utterance's late 'end' (Safari) leaves the new one speaking", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("first answer"));
    act(() => result.current.speak("second answer"));
    act(() => spoken[0].onend?.());
    expect(result.current.state.kind).toBe("speaking");
  });

  test("a stale real error is not shown for an utterance that was replaced", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("first answer"));
    act(() => result.current.speak("second answer"));
    act(() => spoken[0].onerror?.({ error: "synthesis-failed" }));
    expect(result.current.state.kind).toBe("speaking");
  });

  test("the current utterance still returns to idle when it finishes", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("only answer"));
    act(() => spoken[0].onend?.());
    expect(result.current.state.kind).toBe("idle");
  });

  test("the current utterance still reports a real failure", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("only answer"));
    act(() => spoken[0].onerror?.({ error: "synthesis-failed" }));
    expect(result.current.state).toMatchObject({ kind: "error" });
  });

  test("stop() goes idle and ignores the stopped utterance's later events", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "en" }));

    act(() => result.current.speak("answer"));
    act(() => result.current.stop());
    expect(result.current.state.kind).toBe("idle");
    act(() => spoken[0].onerror?.({ error: "synthesis-failed" }));
    expect(result.current.state.kind).toBe("idle");
  });
});

describe("pickVoice: Android-style voice languages", () => {
  test("matches 'hi_IN' (Android-style) to the hi-IN locale", () => {
    expect(pickVoice([voice("en_IN"), voice("hi_IN")], "hi-IN")?.lang).toBe("hi_IN");
  });

  test("falls back across regions with underscores too", () => {
    expect(pickVoice([voice("en_US")], "en-IN")?.lang).toBe("en_US");
  });

  test("still refuses a wrong-language voice", () => {
    expect(pickVoice([voice("en_US")], "hi-IN")).toBeNull();
  });

  test("the hook speaks Hindi with an underscore-tagged voice instead of refusing", () => {
    const { result } = renderHook(() => useSpeechSynthesis({ language: "hi" }));
    expect(result.current.unsupportedLanguage).toBe(false);

    act(() => result.current.speak("नमस्ते"));
    expect(spoken[0].voice?.lang).toBe("hi_IN");
    expect(result.current.state.kind).toBe("speaking");
  });
});
