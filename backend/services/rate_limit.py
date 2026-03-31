"""Simple in-memory rate limiter (per process)
Note: For production at scale, back with Redis.
"""
import time
from threading import Lock
from fastapi import HTTPException


class RateLimiter:
    def __init__(self):
        self._store = {}
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int, message: str):
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            if not entry or now >= entry["reset_at"]:
                self._store[key] = {"count": 1, "reset_at": now + window_seconds}
                return
            if entry["count"] >= limit:
                retry_after = int(entry["reset_at"] - now)
                raise HTTPException(
                    status_code=429,
                    detail=message,
                    headers={"Retry-After": str(max(retry_after, 1))}
                )
            entry["count"] += 1


rate_limiter = RateLimiter()
