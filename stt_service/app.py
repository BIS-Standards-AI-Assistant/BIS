"""
BharatSTT FastAPI HTTP Service for BIS Standards Navigator.

Combines:
- Silero VAD (Voice Activity Detection)
- faster-whisper (Multilingual Indian & English ASR + Language Identification)
- Phrase-level routing & normalization
"""

import os
import sys
import tempfile
import time
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import soundfile as sf
import torch
from faster_whisper import WhisperModel

app = FastAPI(title="BharatSTT Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Configuration ──────────────────────────────────────────────────────
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"

whisper_model = None
vad_model = None
vad_utils = None
models_loaded = False
model_load_error = None

print(f"[BharatSTT] Initializing on device={DEVICE} (compute={COMPUTE_TYPE})...")

try:
    print(f"[BharatSTT] Loading faster-whisper ({WHISPER_MODEL_SIZE})...")
    whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    print("[BharatSTT] faster-whisper ready!")

    try:
        print("[BharatSTT] Loading Silero VAD...")
        vad_model, vad_utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            force_reload=False,
            onnx=False,
            trust_repo=True,
        )
        print("[BharatSTT] Silero VAD ready!")
    except Exception as vad_err:
        print(f"[BharatSTT] VAD optional fallback notice: {vad_err}")

    models_loaded = True
    print("[BharatSTT] All models initialized successfully!")
except Exception as e:
    model_load_error = str(e)
    print(f"[BharatSTT] Error initializing models: {e}")


def _to_wav(file_bytes: bytes) -> str:
    """Normalizes any audio format to a 16-bit mono WAV temp file."""
    tmp_in = tempfile.NamedTemporaryFile(suffix=".raw", delete=False)
    tmp_in.write(file_bytes)
    tmp_in.close()

    try:
        audio, sr = sf.read(tmp_in.name)
        if audio.ndim == 2:
            audio = audio.mean(axis=1)
        tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(tmp_wav.name, audio, sr)
        tmp_wav.close()
        return tmp_wav.name
    finally:
        if os.path.exists(tmp_in.name):
            try:
                os.remove(tmp_in.name)
            except OSError:
                pass


@app.get("/health")
def health():
    return {
        "status": "ok" if models_loaded else "degraded",
        "models_loaded": models_loaded,
        "device": DEVICE,
        "whisper_size": WHISPER_MODEL_SIZE,
        "error": model_load_error,
    }


@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
):
    if not models_loaded or whisper_model is None:
        raise HTTPException(
            status_code=503,
            detail=f"BharatSTT models not initialized: {model_load_error}",
        )

    start_time = time.time()
    file_bytes = await audio.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    wav_path = None
    try:
        wav_path = _to_wav(file_bytes)
        forced_lang = None if (not language or language == "auto") else language

        # Transcribe audio using faster-whisper
        segments, info = whisper_model.transcribe(
            wav_path,
            language=forced_lang,
            beam_size=5,
            vad_filter=True, # Built-in VAD filtering in faster-whisper
            vad_parameters=dict(min_silence_duration_ms=200),
        )

        segment_texts = [segment.text.strip() for segment in segments]
        final_transcript = " ".join(segment_texts).strip()

        dominant_lang = info.language if info else (forced_lang or "en")
        elapsed_ms = int((time.time() - start_time) * 1000)

        return {
            "transcript": final_transcript,
            "text": final_transcript,
            "language": dominant_lang,
            "confidence": None, # Never fabricate fake confidence
            "duration_ms": elapsed_ms,
            "route": "bharatstt_whisper_vad",
            "detected_language": dominant_lang,
        }
    except Exception as e:
        print(f"[BharatSTT] Transcription exception: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[BharatSTT] Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
