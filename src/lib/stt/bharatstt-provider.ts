import {
  AudioInput,
  STTOptions,
  STTProvider,
  STTResult,
} from "./stt-types";

export interface BharatSTTConfig {
  serviceUrl?: string;
  timeoutMs?: number;
}

export class BharatSTTProvider implements STTProvider {
  readonly name = "bharatstt" as const;
  private serviceUrl: string;
  private timeoutMs: number;

  constructor(config?: BharatSTTConfig) {
    this.serviceUrl =
      config?.serviceUrl ||
      process.env.STT_SERVICE_URL ||
      "http://localhost:8000/transcribe";
    this.timeoutMs =
      config?.timeoutMs ||
      Number(process.env.STT_TIMEOUT_MS) ||
      15000;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.serviceUrl) return false;
    try {
      // Check health endpoint on BharatSTT service
      const healthUrl = this.serviceUrl.replace(/\/transcribe\/?$/, "/health");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async transcribe(audio: AudioInput, options?: STTOptions): Promise<STTResult> {
    if (!this.serviceUrl) {
      throw new Error("STT_SERVICE_UNCONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeoutMs || this.timeoutMs
    );

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audio.buffer)], { type: audio.mimeType });
      formData.append("audio", blob, audio.fileName || "audio.wav");

      if (options?.language && options.language !== "auto") {
        formData.append("language", options.language);
      }

      const res = await fetch(this.serviceUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("AUDIO_PAYLOAD_TOO_LARGE");
        }
        if (res.status === 415) {
          throw new Error("UNSUPPORTED_AUDIO_FORMAT");
        }
        throw new Error(`BHARATSTT_HTTP_${res.status}`);
      }

      const data = await res.json();
      return {
        text: data.text || data.transcript || "",
        language: data.language || data.detected_language || options?.language || "hi",
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        durationMs: data.durationMs || data.duration_ms,
        provider: "bharatstt",
        metadata: {
          route: data.route,
          mixerApplied: data.mixer_applied,
        },
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new Error("STT_TIMEOUT");
        }
        throw err;
      }
      throw new Error("STT_UNKNOWN_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
