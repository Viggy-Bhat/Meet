import json
import logging
import os
import time

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import health, transcription, upload
from app.services.transcriber import transcriber
from app.utils.ffmpeg_check import ensure_ffmpeg
from app.config import CORS_ORIGINS, LOG_FORMAT

if LOG_FORMAT == "json":
    logging.basicConfig(
        level=logging.INFO,
        format=json.dumps(
            {
                "timestamp": "%(asctime)s",
                "level": "%(levelname)s",
                "logger": "%(name)s",
                "message": "%(message)s",
            }
        ),
    )
else:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

logger = logging.getLogger("whisper-server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Meet Whisper Server v2.0.0")

    backend_key = os.getenv("BACKEND_API_KEY", "")
    if not backend_key:
        logger.critical(
            "BACKEND_API_KEY not configured — server will refuse all authenticated requests"
        )

    ffmpeg_path = ensure_ffmpeg()
    if not ffmpeg_path:
        logger.warning("FFmpeg not available — some audio formats may not decode")

    try:
        transcriber.load_model()
    except Exception as e:
        logger.critical("Failed to load Whisper model: %s", e)
        raise

    logger.info(
        "Server ready — model: %s, device: %s",
        transcriber.model_size,
        transcriber.device,
    )

    yield

    logger.info("Shutting down Whisper server")


app = FastAPI(
    title="Meet Whisper Server",
    version="2.0.0",
    description="Local transcription service using faster-whisper",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(transcription.router, tags=["transcription"])
app.include_router(upload.router, tags=["upload"])

if __name__ == "__main__":
    import uvicorn
    from app.config import SERVER_HOST, SERVER_PORT

    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
