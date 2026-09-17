"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Read-aloud via the server's /api/v1/speak endpoint.
 *
 * Synthesis runs on the server so the browser only ever fetches a small
 * audio file — no model download per visitor, which was the measured
 * failure of the in-browser approach this replaces.
 */

export type ServerTtsState =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "speaking" }
  /** `unavailable` distinguishes "this deployment has no TTS configured"
   *  (HTTP 501) from a real failure, so the caller can fall back quietly
   *  instead of showing an error for an intentional configuration. */
  | { kind: "error"; message: string; unavailable: boolean };

export interface UseServerTtsOptions {
  language: string;
}

export interface UseServerTtsResult {
  state: ServerTtsState;
  speak: (text: string) => void;
  stop: () => void;
}

export function useServerTts({ language }: UseServerTtsOptions): UseServerTtsResult {
  const [state, setState] = useState<ServerTtsState>({ kind: "idle" });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setState({ kind: "idle" });
  }, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      cleanup();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setState({ kind: "generating" });
        const res = await fetch("/api/v1/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setState({
            kind: "error",
            unavailable: res.status === 501,
            message:
              res.status === 501
                ? "Read-aloud isn't configured on this deployment."
                : res.status === 429
                  ? `Too many read-aloud requests. Please wait ${res.headers.get("Retry-After") ?? "a few"} seconds.`
                  : (body?.error ?? "Could not read this answer aloud."),
          });
          return;
        }

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const el = new Audio(url);
        audioRef.current = el;
        el.onended = () => {
          cleanup();
          setState({ kind: "idle" });
        };
        el.onerror = () => {
          cleanup();
          setState({ kind: "error", unavailable: false, message: "Could not play the audio." });
        };
        setState({ kind: "speaking" });
        await el.play();
      } catch (err) {
        // An abort is our own stop(), not a failure worth reporting.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({
          kind: "error",
          unavailable: false,
          message: "Could not reach the read-aloud service. Check your connection.",
        });
      }
    },
    [language, cleanup],
  );

  return { state, speak: (t: string) => void speak(t), stop };
}
