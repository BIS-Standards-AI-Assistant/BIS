import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SpeakButton } from "./SpeakButton";
import { pickVoice } from "@/lib/speech/useSpeechSynthesis";
import { voiceFor } from "@/lib/tts/google-provider";

/**
 * Audio is synthesized server-side; the browser's speechSynthesis is only
 * the fallback for when that endpoint is unconfigured or unreachable. Both
 * paths are driven with fakes — jsdom has neither audio playback nor OS
 * voices.
 */

function voice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

let installedVoices: SpeechSynthesisVoice[] = [];
let spokenViaOs: SpeechSynthesisUtterance[] = [];
let played = 0;

/**
 * A hand-rolled response rather than jsdom's Response: its blob() handling
 * is unreliable here, and the component only touches ok/status/headers/
 * blob()/json().
 */
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }),
    json: async () => body ?? { error: "nope" },
  } as unknown as Response;
}

function mockSpeakEndpoint(status: number, body?: unknown) {
  global.fetch = vi.fn(async () => fakeResponse(status, body)) as unknown as typeof fetch;
}

beforeEach(() => {
  installedVoices = [voice("en-IN")];
  spokenViaOs = [];
  played = 0;

  mockSpeakEndpoint(200);
  global.URL.createObjectURL = vi.fn(() => "blob:fake");
  global.URL.revokeObjectURL = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn(async function (this: HTMLAudioElement) {
    played++;
    setTimeout(() => this.onended?.(new Event("ended")), 0);
  });
  window.HTMLMediaElement.prototype.pause = vi.fn();

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => installedVoices,
      speak: (u: SpeechSynthesisUtterance) => spokenViaOs.push(u),
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

afterEach(() => vi.restoreAllMocks());

describe("voiceFor", () => {
  test("uses an Indian-locale voice for each supported answer language", () => {
    expect(voiceFor("hi")).toEqual({ languageCode: "hi-IN", name: "hi-IN-Standard-A" });
    expect(voiceFor("en")).toEqual({ languageCode: "en-IN", name: "en-IN-Standard-A" });
  });

  test("falls back to English for anything unexpected rather than throwing", () => {
    expect(voiceFor("ta").languageCode).toBe("en-IN");
  });
});

describe("SpeakButton (server synthesis)", () => {
  test("posts the answer and its language, then plays the returned audio", async () => {
    render(<SpeakButton text="पैकेज्ड पेयजल के लिए IS 14543 लागू होता है।" language="hi" />);
    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));

    await waitFor(() => expect(played).toBe(1));
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/v1/speak");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.language).toBe("hi");
    expect(body.text).toContain("IS 14543");
    expect(spokenViaOs).toHaveLength(0); // OS path untouched when the server works
  });

  test("shows a preparing state while the server synthesizes", async () => {
    let release: (v: unknown) => void = () => {};
    const held = new Promise((r) => (release = r));
    global.fetch = vi.fn(async () => {
      await held;
      return fakeResponse(200);
    }) as unknown as typeof fetch;

    render(<SpeakButton text="some answer" language="en" />);
    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));
    await waitFor(() => expect(screen.getByText(/Preparing audio/i)).toBeInTheDocument());
    release(null);
  });

  test("falls back to the OS voice automatically when the endpoint is unconfigured (501)", async () => {
    mockSpeakEndpoint(501, { error: "not configured" });
    render(<SpeakButton text="some answer" language="en" />);

    // One click is enough — the fallback takes over without a second press.
    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));

    await waitFor(() => expect(spokenViaOs).toHaveLength(1));
    expect(spokenViaOs[0].lang).toBe("en-IN");
    expect(played).toBe(0);
  });

  test("falls back to the OS voice when the endpoint errors", async () => {
    mockSpeakEndpoint(502);
    render(<SpeakButton text="some answer" language="en" />);
    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));
    await waitFor(() => expect(spokenViaOs).toHaveLength(1));
  });

  test("surfaces an error only when neither the server nor a browser voice can speak", async () => {
    mockSpeakEndpoint(502);
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    render(<SpeakButton text="some answer" language="hi" />);

    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  test("is disabled for empty answer text", () => {
    render(<SpeakButton text="   " language="en" />);
    expect(screen.getByLabelText(/Read this answer aloud/i)).toBeDisabled();
  });

  test("offers a stop control while busy", async () => {
    render(<SpeakButton text="some answer" language="en" />);
    fireEvent.click(screen.getByLabelText(/Read this answer aloud/i));
    await waitFor(() => expect(screen.getByLabelText(/Stop reading the answer aloud/i)).toBeInTheDocument());
  });
});

describe("pickVoice (fallback path)", () => {
  test("returns null rather than reading Hindi in an English voice", () => {
    expect(pickVoice([voice("en-US"), voice("en-IN")], "hi-IN")).toBeNull();
  });

  test("prefers an exact locale match", () => {
    expect(pickVoice([voice("en-US"), voice("hi-IN")], "hi-IN")?.lang).toBe("hi-IN");
  });
});
