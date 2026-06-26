# Troubleshooting

## "Local AI server is not running"

Start the Python backend:
```bash
npm run whisper-server
```

## "No speech detected in the recording"

Check that the file contains actual speech (not just silence). Try a different file.

## "Failed to download file"

The backend will retry 3 times. Check that the UploadThing URL is accessible from the server.

## "FFmpeg not found"

FFmpeg is bundled in `backend/tools/ffmpeg/bin/`. If missing, the backend will attempt to auto-download on Windows. Otherwise install via your system package manager.

## CUDA errors

Set `WHISPER_DEVICE=cpu` to force CPU mode. The server auto-falls back to CPU if CUDA load fails.

## Out of memory

Use a smaller model: `WHISPER_MODEL=tiny` or `WHISPER_MODEL=base`. Reduce `WHISPER_CPU_THREADS`.

## Slow transcription

For GPU: ensure drivers are installed and set `WHISPER_DEVICE=cuda`. For CPU: this is expected — CPU mode prioritizes reliability over speed.
