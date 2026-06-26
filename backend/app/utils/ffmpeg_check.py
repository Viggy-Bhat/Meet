import logging
import os
import platform
import shutil
import zipfile
from urllib.request import urlopen

from app.config import FFMPEG_BUNDLED_DIR

logger = logging.getLogger("whisper-server")

FFMPEG_DOWNLOAD_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"


def get_install_instructions():
    system = platform.system()
    if system == "Windows":
        return (
            "Install FFmpeg: winget install Gyan.FFmpeg  "
            "or download from https://ffmpeg.org/download.html"
        )
    elif system == "Darwin":
        return "Install FFmpeg: brew install ffmpeg"
    else:
        return "Install FFmpeg: sudo apt install ffmpeg"


def _get_bundled_exe_path():
    if FFMPEG_BUNDLED_DIR:
        return os.path.join(FFMPEG_BUNDLED_DIR, "ffmpeg.exe")
    return None


def _try_bundled():
    bundled_exe = _get_bundled_exe_path()
    if bundled_exe and os.path.exists(bundled_exe):
        bin_dir = os.path.dirname(bundled_exe)
        current_path = os.environ.get("PATH", "")
        if bin_dir not in current_path.split(os.pathsep):
            os.environ["PATH"] = bin_dir + os.pathsep + current_path
        logger.info("FFmpeg found (bundled): %s", bundled_exe)
        return bundled_exe
    return None


def _download_and_extract(target_dir: str) -> bool:
    """Download FFmpeg essentials build and extract ffmpeg.exe + ffprobe.exe."""
    try:
        os.makedirs(target_dir, exist_ok=True)
        zip_path = os.path.join(target_dir, "ffmpeg-download.zip")

        logger.info("Downloading FFmpeg from %s ...", FFMPEG_DOWNLOAD_URL)
        with urlopen(FFMPEG_DOWNLOAD_URL, timeout=120) as resp:
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            chunk_size = 1024 * 1024
            with open(zip_path, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total and downloaded % (5 * chunk_size) < chunk_size:
                        pct = downloaded / total * 100
                        logger.info("FFmpeg download: %.1f%%", pct)

        logger.info("Extracting FFmpeg to %s ...", target_dir)
        with zipfile.ZipFile(zip_path, "r") as zf:
            # Find the bin/ directory inside the zip
            bin_members = [
                m for m in zf.namelist() if m.endswith("bin/ffmpeg.exe")
            ]
            if not bin_members:
                logger.error(
                    "Could not find ffmpeg.exe inside the downloaded zip"
                )
                return False

            # Path inside zip: ffmpeg-7.x.x-essentials_build/bin/ffmpeg.exe
            bin_prefix = bin_members[0].replace("bin/ffmpeg.exe", "")
            needed = ["bin/ffmpeg.exe", "bin/ffprobe.exe"]
            extracted = []
            for name in needed:
                full_name = bin_prefix + name
                if full_name in zf.namelist():
                    dest = os.path.join(
                        target_dir, os.path.basename(name)
                    )
                    with zf.open(full_name) as src, open(dest, "wb") as dst:
                        dst.write(src.read())
                    extracted.append(dest)
                    logger.info("Extracted: %s", dest)

        try:
            os.remove(zip_path)
        except OSError:
            pass

        return len(extracted) > 0

    except Exception as e:
        logger.error("Failed to auto-install FFmpeg: %s", e, exc_info=True)
        return False


def ensure_ffmpeg():
    """
    1. Check PATH for ffmpeg.
    2. Check bundled location.
    3. Auto-download on Windows if missing.
    Returns the absolute path to ffmpeg.exe or None.
    """
    # 1. Already in PATH?
    system_path = shutil.which("ffmpeg")
    if system_path:
        logger.info("FFmpeg found in PATH: %s", system_path)
        return system_path

    # 2. Check bundled
    bundled = _try_bundled()
    if bundled:
        return bundled

    # 3. Auto-download on Windows
    system = platform.system()
    if system == "Windows" and FFMPEG_BUNDLED_DIR:
        logger.info("FFmpeg not found — attempting auto-download...")
        ok = _download_and_extract(FFMPEG_BUNDLED_DIR)
        if ok:
            bundled = _try_bundled()
            if bundled:
                logger.info("FFmpeg auto-installed successfully")
                return bundled

    logger.warning(
        "FFmpeg not available. Audio/video decoding may fail. %s",
        get_install_instructions(),
    )
    return None
