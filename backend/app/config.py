import os

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", "4"))
WHISPER_NUM_WORKERS = int(os.getenv("WHISPER_NUM_WORKERS", "1"))
WHISPER_BEAM_SIZE = int(os.getenv("WHISPER_BEAM_SIZE", "5"))
WHISPER_VAD_FILTER = os.getenv("WHISPER_VAD_FILTER", "true").lower() == "true"
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE") or None
WHISPER_TASK = os.getenv("WHISPER_TASK", "transcribe")

SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8010"))

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".mp4", ".webm", ".ogg", ".flac", ".aac",
    ".mpeg", ".mpga", ".wma", ".opus",
}

TEMP_DIR = os.getenv(
    "TEMP_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"),
)
TRANSCRIPTS_DIR = os.getenv(
    "TRANSCRIPTS_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "transcripts"),
)

FFMPEG_BUNDLED_DIR = os.getenv(
    "FFMPEG_BUNDLED_DIR",
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "tools", "ffmpeg", "bin"
    ),
)

BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3005").split(",")
REQUIRE_AUTH_ON_LOCALHOST = (
    os.getenv("REQUIRE_AUTH_ON_LOCALHOST", "false").lower() == "true"
)
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")

MAX_DOWNLOAD_SIZE_MB = int(os.getenv("MAX_DOWNLOAD_SIZE_MB", "520"))
MAX_DOWNLOAD_SIZE_BYTES = MAX_DOWNLOAD_SIZE_MB * 1024 * 1024

_ALLOWED_DOMAINS_ENV = os.getenv("ALLOWED_URL_DOMAINS", "")
ALLOWED_URL_DOMAINS = (
    [d.strip() for d in _ALLOWED_DOMAINS_ENV.split(",") if d.strip()]
    if _ALLOWED_URL_DOMAINS_ENV
    else None
)

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)
