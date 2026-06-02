# Meet Whisper Server

Local transcription service for the Meet app. Uses **faster-whisper** (CTranslate2) for fast, offline transcription with no cloud dependencies.

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | |
| FFmpeg | any recent | Required for audio decoding. Bundled in `tools/ffmpeg/bin/` and auto-detected. |
| CUDA (optional) | 11.8+ | For GPU acceleration. Auto-detected. Defaults to CPU. |

## Quick Start (Windows)

```bat
cd backend
setup.bat
```

Or manually:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

## Quick Start (macOS / Linux)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

## Quick Start (Docker) — Recommended for production

```bash
cd backend
cp .env.example .env
# Edit .env and set BACKEND_API_KEY
nano .env
docker compose up -d --build
```

**GPU Mode:**
```bash
docker compose -f docker-compose.gpu.yml up -d --build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full production deployment guide.

## From the Next.js project root

```bash
npm run whisper-server
```

## Install FFmpeg

FFmpeg is **bundled** in `tools/ffmpeg/bin/` for Windows. The server auto-detects it. If missing on Windows, it will attempt to auto-download.

| OS | Command |
|---|---|
| Windows | `choco install ffmpeg` or bundled binary |
| macOS | `brew install ffmpeg` |
| Ubuntu/Debian | `sudo apt install ffmpeg` |
| Fedora | `sudo dnf install ffmpeg` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `WHISPER_MODEL` | `base` | Model size: `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE` | `cpu` | `cpu`, `cuda`, or `auto` (detect automatically) |
| `WHISPER_COMPUTE_TYPE` | `int8` | `int8` (CPU), `float16` (GPU), or `auto` |
| `WHISPER_CPU_THREADS` | `4` | Number of CPU threads for inference |
| `WHISPER_NUM_WORKERS` | `1` | Number of model workers |
| `WHISPER_BEAM_SIZE` | `5` | Beam search width (higher = more accurate, slower) |
| `WHISPER_VAD_FILTER` | `true` | Enable voice activity detection |
| `WHISPER_LANGUAGE` | *(auto-detect)* | Force language code: `en`, `hi`, `ta`, `te`, `kn`, etc. |
| `MAX_UPLOAD_SIZE_MB` | `500` | Maximum file size in megabytes |
| `BACKEND_API_KEY` | *(none)* | API key for non-localhost access to `/upload` endpoint |
| `SERVER_PORT` | `8010` | Server port |
| `SERVER_HOST` | `0.0.0.0` | Server host binding |
| `BACKEND_API_KEY` | *(required)* | API key for authentication (server refuses to start without it) |
| `REQUIRE_AUTH_ON_LOCALHOST` | `false` | Always require API key even on localhost |
| `CORS_ORIGINS` | `http://localhost:3005` | Allowed CORS origins (comma-separated) |
| `ALLOWED_URL_DOMAINS` | *(none)* | Whitelist domains for URL downloads (e.g. `utfs.io,ufs.sh`) |
| `MAX_DOWNLOAD_SIZE_MB` | `520` | Max file size for URL downloads |
| `RATE_LIMIT_TRANSCRIBE` | `5/minute` | Rate limit for transcription endpoints |
| `RATE_LIMIT_UPLOAD` | `10/minute` | Rate limit for upload endpoint |
| `LOG_FORMAT` | `text` | `text` or `json` for structured logging |
| `TEMP_DIR` | `backend/uploads/` | Override temporary file directory |
| `TRANSCRIPTS_DIR` | `backend/transcripts/` | Override transcript storage directory |

**Important:** The defaults are safe CPU-only (`cpu`/`int8`). Set `WHISPER_DEVICE=cuda` and `WHISPER_COMPUTE_TYPE=float16` to enable GPU acceleration. The server auto-falls back to CPU if CUDA load fails.

## Model Selection Guide

| Model | RAM | Speed (CPU) | Quality | Best For |
|---|---|---|---|---|
| `tiny` | ~1 GB | Very fast | Low | Quick drafts, testing |
| `base` | ~1 GB | Fast | Moderate | **Default** — good balance |
| `small` | ~2 GB | Moderate | Good | Production, important meetings |
| `medium` | ~5 GB | Slow | Very good | High-quality transcripts |
| `large-v3` | ~10 GB | Very slow | Excellent | GPU recommended, best accuracy |

Use `.en` variants (e.g., `small.en`) for English-only workloads — they're slightly faster and more accurate for English.

## GPU (CUDA) Setup

