"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { localeForLanguage } from "./locales";

/**
 * Read-aloud for generated answers, via the browser's built-in
 * speechSynthesis. Tier 0 by construction (docs/ui/SIH.md §23): no server,
 * no model download, no API key, no cost.
 *
 * Unlike SpeechRecognition — which Brave/Arc/plain Chromium expose but
 * cannot use, since they ship without Google's speech API key — synthesis
 * runs against locally installed OS voices, so it works in those browsers
 * and in Firefox.
 *
 * The honest part: a voice for the requested language may simply not be
 * installed. Hindi voices in particular are absent on many systems. When
 * that happens this hook reports `unsupportedLanguage` rather than
 * speaking, because the browser's fallback behaviour is to read Devanagari
 * text with an English voice, which produces confident-sounding nonsense —
 * exactly the kind of fake competence this project's rules forbid.
 */

export type SpeechSynthesisState =
  | { kind: "idle" }
  | { kind: "speaking" }
  | { kind: "error"; message: string };

export interface UseSpeechSynthesisOptions {
  /** App language code ("en" | "hi" | ...), mapped to a BCP-47 locale internally. */
  language: string;
}

export interface UseSpeechSynthesisResult {
  supported: boolean;
  /** True when synthesis exists but no installed voice matches `language`. */
  unsupportedLanguage: boolean;
  state: SpeechSynthesisState;
  speak: (text: string) => void;
  stop: () => void;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/** Some Android browsers report voice languages as "hi_IN"; BCP-47 uses "hi-IN". */
function normalizeLang(lang: string): string {
  return lang.replace(/_/g, "-").toLowerCase();
}

/**
 * Picks the best installed voice for a locale: an exact match first
 * ("hi-IN"), then any voice for the same base language ("hi-*"). Returns
 * null rather than a wrong-language voice — see the note above.
 */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const normalized = normalizeLang(locale);
  const base = normalized.split("-")[0];

  const exact = voices.find((v) => normalizeLang(v.lang) === normalized);
  if (exact) return exact;

  const sameLanguage = voices.find((v) => normalizeLang(v.lang).split("-")[0] === base);
  return sameLanguage ?? null;
}

export function useSpeechSynthesis({ language }: UseSpeechSynthesisOptions): UseSpeechSynthesisResult {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<SpeechSynthesisState>({ kind: "idle" });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const s = synth();
    if (!s) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, unavailable during SSR
    setSupported(true);

    // Chrome populates the voice list asynchronously; getVoices() is often
    // empty on first call, so the event is the reliable signal.
    const load = () => setVoices(s.getVoices());
    load();
    s.addEventListener("voiceschanged", load);
    return () => {
      s.removeEventListener("voiceschanged", load);
      s.cancel();
    };
  }, []);

  const locale = localeForLanguage(language);
  const voice = voices.length > 0 ? pickVoice(voices, locale) : null;
  // Only claim a language is unsupported once voices have actually loaded —
  // an empty list means "not ready yet", not "nothing installed".
  const unsupportedLanguage = supported && voices.length > 0 && voice === null;

  const stop = useCallback(() => {
    utteranceRef.current = null;
    synth()?.cancel();
    setState({ kind: "idle" });
  }, []);

  const speak = useCallback(
    (text: string) => {
      const s = synth();
      if (!s) {
        setState({ kind: "error", message: "Read-aloud isn't supported in this browser." });
        return;
      }
      if (!text.trim()) return;

      const chosen = voices.length > 0 ? pickVoice(voices, locale) : null;
      if (voices.length > 0 && !chosen) {
        setState({
          kind: "error",
          message: `No ${locale} voice is installed on this device, so this answer can't be read aloud accurately.`,
        });
        return;
      }

      // Cancel anything in flight; overlapping utterances queue up and talk
      // over each other otherwise.
      s.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = chosen?.lang ?? locale;
      if (chosen) utterance.voice = chosen;
      // The cancel() above makes the previous utterance fire "interrupted"
      // (or, in Safari, "end") asynchronously — after this one has started.
      // Only the current utterance may change state, or that late event
      // would flip the button back to idle mid-sentence.
      const isCurrent = () => utteranceRef.current === utterance;
      utterance.onend = () => {
        if (isCurrent()) setState({ kind: "idle" });
      };
      utterance.onerror = (ev) => {
        if (!isCurrent()) return;
        // "interrupted"/"canceled" fire from our own cancel() calls — an
        // expected stop, not a failure worth showing the user.
        if (ev.error === "interrupted" || ev.error === "canceled") {
          setState({ kind: "idle" });
          return;
        }
        setState({ kind: "error", message: "Could not read this answer aloud. Please try again." });
      };

      utteranceRef.current = utterance;
      setState({ kind: "speaking" });
      s.speak(utterance);
    },
    [voices, locale],
  );

  return { supported, unsupportedLanguage, state, speak, stop };
}
