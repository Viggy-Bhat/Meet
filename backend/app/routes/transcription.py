import logging
import os
import uuid
from tempfile import gettempdir

from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Query

from app.config import WHISPER_LANGUAGE, WHISPER_TASK, RATE_LIMIT_TRANSCRIBE
from app.limiter import limiter
from app.models.schemas import (
    TranscribeResponse,
    TranscribeFromUrlRequest,
    ErrorResponse,
)
from app.services.transcriber import transcriber
from app.services.storage import save_transcript
from app.utils.auth import verify_api_key
from app.utils.file_handler import (
    validate_upload,
    generate_unique_name,
    save_upload,
    download_file_from_url,
    delete_file,
)

logger = logging.getLogger("whisper-server")
router = APIRouter()


# ---------------------------------------------------------------------------
# Legacy endpoint — kept for backward compatibility
# ---------------------------------------------------------------------------
@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
@limiter.limit(RATE_LIMIT_TRANSCRIBE)
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    language: str = Query(default=None),
    task: str = Query(default=None),
):
    verify_api_key(request, require_on_localhost=False)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content_type = file.content_type or "application/octet-stream"

    temp_filename = generate_unique_name(file.filename)
    temp_path = None

    try:
        temp_path = os.path.join(gettempdir(), temp_filename)
        await save_upload_to_path(file, temp_path)

        actual_size = os.path.getsize(temp_path)
        if actual_size == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        try:
            validate_upload(file.filename, actual_size)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        lang = language or WHISPER_LANGUAGE
        t = task or WHISPER_TASK

        result = transcriber.transcribe(temp_path, language=lang, task=t)

        return TranscribeResponse(
            text=result["text"],
            language=result["language"],
            duration=result["duration"],
            segments=result["segments"],
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Transcription failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path:
            delete_file(temp_path)


async def save_upload_to_path(upload_file, file_path):
    content = await upload_file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    with open(file_path, "wb") as f:
        f.write(content)


# ---------------------------------------------------------------------------
# New endpoint — backend downloads the file directly from a remote URL
# ---------------------------------------------------------------------------
@router.post(
    "/transcribe-from-url",
    response_model=TranscribeResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
@limiter.limit(RATE_LIMIT_TRANSCRIBE)
async def transcribe_from_url(
    request: Request,
    payload: TranscribeFromUrlRequest,
):
    verify_api_key(request, require_on_localhost=False)

    file_url = str(payload.file_url)
    logger.info("Transcribe-from-url request: %s", file_url)

    # Derive a filename from the URL path
    original_name = file_url.split("/")[-1].split("?")[0] or "recording.mp4"
    temp_filename = generate_unique_name(original_name)
    temp_path = os.path.join(gettempdir(), temp_filename)

    try:
        # Stream-download from the remote URL directly to disk
        await download_file_from_url(file_url, temp_path)

        actual_size = os.path.getsize(temp_path)
        if actual_size == 0:
            raise HTTPException(status_code=400, detail="Downloaded file is empty")

        try:
            # Validate using temp_filename (guaranteed to have a valid extension
            # because generate_unique_name() falls back to .mp3 when the URL
            # path does not contain one, e.g. UploadThing URLs).
            validate_upload(temp_filename, actual_size)
        except ValueError as e:
            logger.error("Upload validation failed: %s", str(e))
            raise HTTPException(status_code=400, detail=str(e))

        lang = payload.language or WHISPER_LANGUAGE
        t = payload.task or WHISPER_TASK

        logger.info("Starting transcription for: %s", temp_path)
        result = transcriber.transcribe(temp_path, language=lang, task=t)

        logger.info(
            "Transcription successful — lang=%s, duration=%.1fs, segments=%d",
            result["language"],
            result["duration"],
            len(result.get("segments", [])),
        )

        # Persist transcript to disk for recovery
        transcript_id = uuid.uuid4().hex[:12]
        try:
            save_transcript(transcript_id, original_name, result)
        except Exception as persist_err:
            logger.warning("Failed to persist transcript to disk: %s", persist_err)

        return TranscribeResponse(
            text=result["text"],
            language=result["language"],
            duration=result["duration"],
            segments=result["segments"],
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Transcription-from-URL failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        delete_file(temp_path)