1. Install NVIDIA CUDA Toolkit 11.8+ from [developer.nvidia.com](https://developer.nvidia.com/cuda-downloads)
2. Install cuDNN from [developer.nvidia.com/cudnn](https://developer.nvidia.com/cudnn)

The server auto-detects available GPUs when `WHISPER_DEVICE=auto`. To force GPU:

```bash
WHISPER_DEVICE=cuda WHISPER_COMPUTE_TYPE=float16 python -m uvicorn app.main:app
```

## API Reference

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "model": "base",
  "device": "cpu",
  "compute_type": "int8",
  "ffmpeg_available": true,
  "uptime_seconds": 123.4
}
```

### Transcribe from URL (Primary endpoint)

```bash
POST /transcribe-from-url
Content-Type: application/json

{
  "file_url": "https://ufs.sh/f/abc123",
  "language": null,
  "task": "transcribe"
}
```

The backend **streams the download directly** from the provided URL to disk without loading it into memory. Progress is logged every 50MB. The download has 3 retry attempts with 2s delay on failure.

Response:
```json
{
  "text": "full transcript text...",
  "language": "en",
  "duration": 45.2,
  "segments": [
    {"start": 0.0, "end": 3.1, "text": "Hello everyone"},
    {"start": 3.1, "end": 8.5, "text": "let's begin the meeting"}
  ]
}
```

**How it works:**
1. Receives UploadThing (or any) file URL
2. Derives temp filename (falls back to `.mp3` if URL has no extension)
3. Stream-downloads to temp directory via `httpx`
4. Validates file size and extension
5. Runs faster-whisper transcription
6. Persists transcript JSON to `transcripts/` directory
7. Cleans up temp file in `finally` block
8. Returns structured response

### Transcribe (Legacy endpoint)

```bash
POST /transcribe
Content-Type: multipart/form-data

file: recording.mp4
```

Optional query params: `?language=hi&task=transcribe`

Kept for backward compatibility. The primary flow uses `/transcribe-from-url`.

### Direct Upload (standalone use)

```bash
POST /upload
Content-Type: multipart/form-data
X-API-Key: <your-backend-api-key>

file: meeting.mp4
```

Response:
```json
{
  "id": "a1b2c3d4e5f6",
  "filename": "meeting.mp4",
  "text": "full transcript...",
  "language": "en",
  "duration": 120.5,
  "segments": [...],
  "saved": true
}
```

### Get Saved Transcript

```bash
GET /transcript/{id}
```

### Get Transcript as SRT Subtitles

```bash
GET /transcript/{id}/srt
```

Returns `text/plain` response in SRT subtitle format.

## Testing with curl

```bash
# Health check
curl http://localhost:8010/health

# Transcribe from URL (primary)
curl -X POST http://localhost:8010/transcribe-from-url \
  -H "Content-Type: application/json" \
  -d '{"file_url": "https://example.com/recording.mp4"}'

# Transcribe a local file (legacy)
curl -X POST http://localhost:8010/transcribe \
  -F "file=@recording.mp4"

# Direct upload with auth
curl -X POST http://localhost:8010/upload \
  -H "X-API-Key: your-key-here" \
  -F "file=@meeting.mp4"

# Get saved transcript
curl http://localhost:8010/transcript/a1b2c3d4e5f6

# Download SRT
curl http://localhost:8010/transcript/a1b2c3d4e5f6/srt

# Transcribe with forced language
curl -X POST "http://localhost:8010/transcribe?language=hi" \
  -F "file=@hindi_meeting.mp4"
```

## Security Features

- **Fail-closed authentication**: Server refuses to start without `BACKEND_API_KEY`
- **SSRF protection**: URL validation with DNS resolution, IP blocklisting, no redirect following
- **Rate limiting**: Configurable per-endpoint rate limits via slowapi
- **Restrictive CORS**: Configurable origins (not wildcard)
- **File validation**: Extension allowlist, size limits, streaming byte counter
- **Container hardening**: Non-root user, resource limits, tmpfs for temp files

See [SECURITY.md](SECURITY.md) for full threat model and security architecture.

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry, CORS, lifespan
│   ├── config.py            # Environment-based configuration
│   ├── routes/
│   │   ├── health.py        # GET /health
│   │   ├── transcription.py # POST /transcribe, /transcribe-from-url
│   │   └── upload.py        # POST /upload, GET /transcript/{id}
│   ├── services/
│   │   ├── transcriber.py   # Singleton WhisperModel, transcribe(), SRT export
│   │   └── storage.py       # Transcript JSON file persistence
│   ├── models/
│   │   └── schemas.py       # Pydantic response models
│   └── utils/
│       ├── auth.py          # API key verification
│       ├── file_handler.py  # Upload validation, stream download, retry logic
│       └── ffmpeg_check.py  # FFmpeg detection + auto-download
├── uploads/                 # Temporary upload staging (.gitkeep)
├── transcripts/             # Persistent transcript JSON files (.gitkeep)
├── requirements.txt
├── setup.bat
├── start.bat                # GPU mode launcher
└── README.md
```

## Troubleshooting

### "No speech detected in the recording"
- Verify the audio file contains actual speech (not just silence).
- Try a smaller VAD `min_silence_duration_ms` value.
- Ensure the FFmpeg codec can decode your file format.

### "FFmpeg not found"
- FFmpeg is bundled in `tools/ffmpeg/bin/` for Windows.
- On other systems, install via your package manager (see above).
- The server will start but some formats (MP4, WAV with uncommon codecs) may fail.

### CUDA errors
- Ensure CUDA toolkit and cuDNN are installed and compatible.
- Set `WHISPER_DEVICE=cpu` to force CPU mode.
- The server auto-falls back to CPU if CUDA load fails.

### Out of memory
- Use a smaller model (`WHISPER_MODEL=tiny` or `WHISPER_MODEL=base`).
- Reduce `WHISPER_CPU_THREADS` to lower memory pressure.
- Close other memory-intensive applications.

### Slow transcription
- For GPU: ensure `WHISPER_DEVICE=cuda` and drivers are working.
- For CPU: reduce `WHISPER_BEAM_SIZE` to 1-3 for faster (less accurate) results.
- Use a smaller model size.

### Download failures
- The backend retries 3 times with 2s delay.
- Check network connectivity to the URL.
- Ensure the URL returns a valid file (not a redirect loop or auth wall).

## Integration with Next.js

The Next.js app (`lib/ai/whisper.js`) calls this server's `/transcribe-from-url` endpoint. Set `WHISPER_SERVER_URL` in `.env` (defaults to `http://localhost:8010`). No API key is required for localhost requests — auth auto-bypasses for `127.0.0.1`.

### Flow

```
Next.js server action
  → POST /transcribe-from-url
    → { file_url: "https://ufs.sh/f/abc123" }
  → Backend streams download to disk
  → Backend transcribes with faster-whisper
  → Backend cleans up temp file
  → Returns { text, language, duration, segments }
```
