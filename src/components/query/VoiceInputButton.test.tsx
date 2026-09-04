import type { ReactElement } from "react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VoiceInputButton } from "./VoiceInputButton";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

/**
 * The behaviour under test is the one that actually broke for a real user:
 * Brave/Arc/plain Chromium expose `webkitSpeechRecognition` but ship without
 * Google's speech API key, so every attempt fails with a "network" error.
 * The component must detect that, switch to server-side transcription, and
 * still produce a transcript — rather than leaving a red error on screen.
 *
 * Driven with fakes rather than a real browser deliberately: headless
 * Chromium does not faithfully reproduce Brave's missing-API-key failure,
 * so a real-browser test would assert the wrong thing.
 */

interface FakeRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

let lastRecognition: FakeRecognition | null = null;
/** Which error code the fake speech engine reports on start(). */
let speechErrorCode = "network";

function installFakeSpeechRecognition() {
  // Written as a factory returning a plain object rather than a class:
  // `new F()` honours an explicitly returned object, and this avoids
  // aliasing `this` just to capture the instance for assertions.
  function FakeSR(this: unknown) {
    const instance: FakeRecognition = {
      lang: "",
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      onresult: null,
      onerror: null,
      onend: null,
      start() {
        // Real browsers deliver this asynchronously, after start() resolves.
        setTimeout(() => {
          instance.onerror?.({ error: speechErrorCode });
          instance.onend?.();
        }, 0);
      },
      stop() {},
      abort() {},
    };
    lastRecognition = instance;
    return instance;
  }
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSR;
}

let lastRecorder: FakeRecorder | null = null;
let recorderChunkSize = 1024;

interface FakeRecorder {
  state: "inactive" | "recording";
  mimeType: string;
  stream: { getTracks: () => Array<{ stop: () => void }> };
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function FakeRecorderCtor(this: unknown, stream: { getTracks: () => Array<{ stop: () => void }> }) {
  const instance: FakeRecorder = {
    state: "inactive",
    mimeType: "audio/webm",
    stream,
    ondataavailable: null,
    onstop: null,
    start() {
      instance.state = "recording";
    },
    stop() {
      instance.state = "inactive";
      instance.ondataavailable?.({ data: new Blob([new Uint8Array(recorderChunkSize)], { type: "audio/webm" }) });
      instance.onstop?.();
    },
  };
  lastRecorder = instance;
  return instance;
}

function renderButton(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

beforeEach(() => {
  speechErrorCode = "network";
  recorderChunkSize = 1024;
  lastRecognition = null;
  lastRecorder = null;
  installFakeSpeechRecognition();

  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorderCtor;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
  });

  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ text: "packaged drinking water standard" }), { status: 200 }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("VoiceInputButton failover", () => {
  test("a Web Speech 'network' failure switches to server transcription and starts recording automatically", async () => {
    renderButton(<VoiceInputButton onResult={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));

    // Failover should begin recording without the user clicking again.
    await waitFor(() => expect(lastRecorder?.state).toBe("recording"));
    expect(screen.getByLabelText(/Stop voice input/i)).toBeInTheDocument();
  });

  test("stopping the fallback recording uploads the audio and returns the transcript", async () => {
    const onResult = vi.fn();
    renderButton(<VoiceInputButton onResult={onResult} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));
    await waitFor(() => expect(lastRecorder?.state).toBe("recording"));

    fireEvent.click(screen.getByLabelText(/Stop voice input/i));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("packaged drinking water standard"));
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/transcribe");
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).body as FormData).get("language")).toBe("en");
  });

  test("the selected voice language is sent to the transcription endpoint", async () => {
    const onResult = vi.fn();
    renderButton(<VoiceInputButton onResult={onResult} />);

    fireEvent.click(screen.getByLabelText(/Voice input language/i));
    fireEvent.click(screen.getByRole("option", { name: /Tamil/i }));

    fireEvent.click(screen.getByLabelText(/Start voice input/i));
    await waitFor(() => expect(lastRecorder?.state).toBe("recording"));
    fireEvent.click(screen.getByLabelText(/Stop voice input/i));

    await waitFor(() => expect(onResult).toHaveBeenCalled());
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(((init as RequestInit).body as FormData).get("language")).toBe("ta");
  });

  test("a recoverable speech error (no-speech) does NOT trigger failover — it stays on the fast path", async () => {
    speechErrorCode = "no-speech";
    renderButton(<VoiceInputButton onResult={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No speech was detected/i));
    expect(lastRecorder).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("a 501 from the endpoint is explained as 'not configured', not a generic failure", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "not configured" }), { status: 501 }),
    ) as unknown as typeof fetch;

    renderButton(<VoiceInputButton onResult={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));
    await waitFor(() => expect(lastRecorder?.state).toBe("recording"));
    fireEvent.click(screen.getByLabelText(/Stop voice input/i));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/isn't available in this browser/i));
  });

  test("an empty recording reports honestly instead of uploading nothing", async () => {
    recorderChunkSize = 0;
    renderButton(<VoiceInputButton onResult={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));
    await waitFor(() => expect(lastRecorder?.state).toBe("recording"));
    fireEvent.click(screen.getByLabelText(/Stop voice input/i));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No audio was captured/i));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("the button renders nothing at all when neither engine is available", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;

    const { container } = renderButton(<VoiceInputButton onResult={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("lastRecognition receives the selected BCP-47 locale", async () => {
    renderButton(<VoiceInputButton onResult={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Start voice input/i));
    await waitFor(() => expect(lastRecognition).not.toBeNull());
    expect(lastRecognition!.lang).toBe("en-IN");
  });
});
