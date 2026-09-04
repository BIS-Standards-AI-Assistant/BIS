# Multilingual Speech-to-Text (STT) Implementation

## 1. Architecture Overview

Multilingual voice search in BIS Standards Navigator integrates **BharatSTT** as an external input modality that feeds directly into the existing deterministic RAG search pipeline.

```
[ Microphone Capture ] (Browser MediaRecorder API: audio/webm, audio/mp4, audio/wav)
        ↓
[ Client Validation ] (≤ 30s auto-stop, ≤ 10MB client check, temporary audio memory cleanup)
        ↓
[ POST /api/v1/stt ] (Next.js server endpoint: Rate limiting 20 req/min, MIME & Size validation)
        ↓
[ STTProvider Abstraction ] (src/lib/stt/stt-provider.ts)
        ↓
   ├── BharatSTT HTTP Service (stt_service/ FastAPI bridge @ STT_SERVICE_URL)
   │     ├── Silero VAD (voice activity detection & silence boundary splitting)
   │     ├── faster-whisper (English ASR & Language Identification)
   │     ├── IndicConformer (AI4Bharat NeMo ASR for 22 Indian scripts)
   │     └── Phrase Router & Word-Level Code-Switch Mixer
   │
   └── MockSTTProvider (Deterministic mock for offline dev & CI/CD test suites)
        ↓
[ Raw Multilingual Transcript ] ({ text, language, durationMs, confidence: null })
        ↓
[ Voice Query Normalizer ] (src/lib/stt/voice-normalizer.ts)
   - Normalizes spoken acronyms: "I S 4151" / "आई एस 4151" / "ஐ எஸ் 4151" → "IS 4151"
   - Normalizes BIS terminology: "बी आई एस" / "B I S" → "BIS"
   - Converts Indic numerals: "४१५१" → "4151"
   - Preserves exact transcript without speculative standard number replacement
        ↓
[ Existing Search Input ] (Populates search bar and auto-submits)
        ↓
[ Existing runQueryPipeline() ] (normalizeQuery → Intent → Retrieval → Applicability → Grounding → Knowledge Boundary)
```

There are **no duplicate or parallel search engines** created (`voiceQueryPipeline`, `voiceRagPipeline`, etc. do not exist). Voice search is strictly an input modality into the authoritative BIS engine.

---

## 2. BharatSTT Source & Licenses

