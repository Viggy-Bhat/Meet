import logging
import os
import re
import uuid

from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse

from app.config import WHISPER_LANGUAGE, WHISPER_TASK, RATE_LIMIT_UPLOAD
from app.limiter import limiter
from app.models.schemas import UploadResponse, TranscriptRecord, ErrorResponse
from app.services.transcriber import transcriber, _seconds_to_srt_time
from app.services.storage import save_transcript, get_transcript
from app.utils.auth import verify_api_key

_VALID_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
from app.utils.file_handler import (
    validate_upload,
    generate_unique_name,
    save_upload,
    delete_file,
)

logger = logging.getLogger("whisper-server")
router = APIRouter()


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
@limiter.limit(RATE_LIMIT_UPLOAD)
async def upload(
    request: Request,
    file: UploadFile = File(...),
    language: str = Query(default=None),
    task: str = Query(default=None),
):
    verify_api_key(request, require_on_localhost=True)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    try:
        validate_upload(file.filename, file.size or 0)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    safe_name = generate_unique_name(file.filename)
    file_path = None

    try:
        file_path = await save_upload(file, safe_name)

        actual_size = file_path and os.path.getsize(file_path) or 0
        if actual_size == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        lang = language or WHISPER_LANGUAGE
        t = task or WHISPER_TASK

        result = transcriber.transcribe(file_path, language=lang, task=t)

        transcript_id = uuid.uuid4().hex[:12]
        record = save_transcript(transcript_id, file.filename, result)

        return UploadResponse(
            id=record["id"],
            filename=record["filename"],
            text=record["text"],
            language=record["language"],
            duration=record["duration"],
            segments=record["segments"],
            saved=True,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Upload processing failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if file_path:
            delete_file(file_path)


@router.get(
    "/transcript/{transcript_id}",
    response_model=TranscriptRecord,
    responses={404: {"model": ErrorResponse}},
)
async def get_transcript_by_id(transcript_id: str, request: Request):
    verify_api_key(request, require_on_localhost=False)

    if not _VALID_ID_RE.match(transcript_id):
        raise HTTPException(status_code=400, detail="Invalid transcript ID format")

    record = get_transcript(transcript_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return TranscriptRecord(
        id=record["id"],
        filename=record["filename"],
        language=record["language"],
        duration=record["duration"],
        text=record["text"],
        segments=record["segments"],
        created_at=record["created_at"],
    )


@router.get(
    "/transcript/{transcript_id}/srt",
    responses={404: {"model": ErrorResponse}},
)
async def get_transcript_srt(transcript_id: str, request: Request):
    verify_api_key(request, require_on_localhost=False)

    if not _VALID_ID_RE.match(transcript_id):
        raise HTTPException(status_code=400, detail="Invalid transcript ID format")

    record = get_transcript(transcript_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    srt_lines = []
    for i, seg in enumerate(record["segments"], 1):
        start_ts = _seconds_to_srt_time(seg["start"])
        end_ts = _seconds_to_srt_time(seg["end"])
        srt_lines.append(str(i))
        srt_lines.append(f"{start_ts} --> {end_ts}")
        srt_lines.append(seg["text"])
        srt_lines.append("")

    return PlainTextResponse(
        content="\n".join(srt_lines),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={transcript_id}.srt"},
    )
