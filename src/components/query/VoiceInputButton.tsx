"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/ui/icons";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import { useRecordedTranscription } from "@/lib/speech/useRecordedTranscription";
import { VOICE_LANGUAGES, localeForLanguage } from "@/lib/speech/locales";
import { useLanguage } from "@/components/providers/LanguageProvider";

const VOICE_LANG_STORAGE_KEY = "bis-voice-lang";

/**
 * Web Speech API failures that mean "this browser can never do this",
 * as opposed to a transient problem worth retrying:
 * - "network": Chromium builds without Google's private speech API key
 *   (Brave, Arc, plain Chromium) return this on every attempt.
 * - "service-not-allowed": the UA refuses the speech service outright.
 * Either one switches this component to server-side transcription for the
 * rest of the session.
 */
const UNRECOVERABLE_SPEECH_ERRORS = new Set(["network", "service-not-allowed", "unsupported"]);

function readStoredVoiceLang(fallback: string): string {
  try {
    return window.localStorage.getItem(VOICE_LANG_STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Voice input with two interchangeable engines behind one button:
 *
 * 1. The browser's Web Speech API — instant, free, streams interim results.
 * 2. Server-side transcription (/api/v1/transcribe) — used when the first
 *    is missing or non-functional. Slower (no interim results) but works
 *    in Brave, Arc, plain Chromium and Firefox.
 *
 * The switch is automatic and happens on the first unrecoverable failure,
 * so the user isn't asked to understand which engine their browser has.
 *
 * Language selection is deliberately decoupled from LanguageProvider's
 * `LangCode` ("en"|"hi" — the languages with a translated UI): both engines
 * can transcribe more Indian languages than the UI is translated into.
 * Whether the *search pipeline* understands a language is a separate fact,
 * surfaced per-option in the picker below.
 */
export function VoiceInputButton({
  onResult,
  className = "",
  iconClassName = "h-4 w-4",
}: {
  onResult: (transcript: string) => void;
  className?: string;
  iconClassName?: string;
}) {
  const { lang: uiLang } = useLanguage();
  const [voiceLang, setVoiceLang] = useState<string>(uiLang);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [useServerEngine, setUseServerEngine] = useState(false);
  const autoSwitchedRef = useRef(false);

  useEffect(() => {
    // localStorage can't be read during SSR, so this starts at uiLang
    // (matching server-rendered output) and picks up the stored preference
    // after mount. Mount-only: once the user picks a voice language, later
    // UI language toggles shouldn't silently override it.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates from localStorage, unreadable during SSR
    setVoiceLang(readStoredVoiceLang(uiLang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const webSpeech = useSpeechRecognition({ lang: localeForLanguage(voiceLang), onResult });
  const recorded = useRecordedTranscription({ language: voiceLang, onResult });

  // Failover: the moment the Web Speech engine reports an unrecoverable
  // error, switch engines and immediately start recording instead, so the
  // user's click still produces a transcript rather than a dead end.
  useEffect(() => {
    if (useServerEngine || autoSwitchedRef.current) return;
    if (webSpeech.state.kind !== "error") return;
    if (!UNRECOVERABLE_SPEECH_ERRORS.has(webSpeech.state.code)) return;
    if (!recorded.supported) return;

    autoSwitchedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to an external engine's failure, not deriving state
    setUseServerEngine(true);
    recorded.start();
  }, [webSpeech.state, recorded, useServerEngine]);

  const engine = useServerEngine ? recorded : webSpeech;

  // Hidden entirely when neither engine can work — an honest absence
  // rather than a button that does nothing.
  if (!webSpeech.supported && !recorded.supported) return null;

  const busy = engine.state.kind === "recording" || engine.state.kind === "listening";
  const transcribing = engine.state.kind === "transcribing";
  const interim = webSpeech.state.kind === "listening" ? webSpeech.state.interimTranscript : "";
  const activeLabel = VOICE_LANGUAGES.find((l) => l.code === voiceLang)?.label ?? "English";

  function selectVoiceLang(code: string) {
    setVoiceLang(code);
    setPickerOpen(false);
    try {
      window.localStorage.setItem(VOICE_LANG_STORAGE_KEY, code);
    } catch {
      // best-effort only — the choice still applies for this session
    }
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => (busy ? engine.stop() : engine.start())}
        disabled={transcribing}
        aria-label={busy ? "Stop voice input" : `Start voice input (${activeLabel})`}
        aria-pressed={busy}
        title={transcribing ? "Transcribing…" : busy ? "Listening…" : `Speak your search (${activeLabel})`}
        className={`rounded-md p-1.5 transition-colors ${
          busy
            ? "animate-pulse bg-blue/10 text-blue"
            : transcribing
              ? "text-blue opacity-60"
              : "text-ink-faint hover:bg-surface-alt hover:text-ink"
        }`}
      >
        <MicIcon className={iconClassName} />
      </button>

      <button
        type="button"
        onClick={() => setPickerOpen((o) => !o)}
        aria-label={`Voice input language: ${activeLabel}. Change language.`}
        className="rounded-md px-1 text-[10px] font-medium text-ink-faint hover:text-ink"
      >
        {voiceLang.toUpperCase()}
      </button>

      {interim && (
        <div className="absolute -top-9 left-0 whitespace-nowrap rounded-md bg-navy-deep px-2.5 py-1.5 text-[12px] text-white shadow-md">
          {interim}
        </div>
      )}

      {transcribing && (
        <div className="absolute -top-9 left-0 whitespace-nowrap rounded-md bg-navy-deep px-2.5 py-1.5 text-[12px] text-white shadow-md">
          Transcribing…
        </div>
      )}

      {engine.state.kind === "error" && (
        <div
          role="alert"
          className="absolute -top-9 left-0 max-w-60 whitespace-normal rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] text-white shadow-md"
        >
          {engine.state.message}
        </div>
      )}

      {pickerOpen && (
        <ul
          role="listbox"
          aria-label="Voice input language"
          className="absolute right-0 top-full z-10 mt-1 max-h-56 w-40 overflow-y-auto rounded-lg border border-border bg-surface-raised py-1 shadow-lg"
        >
          {VOICE_LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === voiceLang}
                onClick={() => selectVoiceLang(l.code)}
                className={`flex w-full flex-col px-3 py-1.5 text-left text-[12.5px] hover:bg-surface-alt ${
                  l.code === voiceLang ? "text-blue" : "text-ink"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span>{l.label}</span>
                  <span className="text-ink-faint">{l.nativeLabel}</span>
                </span>
                {!l.queryUnderstandingSupported && (
                  // The mic transcribes this language, but search does not
                  // understand it — say so rather than let the picker imply
                  // full support.
                  <span className="text-[10.5px] leading-tight text-ink-faint">Speech only — search not supported</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
