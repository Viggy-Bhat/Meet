from pydantic import BaseModel, HttpUrl
from typing import Optional


class Segment(BaseModel):
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration: float
    segments: list[Segment]


class TranscribeFromUrlRequest(BaseModel):
    file_url: HttpUrl
    language: Optional[str] = None
    task: Optional[str] = None


class UploadResponse(BaseModel):
    id: str
    filename: str
    text: str
    language: str
    duration: float
    segments: list[Segment]
    saved: bool


class TranscriptRecord(BaseModel):
    id: str
    filename: str
    language: str
    duration: float
    text: str
    segments: list[Segment]
    created_at: str


class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    compute_type: str
    ffmpeg_available: bool
    uptime_seconds: float


class ErrorResponse(BaseModel):
    error: str
