import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSpeechRecognition } from "./useSpeechRecognition";

interface FakeRecognition {
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

let instances: FakeRecognition[] = [];
let startThrows = false;

function resultEvent(transcript: string, isFinal: boolean) {
  return { resultIndex: 0, results: [{ isFinal, 0: { transcript } }] };
}

beforeEach(() => {
  instances = [];
  startThrows = false;
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = function FakeSR() {
    const instance: FakeRecognition = {
      lang: "",
      onresult: null,
      onerror: null,
      onend: null,
      start() {
        if (startThrows) throw new DOMException("already started", "InvalidStateError");
      },
      stop: vi.fn(),
      abort: vi.fn(),
    };
    instances.push(instance);
    return instance;
  };
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

describe("useSpeechRecognition: a replaced recognizer cannot change state", () => {
  test("the previous instance's late 'aborted' + 'end' leave the new session listening", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult: vi.fn() }));

    act(() => result.current.start());
    act(() => result.current.start());
    expect(instances[0].abort).toHaveBeenCalled();

    act(() => {
      instances[0].onerror?.({ error: "aborted" });
      instances[0].onend?.();
    });
    expect(result.current.state.kind).toBe("listening");
  });

  test("a late result from the previous instance is not submitted as the user's query", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult }));

    act(() => result.current.start());
    act(() => result.current.start());
    act(() => instances[0].onresult?.(resultEvent("stale words", true)));

    expect(onResult).not.toHaveBeenCalled();
    expect(result.current.state.kind).toBe("listening");
  });

  test("a late error from the previous instance is not shown", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult: vi.fn() }));

    act(() => result.current.start());
    act(() => result.current.start());
    act(() => instances[0].onerror?.({ error: "no-speech" }));

    expect(result.current.state.kind).toBe("listening");
  });
});

describe("useSpeechRecognition: start() can throw", () => {
  test("a synchronous start failure becomes an error, not endless 'listening'", () => {
    startThrows = true;
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult: vi.fn() }));

    act(() => result.current.start());

    expect(result.current.state).toMatchObject({ kind: "error", code: "start-failed" });
  });

  test("the user can try again after a start failure", () => {
    startThrows = true;
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult: vi.fn() }));
    act(() => result.current.start());

    startThrows = false;
    act(() => result.current.start());
    expect(result.current.state.kind).toBe("listening");
  });
});

describe("useSpeechRecognition: the current instance still drives state", () => {
  test("interim, then final transcript, then idle", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ lang: "hi-IN", onResult }));

    act(() => result.current.start());
    expect(instances[0].lang).toBe("hi-IN");

    act(() => instances[0].onresult?.(resultEvent("pack", false)));
    expect(result.current.state).toEqual({ kind: "listening", interimTranscript: "pack" });

    act(() => instances[0].onresult?.(resultEvent(" packaged water ", true)));
    expect(onResult).toHaveBeenCalledWith("packaged water");
    expect(result.current.state.kind).toBe("idle");
  });

  test("its own end returns to idle and its own error is shown", () => {
    const { result } = renderHook(() => useSpeechRecognition({ lang: "en-IN", onResult: vi.fn() }));

    act(() => result.current.start());
    act(() => instances[0].onend?.());
    expect(result.current.state.kind).toBe("idle");

    act(() => result.current.start());
    act(() => instances[1].onerror?.({ error: "not-allowed" }));
    expect(result.current.state).toMatchObject({ kind: "error", code: "not-allowed" });
  });
});
