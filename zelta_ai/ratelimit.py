"""Small in-process rate limiter (sliding window). One instance per process.

Cloud Run may run several instances, so the effective limit is per instance. It blunts abuse and runaway loops;
it is not a substitute for an edge/API-gateway limit. The clock is injectable for tests.
"""
from __future__ import annotations

import hashlib
import time
from collections import deque
from typing import Callable, Deque, Dict, Optional

from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self, limit: int, window_s: float, clock: Callable[[], float] = time.monotonic,
                 max_keys: int = 10_000):
        if limit < 1 or window_s <= 0:
            raise ValueError("limit must be >= 1 and window_s > 0")
        self.limit, self.window, self._clock, self._max_keys = limit, window_s, clock, max_keys
        self._hits: Dict[str, Deque[float]] = {}

    def allow(self, key: str) -> bool:
        now = self._clock()
        q = self._hits.setdefault(key, deque())
        while q and now - q[0] >= self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        if len(self._hits) > self._max_keys:          # bound memory: drop idle keys
            for k in [k for k, v in self._hits.items() if not v or now - v[-1] >= self.window]:
                self._hits.pop(k, None)
        return True


def client_key(request: Request) -> str:
    """Key by the presented API key (hashed) when present, else by client address."""
    api_key = request.headers.get("x-api-key")
    if api_key:
        return "k:" + hashlib.sha256(api_key.encode()).hexdigest()[:16]
    return "ip:" + (request.client.host if request.client else "unknown")


def rate_limit(limiter: Optional[RateLimiter] = None, limit: int = 60, window_s: float = 60.0):
    """FastAPI dependency factory: `Depends(rate_limit(limit=30, window_s=60))`."""
    lim = limiter or RateLimiter(limit, window_s)

    def dependency(request: Request) -> None:
        if not lim.allow(client_key(request)):
            raise HTTPException(status_code=429, detail="rate limited", headers={"Retry-After": str(int(lim.window))})
    dependency.limiter = lim          # type: ignore[attr-defined]
    return dependency
