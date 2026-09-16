"use client";

import { useEffect, useRef } from "react";
import { SpeakerIcon, SpeakerStopIcon } from "@/components/ui/icons";
import { useServerTts } from "@/lib/speech/useServerTts";
import { useSpeechSynthesis } from "@/lib/speech/useSpeechSynthesis";

/**
 * Reads a generated answer aloud. Pairs with VoiceInputButton: ask by
 * speaking, hear the answer back — which matters for a public service used
 * by people with limited literacy or sight, and costs nothing per call.
 *
 * Audio is synthesized server-side (/api/v1/speak) so the browser fetches
 * only a small file. Two earlier approaches were measured and rejected:
 * in-browser Kokoro cost every visitor a large model download AND ships no
 * Hindi voice, and OS voices alone leave Hindi unavailable on many devices.
 *
 * The browser's own speechSynthesis is kept strictly as a fallback for when
 * the endpoint is unconfigured or unreachable — the same "degrade to
 * something honest rather than fail" pattern used for evidence-only answers
 * and the local seed corpus elsewhere in this app.
 */
export function SpeakButton({
  text,
  language = "en",
  className = "",
}: {
  text: string;
  /** Language of `text` — pass the response's answerLanguage, not the UI language. */
  language?: string;
  className?: string;
}) {
  const server = useServerTts({ language });
  const fallback = useSpeechSynthesis({ language });
  // A ref, not state: this is a one-shot handoff between two external
  // systems, never rendered, so it must not trigger a re-render.
  const pendingTextRef = useRef<string | null>(null);

  const serverFailed = server.state.kind === "error";

  // Auto-fallback: when the server can't synthesize, hand the same text to the
  // OS voice immediately rather than leaving the user with a dead button —
  // the same failover shape VoiceInputButton uses for speech recognition.
  // Deciding by attempt rather than by predicting whether the OS has a
  // usable voice, because "no voices reported yet" and "no voices at all"
  // are indistinguishable until synthesis is actually tried.
  useEffect(() => {
    if (!serverFailed) return;
    const queued = pendingTextRef.current;
    if (queued === null) return;
    pendingTextRef.current = null;
    if (fallback.supported) fallback.speak(queued);
  }, [serverFailed, fallback]);

  const busy =
    server.state.kind === "generating" ||
    server.state.kind === "speaking" ||
    fallback.state.kind === "speaking";

  const speaking = server.state.kind === "speaking" || fallback.state.kind === "speaking";

  function onClick() {
    if (busy) {
      server.stop();
      fallback.stop();
      return;
    }
    if (serverFailed) {
      // Already known to be unavailable this session — go straight to the OS voice.
      if (fallback.supported) fallback.speak(text);
      return;
    }
    pendingTextRef.current = text;
    server.speak(text);
  }

  const status = server.state.kind === "generating" ? "Preparing audio…" : null;

  // Show the fallback's failure when it has one; otherwise the server's,
  // but only when there's no fallback at all — a working fallback silently
  // supersedes a server error.
  const errorMessage =
    fallback.state.kind === "error"
      ? fallback.state.message
      : serverFailed && !fallback.supported
        ? server.state.kind === "error"
          ? server.state.message
          : null
        : null;

  const disabled = !text.trim();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={speaking ? "Stop reading the answer aloud" : "Read this answer aloud"}
        aria-pressed={speaking}
        title={busy ? (status ?? "Stop reading") : "Read this answer aloud"}
        className={`rounded-md p-1.5 transition-colors ${
          busy
            ? "bg-blue/10 text-blue"
            : "text-ink-faint hover:bg-surface-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
        }`}
      >
        {speaking || busy ? <SpeakerStopIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
      </button>

      {/* The first play downloads the model, which is slow enough that
          silence would read as a broken button. */}
      {status && (
        <span aria-live="polite" className="text-[10.5px] leading-tight text-ink-faint">
          {status}
        </span>
      )}

      {errorMessage && (
        <span role="alert" className="text-[10.5px] leading-tight text-ink-faint">
          {errorMessage}
        </span>
      )}
    </span>
  );
}
