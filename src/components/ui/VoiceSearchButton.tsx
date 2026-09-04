"use client";

import { MicrophoneIcon, AlertTriangleIcon, CheckCircleIcon } from "@/components/ui/icons";
import { useVoiceSearch, VoiceSearchResult } from "@/hooks/useVoiceSearch";

export interface VoiceSearchButtonProps {
  onTranscript: (text: string, result: VoiceSearchResult) => void;
  compact?: boolean;
  disabled?: boolean;
  language?: string;
}

export function VoiceSearchButton({
  onTranscript,
  compact = false,
  disabled = false,
  language = "auto",
}: VoiceSearchButtonProps) {
  const {
    state,
    errorMessage,
    recordingSeconds,
    maxDurationSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    isListening,
    isProcessing,
  } = useVoiceSearch({
    onTranscript,
    language,
    maxDurationSeconds: 30,
  });

  const remainingSeconds = Math.max(0, maxDurationSeconds - recordingSeconds);

  function handleClick() {
    if (disabled) return;
    if (isListening) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  }

  // Determine accessible labels & tooltips
  let label = "Start voice search";
  if (state === "REQUESTING_PERMISSION") label = "Requesting microphone permission…";
  else if (state === "LISTENING") label = `Listening… (${remainingSeconds}s remaining). Click to stop.`;
  else if (state === "STOPPING") label = "Stopping recording…";
  else if (state === "TRANSCRIBING") label = "Transcribing speech…";
  else if (state === "TRANSCRIBED") label = "Voice transcribed successfully!";
  else if (state === "ERROR") label = errorMessage || "Voice search failed. Click to retry.";
  else if (state === "UNAVAILABLE") label = "Voice search is unavailable on this device.";

  return (
    <div className="relative inline-flex items-center">
      {/* Screen reader live announcements for state changes */}
      <span className="sr-only" aria-live="polite" role="status">
        {label}
      </span>

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "UNAVAILABLE" || isProcessing}
        aria-label={label}
        title={label}
        className={`group relative inline-flex shrink-0 items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
          compact ? "h-8 w-8 p-1" : "h-9 w-9 p-1.5"
        } ${
          isListening
            ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
            : isProcessing
            ? "bg-surface-alt text-blue border border-blue-200"
            : state === "ERROR"
            ? "text-amber-600 hover:bg-amber-50"
            : "text-ink-soft hover:bg-surface-alt hover:text-blue"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isListening ? (
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-[10px] font-bold text-red-700 tabular-nums">
              {remainingSeconds}
            </span>
          </div>
        ) : isProcessing ? (
          <svg
            className="h-4 w-4 animate-spin text-blue"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : state === "TRANSCRIBED" ? (
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
        ) : state === "ERROR" ? (
          <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
        ) : (
          <MicrophoneIcon className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} />
        )}
      </button>

      {/* In-flight listening / processing indicator pill */}
      {isListening && (
        <div className="absolute right-full mr-2 hidden sm:flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          <span>Listening… {remainingSeconds}s</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelRecording();
            }}
            className="ml-1 text-red-500 hover:text-red-800 font-bold"
            aria-label="Cancel recording"
          >
            ×
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="absolute right-full mr-2 hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap shadow-xs">
          <span>Transcribing…</span>
        </div>
      )}

      {/* Error tooltip if recording/transcription failed */}
      {state === "ERROR" && errorMessage && (
        <div className="absolute top-full mt-1.5 right-0 z-20 rounded-md bg-white border border-amber-200 px-2.5 py-1 text-xs text-amber-800 shadow-md whitespace-nowrap">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
