"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The Web Speech API's SpeechRecognition interfaces are not (yet) part of
 * TypeScript's standard DOM lib, so they're declared minimally here — only
 * the members this hook actually uses, not the full spec.
 */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// A user-facing message for every error the API can report — never a raw
// error code, and never silently swallowed (see CLAUDE.md: honest
// error/empty states, no invented success).
const ERROR_MESSAGES: Record<string, string> = {
  "no-speech": "No speech was detected. Try again and speak after the mic starts listening.",
  "audio-capture": "No microphone was found. Check that one is connected and enabled.",
  "not-allowed": "Microphone access was denied. Allow microphone access in your browser to use voice input.",
  network: "A network error interrupted voice recognition. Check your connection and try again.",
  aborted: "Voice input was stopped.",
};

export type SpeechRecognitionState =
  | { kind: "idle" }
  | { kind: "listening"; interimTranscript: string }
  // `code` is the raw SpeechRecognition error code, kept alongside the
  // human message so callers can react to specific failures — notably
  // "network", which is what Chromium browsers without Google's speech API
  // key (Brave, Arc, plain Chromium) return for every single attempt, and
  // which means "this browser can never do this", not "try again".
  | { kind: "error"; code: string; message: string };

export interface UseSpeechRecognitionOptions {
  lang: string;
  onResult: (transcript: string) => void;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  state: SpeechRecognitionState;
  start: () => void;
  stop: () => void;
}

/**
 * Thin wrapper around the browser's native SpeechRecognition — no server
 * round-trip, no API key, no LLM credit dependency. `interimResults: true`
 * surfaces partial transcripts as the user speaks so the mic feels
 * responsive instead of waiting for silence before showing anything.
 * `continuous: false`: one utterance per press, matching a search box
 * rather than a dictation tool.
 */
export function useSpeechRecognition({ lang, onResult }: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  // Starts false unconditionally (matching SSR, where `window` doesn't
  // exist) and only reflects the browser's real capability after mount —
  // otherwise a browser that DOES support SpeechRecognition (e.g. Chrome)
  // renders this button's markup on the client but not on the server,
  // which is a hydration mismatch (verified live: this exact bug produced
  // a real "Hydration failed" error before this fix).
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SpeechRecognitionState>({ kind: "idle" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolves a browser capability that doesn't exist during SSR; see the comment on `supported` above
    setSupported(getSpeechRecognitionConstructor() !== null);
  }, []);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setState({ kind: "error", code: "unsupported", message: "Voice input isn't supported in this browser. Try Chrome or Edge." });
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (ev) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }
      if (finalTranscript.trim()) {
        onResultRef.current(finalTranscript.trim());
        setState({ kind: "idle" });
      } else {
        setState({ kind: "listening", interimTranscript });
      }
    };

    recognition.onerror = (ev) => {
      // "aborted" fires on our own deliberate stop()/abort() calls (including
      // the abort() at the top of the next start()) — not a real failure,
      // so it shouldn't surface as an error state to the user.
      if (ev.error === "aborted") return;
      setState({ kind: "error", code: ev.error, message: ERROR_MESSAGES[ev.error] ?? "Voice input failed. Please try again." });
    };

    recognition.onend = () => {
      setState((prev) => (prev.kind === "listening" ? { kind: "idle" } : prev));
    };

    recognitionRef.current = recognition;
    setState({ kind: "listening", interimTranscript: "" });
    recognition.start();
  }, [lang]);

  return { supported, state, start, stop };
}
