import logging
import os

from fastapi import Request, HTTPException

from app.config import BACKEND_API_KEY, REQUIRE_AUTH_ON_LOCALHOST

logger = logging.getLogger("whisper-server")

LOCALHOST_HOSTS = {"127.0.0.1", "::1", "localhost"}


def is_localhost(request: Request):
    host = request.client.host if request.client else ""
    return host in LOCALHOST_HOSTS


def verify_api_key(request: Request, require_on_localhost=False):
    use_require_on_localhost = REQUIRE_AUTH_ON_LOCALHOST or require_on_localhost

    if is_localhost(request) and not use_require_on_localhost:
        if not BACKEND_API_KEY:
            logger.warning(
                "BACKEND_API_KEY not configured, allowing localhost request without auth"
            )
        return

    if not BACKEND_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="BACKEND_API_KEY not configured. Set it for authenticated requests.",
        )

    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != BACKEND_API_KEY:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Invalid or missing API key"
        )
