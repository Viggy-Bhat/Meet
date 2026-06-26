import os

from slowapi import Limiter
from slowapi.util import get_remote_address

_RATE_LIMIT_STORAGE = os.getenv("RATE_LIMIT_STORAGE", "memory://")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=_RATE_LIMIT_STORAGE,
)
