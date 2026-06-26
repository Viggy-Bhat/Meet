import logging

from faster_whisper import WhisperModel

from app.config import (
    WHISPER_MODEL,
    WHISPER_DEVICE,
    WHISPER_COMPUTE_TYPE,
    WHISPER_CPU_THREADS,
    WHISPER_NUM_WORKERS,
    WHISPER_BEAM_SIZE,
    WHISPER_VAD_FILTER,
)

logger = logging.getLogger("whisper-server")

SUPPORTED_MODELS = {"tiny", "tiny.en", "base", "base.en", "small", "small.en",
                    "medium", "medium.en", "large-v1", "large-v2", "large-v3"}


def _detect_device_and_compute():
    device = WHISPER_DEVICE
    compute = WHISPER_COMPUTE_TYPE

    if device == "auto":
        try:
            import pynvml
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            pynvml.nvmlShutdown()
            if device_count > 0:
                device = "cuda"
                logger.info("CUDA GPU detected — enabling CUDA acceleration")
            else:
                device = "cpu"
                logger.info("No GPU detected — using CPU mode")
        except Exception:
            device = "cpu"
            logger.info("pynvml unavailable — using CPU mode")

    if compute == "auto":
        compute = "float16" if device == "cuda" else "int8"

    return device, compute


class TranscriberService:
    _instance = None

    def __init__(self):
        self.model = None
        self.model_size = None
        self.device = None
        self.compute_type = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        if self.model is not None:
            return

        model_size = WHISPER_MODEL
        if model_size not in SUPPORTED_MODELS:
            raise ValueError(
                f"Unknown model size: {model_size}. "
                f"Choose from: {', '.join(sorted(SUPPORTED_MODELS))}"
            )

        device, compute_type = _detect_device_and_compute()

        logger.info(
            "Loading Whisper model: %s on %s (%s), cpu_threads=%d, num_workers=%d",
            model_size, device, compute_type, WHISPER_CPU_THREADS, WHISPER_NUM_WORKERS,
        )

        try:
            self.model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type,
                cpu_threads=WHISPER_CPU_THREADS,
                num_workers=WHISPER_NUM_WORKERS,
            )
        except Exception as e:
            if device == "cuda":
                logger.warning(
                    "CUDA model load failed (%s), falling back to CPU", e
                )
                device = "cpu"
                compute_type = "int8"
                self.model = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    cpu_threads=WHISPER_CPU_THREADS,
                    num_workers=WHISPER_NUM_WORKERS,
                )
                logger.info("Falling back from CUDA to CPU — model reloaded successfully")
            else:
                raise

        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type

        if device == "cuda":
            logger.info("Using CUDA acceleration — model: %s, compute: %s", model_size, compute_type)
        else:
            logger.info("Using CPU mode — model: %s, compute: %s", model_size, compute_type)

    def transcribe(self, file_path, language=None, task=None, beam_size=None,
                   vad_filter=None):
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        language = language or None
        task = task or "transcribe"
        beam_size = beam_size or WHISPER_BEAM_SIZE
        vad_filter = vad_filter if vad_filter is not None else WHISPER_VAD_FILTER

        vad_params = dict(min_silence_duration_ms=500) if vad_filter else None

        segments, info = self.model.transcribe(
            file_path,
            beam_size=beam_size,
            language=language,
            task=task,
            vad_filter=vad_filter,
            vad_parameters=vad_params,
        )

        seg_list = [
            {"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()}
            for seg in segments
        ]

        full_text = " ".join(s["text"] for s in seg_list).strip()

        if not full_text:
            raise ValueError("No speech detected in the recording")

        logger.info(
            "Transcription complete: language=%s, duration=%.1fs, segments=%d",
            info.language, info.duration, len(seg_list),
        )

        return {
            "text": full_text,
            "language": info.language,
            "duration": round(info.duration, 2),
            "segments": seg_list,
        }

    def transcribe_to_srt(self, file_path, language=None, task=None):
        result = self.transcribe(file_path, language=language, task=task)
        return self._segments_to_srt(result["segments"])

    @staticmethod
    def _segments_to_srt(segments):
        lines = []
        for i, seg in enumerate(segments, 1):
            start_ts = _seconds_to_srt_time(seg["start"])
            end_ts = _seconds_to_srt_time(seg["end"])
            lines.append(str(i))
            lines.append(f"{start_ts} --> {end_ts}")
            lines.append(seg["text"])
            lines.append("")
        return "\n".join(lines)


def _seconds_to_srt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


transcriber = TranscriberService.get_instance()
