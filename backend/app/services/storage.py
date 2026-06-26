import json
import logging
import os
import re

from datetime import datetime, timezone

from app.config import TRANSCRIPTS_DIR

logger = logging.getLogger("whisper-server")

_VALID_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def _validate_transcript_id(transcript_id):
    if not _VALID_ID_RE.match(transcript_id):
        raise ValueError(f"Invalid transcript ID: {transcript_id}")


def save_transcript(transcript_id, filename, result):
    _validate_transcript_id(transcript_id)

    record = {
        "id": transcript_id,
        "filename": filename,
        "language": result["language"],
        "duration": result["duration"],
        "text": result["text"],
        "segments": result["segments"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    file_path = os.path.join(TRANSCRIPTS_DIR, f"{transcript_id}.json")

    os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)

    logger.info("Transcript saved: %s", file_path)
    return record


def get_transcript(transcript_id):
    _validate_transcript_id(transcript_id)

    file_path = os.path.join(TRANSCRIPTS_DIR, f"{transcript_id}.json")

    if not os.path.exists(file_path):
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def delete_transcript(transcript_id):
    _validate_transcript_id(transcript_id)

    file_path = os.path.join(TRANSCRIPTS_DIR, f"{transcript_id}.json")

    if os.path.exists(file_path):
        os.remove(file_path)
        logger.info("Transcript deleted: %s", file_path)
        return True
    return False