- **Repository**: [https://github.com/Dhruvy0804/BharatSTT](https://github.com/Dhruvy0804/BharatSTT)
- **Author**: Dhruv Garg
- **License**: MIT License
- **Component Model Licenses**:
  1. **Silero VAD**: MIT License
  2. **OpenAI Whisper (via faster-whisper)**: MIT License / Apache 2.0 (CTranslate2)
  3. **AI4Bharat IndicConformer**: MIT License (AI4Bharat / NeMo)

---

## 3. Supported Languages

BharatSTT supports **22 Scheduled Indian Languages** + **English** + **Hinglish (Code-Switching)**:

| Language | Code | Script / Native Format |
|---|---|---|
| **English** | `en` | Latin |
| **Hindi** | `hi` | Devanagari |
| **Hinglish (Code-Switching)** | `hi`/`en` | Mixed Latin + Devanagari |
| **Tamil** | `ta` | Tamil |
| **Telugu** | `te` | Telugu |
| **Bengali** | `bn` | Bengali |
| **Marathi** | `mr` | Devanagari |
| **Gujarati** | `gu` | Gujarati |
| **Kannada** | `kn` | Kannada |
| **Malayalam** | `ml` | Malayalam |
| **Punjabi** | `pa` | Gurmukhi |
| **Urdu** | `ur` | Perso-Arabic |
| **Assamese** | `as` | Assamese |
| **Odia** | `or` | Odia |
| **Sanskrit** | `sa` | Devanagari |
| **Nepali** | `ne` | Devanagari |
| **Maithili** | `mai` | Devanagari |
| **Sindhi** | `sd` | Perso-Arabic / Devanagari |
| **Dogri** | `doi` | Devanagari |
| **Konkani** | `kok` | Devanagari |
| **Kashmiri** | `ks` | Perso-Arabic |
| **Santali** | `sat` | Ol Chiki |
| **Bodo** | `brx` | Devanagari |
| **Manipuri** | `mni` | Meetei Mayek / Bengali |

---

## 4. Hardware & Runtime Requirements

- **Runtime**: Python 3.10+, PyTorch, NeMo toolkit, faster-whisper, silero-vad, soundfile.
- **CPU Footprint**: ~1.5 GB RAM footprint with `whisper-small` (int8 quantized) and IndicConformer.
- **CPU Performance**: RTF (Real-Time Factor) $\approx 0.4 - 0.8$ on modern 8-core CPUs (e.g. 5s audio processes in ~2-4s).
- **GPU Performance (Optional)**: RTF $\approx 0.1 - 0.2$ on CUDA-enabled GPUs (e.g. 5s audio processes in ~0.5-1s).
- **Model Sizes**:
  - `whisper-small`: ~480 MB
  - `indic-conformer-600m-multilingual` / `hindi_asr.nemo`: ~600 MB - 1.2 GB
  - `silero-vad`: ~2 MB

---

## 5. Environment Configuration

Add the following variables to `.env.local`:

```env
# --- Speech-to-Text (STT) Configuration ---
# Options: bharatstt | mock | none (default: none)
STT_PROVIDER=bharatstt

# URL of the BharatSTT FastAPI service bridge
STT_SERVICE_URL=http://localhost:8000/transcribe

# Server-side timeout for STT transcription requests in milliseconds (default: 15000)
STT_TIMEOUT_MS=15000

# Maximum audio duration in seconds enforced by client & server (default: 30)
STT_MAX_DURATION_SECONDS=30

# Maximum audio payload size in bytes (default: 10485760 = 10MB)
STT_MAX_AUDIO_BYTES=10485760
```

---

## 6. Security, Privacy & Limits

1. **Strict Payload & Duration Bounds**:
   - Maximum audio duration: **30 seconds** (auto-stops in browser, validated server-side).
   - Maximum audio payload: **10 MB** (rejected with HTTP 413 if exceeded).
2. **MIME Validation**:
   - Only valid audio media types allowed (`audio/webm`, `audio/wav`, `audio/mp4`, `audio/ogg`, `audio/aac`, etc.). Rejected with HTTP 415 otherwise.
3. **Rate Limiting**:
   - Rate-limited to **20 voice transcription requests per minute** per client IP via `src/lib/rate-limit-http.ts`. Exceeded requests return HTTP 429.
4. **Data Privacy & Ephemeral Processing**:
   - No audio files or raw voice recordings are stored permanently on disk or database.
   - Temporary `.wav` files created during audio transcription are immediately unlinked and deleted in `finally` blocks upon completion or failure.
   - No sensitive service credentials or stack traces are leaked in API responses.

---

## 7. Deterministic Voice Query Normalization

Speech recognition output often contains phonetic or spoken abbreviations. `src/lib/stt/voice-normalizer.ts` deterministically normalizes these before passing to the BIS query engine:

- **Spoken IS Acronyms**:
  - English: `"I S 4151"`, `"I.S. 4151"` $\to$ `"IS 4151"`
  - Devanagari: `"आई एस 4151"`, `"आई.एस. 4151"` $\to$ `"IS 4151"`
  - Tamil: `"ஐ எஸ் 4151"` $\to$ `"IS 4151"`
  - Telugu: `"ఐ ఎస్ 4151"` $\to$ `"IS 4151"`
  - Bengali: `"আই এস 14543"` $\to$ `"IS 14543"`
  - Gujarati: `"આઈ એસ 14543"` $\to$ `"IS 14543"`
- **BIS Acronyms**:
  - English: `"B I S"`, `"B.I.S."` $\to$ `"BIS"`
  - Devanagari: `"बी आई एस"`, `"बीआईएस"` $\to$ `"BIS"`
- **Indic Digits Conversion**:
  - Devanagari: `"४१५१"` $\to$ `"4151"`
  - Bengali: `"১৪৫৪৩"` $\to$ `"14543"`
- **Anti-Hallucination & Standard Protection**:
  - Never speculatively guesses or substitutes standard numbers. If a user says an unknown standard (e.g. `"IS 99999:2099"`), the system does not substitute it for a near match; it is evaluated against the Knowledge Boundary and correctly flagged as `NOT_IN_DATABASE`.

---

## 8. Deployment Options

### Option A: Local Python Service
```bash
cd stt_service
pip install -r requirements.txt
python app.py
```

### Option B: Docker Compose
```bash
docker compose --profile stt up --build bharatstt
```

### Option C: Standalone BIS Deployment (Without STT)
If `STT_PROVIDER=none` (or if BharatSTT service is offline), the BIS Navigator continues functioning normally. Text search remains 100% available, and the UI gracefully reports: *"Voice search is currently unavailable. Search by typing."*
