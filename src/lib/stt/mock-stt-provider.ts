import {
  AudioInput,
  STTOptions,
  STTProvider,
  STTResult,
} from "./stt-types";

export interface MockSTTConfig {
  defaultTranscript?: string;
  defaultLanguage?: string;
  simulateLatencyMs?: number;
  shouldFail?: boolean;
  failureError?: Error;
}

export class MockSTTProvider implements STTProvider {
  readonly name = "mock" as const;
  private config: MockSTTConfig;

  constructor(config: MockSTTConfig = {}) {
    this.config = {
      defaultTranscript: "What is the certification process for IS 4151?",
      defaultLanguage: "en",
      simulateLatencyMs: 50,
      ...config,
    };
  }

  setConfig(config: Partial<MockSTTConfig>) {
    this.config = { ...this.config, ...config };
  }

  async isAvailable(): Promise<boolean> {
    return !this.config.shouldFail;
  }

  async transcribe(audio: AudioInput, options?: STTOptions): Promise<STTResult> {
    if (this.config.shouldFail) {
      throw this.config.failureError || new Error("Mock STT provider failure");
    }

    if (this.config.simulateLatencyMs && this.config.simulateLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulateLatencyMs));
    }

    const lang = options?.language && options.language !== "auto"
      ? options.language
      : this.config.defaultLanguage || "en";

    return {
      text: this.config.defaultTranscript || "",
      language: lang,
      confidence: null, // BharatSTT does not claim fake confidence
      durationMs: audio.durationMs || 1500,
      provider: "mock",
      metadata: {
        mock: true,
        inputSize: audio.buffer.length,
        mimeType: audio.mimeType,
      },
    };
  }
}
