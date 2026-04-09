"""In-memory sliding window rate limiter.

Configurable via NEXURAL_RATE_LIMIT (requests per minute, default 120).
Returns 429 with Retry-After header when exceeded.
Upgradable to Redis by swapping the storage backend.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

_RATE_LIMIT = int(os.environ.get("NEXURAL_RATE_LIMIT", "600"))  # per minute (600 default for dev/test, lower in production)
_WINDOW_SECONDS = 60.0


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding window rate limiter."""

    def __init__(self, app, rate_limit: int | None = None):
        super().__init__(app)
        self.rate_limit = rate_limit or _RATE_LIMIT
        self.window = _WINDOW_SECONDS
        # IP -> list of request timestamps
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _client_key(self, request: Request) -> str:
        """Extract client identifier (IP or forwarded header)."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, key: str, now: float) -> None:
        """Remove timestamps older than the window."""
        cutoff = now - self.window
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks
        if request.url.path.startswith("/api/health"):
            return await call_next(request)

        key = self._client_key(request)
        now = time.time()
        self._cleanup(key, now)

        remaining = self.rate_limit - len(self._requests[key])

        if remaining <= 0:
            oldest = min(self._requests[key]) if self._requests[key] else now
            retry_after = int(self.window - (now - oldest)) + 1
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded ({self.rate_limit}/min). Try again in {retry_after}s."},
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.rate_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + retry_after)),
                },
            )

        self._requests[key].append(now)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))
        return response
