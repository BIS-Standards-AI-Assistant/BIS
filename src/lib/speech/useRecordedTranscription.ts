"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fallback voice capture for browsers where the Web Speech API is missing
 * or non-functional: records with MediaRecorder, uploads to
 * /api/v1/transcribe, returns the transcript.
 *
 * Unlike the Web Speech path there are no interim results — the transcript
 * only exists once the server has processed the whole clip — so the UI
 * shows a "transcribing" state rather than pretending to stream.
 */

export type RecordingState =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "transcribing" }
  | { kind: "error"; message: string };

export interface UseRecordedTranscriptionOptions {
  language: string;
  onResult: (transcript: string) => void;
}

export interface UseRecordedTranscriptionResult {
  supported: boolean;
  state: RecordingState;
  start: () => void;
  stop: () => void;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function useRecordedTranscription({
  language,
  onResult,
}: UseRecordedTranscriptionOptions): UseRecordedTranscriptionResult {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecordingState>({ kind: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef(onResult);
  const languageRef = useRef(language);

  useEffect(() => {
    onResultRef.current = onResult;
    languageRef.current = language;
  }, [onResult, language]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, unavailable during SSR
    setSupported(isSupported());
  }, []);

  const cleanup = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const upload = useCallback(async (blob: Blob) => {
    setState({ kind: "transcribing" });
    try {
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      form.append("language", languageRef.current);

      const res = await fetch("/api/v1/transcribe", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;

      if (!res.ok) {
        setState({
          kind: "error",
          message:
            res.status === 501
              ? "Voice input isn't available in this browser, and server-side transcription isn't configured for this deployment."
              : res.status === 429
                ? `Too many voice requests. Please wait ${res.headers.get("Retry-After") ?? "a few"} seconds and try again.`
                : (body?.error ?? "Transcription failed. Please try again."),
        });
        return;
      }
      if (!body?.text) {
        setState({ kind: "error", message: "No speech was detected. Please try again." });
        return;
      }
      onResultRef.current(body.text);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error", message: "Could not reach the transcription service. Check your connection." });
    }
  }, []);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setState({ kind: "error", message: "This browser cannot record audio." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanup();
        if (blob.size > 0) void upload(blob);
        else setState({ kind: "error", message: "No audio was captured. Please try again." });
      };

      recorderRef.current = recorder;
      recorder.start();
      setState({ kind: "recording" });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setState({
        kind: "error",
        message:
          name === "NotAllowedError"
            ? "Microphone access was denied. Allow microphone access to use voice input."
            : name === "NotFoundError"
              ? "No microphone was found. Check that one is connected and enabled."
              : "Could not start recording. Please try again.",
      });
    }
  }, [cleanup, upload]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  return { supported, state, start: () => void start(), stop };
}
