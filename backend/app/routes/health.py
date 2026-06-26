import logging
import time

from fastapi import APIRouter

from app.config import WHISPER_MODEL
from app.models.schemas import HealthResponse
from app.services.transcriber import transcriber
from app.utils.ffmpeg_check import ensure_ffmpeg

logger = logging.getLogger("whisper-server")
router = APIRouter()
_start_time = time.time()
_ffmpeg_available = None


@router.get("/health", response_model=HealthResponse)
async def health():
    global _ffmpeg_available
    if _ffmpeg_available is None:
        _ffmpeg_available = bool(ensure_ffmpeg())

    return HealthResponse(
        status="ok",
        model=transcriber.model_size or WHISPER_MODEL,
        device=transcriber.device or "not_loaded",
        compute_type=transcriber.compute_type or "unknown",
        ffmpeg_available=_ffmpeg_available,
        uptime_seconds=round(time.time() - _start_time, 1),
    )
