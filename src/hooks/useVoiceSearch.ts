"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { STTState } from "@/lib/stt/stt-types";

export interface VoiceSearchResult {
  text: string;
  rawText?: string;
  language?: string;
  confidence?: number | null;
  durationMs?: number;
  provider?: string;
  transformations?: string[];
}

export interface UseVoiceSearchOptions {
  onTranscript: (text: string, result: VoiceSearchResult) => void;
  language?: string;
  maxDurationSeconds?: number;
}

export function useVoiceSearch({
  onTranscript,
  language = "auto",
  maxDurationSeconds = 30,
}: UseVoiceSearchOptions) {
  const [state, setState] = useState<STTState>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setRecordingSeconds(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    cleanupStream();
    setState("IDLE");
    setErrorMessage(null);
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setState("STOPPING");
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupStream();
        setState("ERROR");
        setErrorMessage("Failed to stop recording cleanly.");
      }
    }
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);

    // 1. Check browser support
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setState("UNAVAILABLE");
      setErrorMessage("Voice search is not supported in this browser.");
      return;
    }

    setState("REQUESTING_PERMISSION");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select optimal supported MIME type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime } : undefined
      );
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: selectedMime || "audio/webm",
        });

        if (audioBlob.size === 0) {
          cleanupStream();
          setState("ERROR");
          setErrorMessage("No audio recorded. Please try again.");
          return;
        }

        setState("TRANSCRIBING");

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "voice-query.webm");
          if (language && language !== "auto") {
            formData.append("language", language);
          }

          const res = await fetch("/api/v1/stt", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned ${res.status}`);
          }

          const data: VoiceSearchResult = await res.json();
          setState("TRANSCRIBED");

          if (data.text) {
            onTranscript(data.text, data);
          } else {
            setErrorMessage("Could not transcribe any speech. Please try again.");
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setState("ERROR");
          setErrorMessage(
            msg.includes("Voice search is currently unavailable")
              ? "Voice search is currently unavailable. Search by typing."
              : "Voice transcription failed. You can type your query instead."
          );
        } finally {
          cleanupStream();
          // Reset to IDLE after brief delay so user sees transcribed state
          setTimeout(() => {
            setState((curr) => (curr === "TRANSCRIBED" ? "IDLE" : curr));
          }, 1500);
        }
      };

      recorder.start(250); // Collect data chunks every 250ms
      startTimeRef.current = Date.now();
      setState("LISTENING");
      setRecordingSeconds(0);

      // Countdown / Duration limit
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= maxDurationSeconds) {
          stopRecording();
        }
      }, 500);
    } catch (err: unknown) {
      cleanupStream();
      setState("ERROR");
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setErrorMessage("Microphone access was denied. You can continue by typing.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setErrorMessage("No microphone found on your device.");
      } else {
        setErrorMessage("Could not start microphone. You can search by typing.");
      }
    }
  }, [cleanupStream, language, maxDurationSeconds, onTranscript, stopRecording]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    state,
    errorMessage,
    recordingSeconds,
    maxDurationSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    isListening: state === "LISTENING",
    isProcessing: state === "STOPPING" || state === "UPLOADING" || state === "TRANSCRIBING",
  };
}
