import asyncio
import ipaddress
import logging
import os
import re
import socket
import uuid
import aiofiles
import shutil

from urllib.parse import urlparse

import httpx

from app.config import (
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
    MAX_DOWNLOAD_SIZE_BYTES,
    ALLOWED_URL_DOMAINS,
    TEMP_DIR,
)

logger = logging.getLogger("whisper-server")

CHUNK_SIZE = 1024 * 1024  # 1 MB
DOWNLOAD_TIMEOUT = 300    # 5 minutes for large files
DOWNLOAD_RETRIES = 3
DOWNLOAD_RETRY_DELAY = 2  # seconds


def sanitize_filename(filename):
    if not filename:
        return f"upload_{uuid.uuid4().hex}"

    name = os.path.basename(filename)

    name = re.sub(r'[\\/:*?"<>|]', "_", name)

    if name.startswith("."):
        name = "_" + name[1:]

    safe = re.sub(r"[^a-zA-Z0-9._\-]", "_", name)
    safe = re.sub(r"_+", "_", safe)
    safe = safe.strip("_") or "upload"

    return safe


def generate_unique_name(filename):
    safe = sanitize_filename(filename)
    name, ext = os.path.splitext(safe)
    ext = ext.lower()
    if not ext or ext not in ALLOWED_EXTENSIONS:
        ext = ".mp3"
    return f"{uuid.uuid4().hex}_{name}{ext}"


def validate_upload(filename, file_size_bytes):
    if not filename:
        raise ValueError("No filename provided")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    if file_size_bytes > MAX_UPLOAD_SIZE_BYTES:
        max_mb = MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise ValueError(f"File too large. Maximum size is {max_mb}MB")


def validate_url(url: str):
    hostname = urlparse(url).hostname
    if not hostname:
        raise ValueError("No hostname found in URL")

    if ALLOWED_URL_DOMAINS:
        allowed = any(hostname.endswith(domain) for domain in ALLOWED_URL_DOMAINS)
        if not allowed:
            raise ValueError(
                f"Domain '{hostname}' is not allowed. "
                f"Allowed domains: {', '.join(ALLOWED_URL_DOMAINS)}"
            )

    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise ValueError(f"Cannot resolve hostname: {hostname}")

    for family, _type, _proto, _canonname, sockaddr in addr_infos:
        try:
            ip = ipaddress.ip_address(sockaddr[0])
        except ValueError:
            continue

        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise ValueError(
                f"Blocked IP address: {ip} (private/reserved range)"
            )

        if isinstance(ip, ipaddress.IPv6Address):
            if ip.ipv4_mapped or ip.sixtofour or ip.teredo:
                raise ValueError(
                    f"Blocked IPv6 address: {ip} (IPv4-mapped / Teredo / 6to4)"
                )


def _get_content_length_bytes(response):
    cl = response.headers.get("content-length")
    if cl is not None:
        try:
            return int(cl)
        except (ValueError, TypeError):
            pass
    return None


async def save_upload(upload_file, filename):
    file_path = os.path.join(TEMP_DIR, filename)

    try:
        async with aiofiles.open(file_path, "wb") as f:
            while True:
                chunk = await upload_file.read(CHUNK_SIZE)
                if not chunk:
                    break
                await f.write(chunk)
    except Exception:
        try:
            os.remove(file_path)
        except OSError:
            pass
        raise

    return file_path


async def download_file_from_url(url: str, dest_path: str) -> str:
    """
    Stream-download a remote file to disk without loading it into memory.
    Includes retry logic, progress logging, SSRF protection, and size limits.
    Returns the final file path.
    """
    validate_url(url)

    logger.info("Starting download from URL: %s", url)

    last_error = None
    for attempt in range(1, DOWNLOAD_RETRIES + 1):
        try:
            async with httpx.AsyncClient(follow_redirects=False, timeout=DOWNLOAD_TIMEOUT) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()

                    content_length = _get_content_length_bytes(response)
                    if content_length and content_length > MAX_DOWNLOAD_SIZE_BYTES:
                        raise ValueError(
                            f"Content-Length {content_length / (1024 * 1024):.1f}MB "
                            f"exceeds max download size {MAX_DOWNLOAD_SIZE_BYTES // (1024 * 1024)}MB"
                        )

                    total_size = 0
                    last_logged = 0
                    async with aiofiles.open(dest_path, "wb") as f:
                        async for chunk in response.aiter_bytes(CHUNK_SIZE):
                            if chunk:
                                total_size += len(chunk)
                                if total_size > MAX_DOWNLOAD_SIZE_BYTES:
                                    raise ValueError(
                                        f"Download exceeded max size of "
                                        f"{MAX_DOWNLOAD_SIZE_BYTES // (1024 * 1024)}MB"
                                    )
                                await f.write(chunk)
                                if total_size - last_logged >= 50 * 1024 * 1024:
                                    logger.info(
                                        "Downloaded %.1f MB so far...",
                                        total_size / (1024 * 1024),
                                    )
                                    last_logged = total_size

                    logger.info(
                        "Download complete: %s (%d bytes, %.1f MB)",
                        dest_path,
                        total_size,
                        total_size / (1024 * 1024),
                    )
                    return dest_path

        except httpx.HTTPStatusError as e:
            last_error = e
            logger.error(
                "Download attempt %d/%d failed — HTTP %s (%s)",
                attempt,
                DOWNLOAD_RETRIES,
                e.response.status_code,
                e.response.reason_phrase,
            )
            if attempt < DOWNLOAD_RETRIES:
                logger.info("Retrying download in %ds...", DOWNLOAD_RETRY_DELAY)
                await asyncio.sleep(DOWNLOAD_RETRY_DELAY)
        except httpx.RequestError as e:
            last_error = e
            logger.error(
                "Download attempt %d/%d failed — network error: %s",
                attempt,
                DOWNLOAD_RETRIES,
                str(e)
            )
            if attempt < DOWNLOAD_RETRIES:
                logger.info("Retrying download in %ds...", DOWNLOAD_RETRY_DELAY)
                await asyncio.sleep(DOWNLOAD_RETRY_DELAY)
        except Exception as e:
            last_error = e
            logger.error(
                "Download attempt %d/%d failed: %s",
                attempt,
                DOWNLOAD_RETRIES,
                str(e),
                exc_info=True
            )
            if attempt < DOWNLOAD_RETRIES:
                logger.info("Retrying download in %ds...", DOWNLOAD_RETRY_DELAY)
                await asyncio.sleep(DOWNLOAD_RETRY_DELAY)
        finally:
            # If something went wrong on this attempt, clean up partial file before retry
            if last_error is not None and os.path.exists(dest_path):
                try:
                    os.remove(dest_path)
                except OSError:
                    pass

    # All retries exhausted
    if isinstance(last_error, httpx.HTTPStatusError):
        raise ValueError(
            f"Failed to download file after {DOWNLOAD_RETRIES} attempts: "
            f"HTTP {last_error.response.status_code}"
        )
    elif isinstance(last_error, httpx.RequestError):
        raise ValueError(
            f"Failed to download file after {DOWNLOAD_RETRIES} attempts: {str(last_error)}"
        )
    else:
        raise ValueError(
            f"Failed to download file after {DOWNLOAD_RETRIES} attempts: {str(last_error)}"
        )


def delete_file(file_path):
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.debug("Deleted temp file: %s", file_path)
    except OSError as e:
        logger.warning("Failed to delete temp file %s: %s", file_path, e)
