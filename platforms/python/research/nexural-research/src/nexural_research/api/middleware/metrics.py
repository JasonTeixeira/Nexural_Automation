"""Prometheus-compatible metrics endpoint and request instrumentation.

Exposes /metrics in Prometheus text exposition format.
No external dependency required — uses plain text output.
"""

from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import PlainTextResponse, Response

from nexural_research.api.cache import cache
from nexural_research.api.sessions import sessions


class _Metrics:
    """Simple metrics collector — no Prometheus library needed."""

    def __init__(self):
        self.request_count: dict[str, int] = defaultdict(int)
        self.request_duration_sum: dict[str, float] = defaultdict(float)
        self.request_errors: dict[str, int] = defaultdict(int)
        self.status_counts: dict[int, int] = defaultdict(int)

    def record(self, method: str, path: str, status: int, duration: float) -> None:
        key = f"{method} {path}"
        self.request_count[key] += 1
        self.request_duration_sum[key] += duration
        self.status_counts[status] += 1
        if status >= 400:
            self.request_errors[key] += 1

    def exposition(self) -> str:
        """Generate Prometheus text exposition format."""
        lines = []
        lines.append("# HELP nexural_requests_total Total number of HTTP requests")
        lines.append("# TYPE nexural_requests_total counter")
        for key, count in sorted(self.request_count.items()):
            method, path = key.split(" ", 1)
            lines.append(f'nexural_requests_total{{method="{method}",path="{path}"}} {count}')

        lines.append("")
        lines.append("# HELP nexural_request_duration_seconds_sum Total request duration")
        lines.append("# TYPE nexural_request_duration_seconds_sum counter")
        for key, dur in sorted(self.request_duration_sum.items()):
            method, path = key.split(" ", 1)
            lines.append(f'nexural_request_duration_seconds_sum{{method="{method}",path="{path}"}} {dur:.4f}')

        lines.append("")
        lines.append("# HELP nexural_http_status_total HTTP status code counts")
        lines.append("# TYPE nexural_http_status_total counter")
        for status, count in sorted(self.status_counts.items()):
            lines.append(f'nexural_http_status_total{{status="{status}"}} {count}')

        lines.append("")
        lines.append("# HELP nexural_active_sessions Number of active analysis sessions")
        lines.append("# TYPE nexural_active_sessions gauge")
        lines.append(f"nexural_active_sessions {len(sessions)}")

        cache_stats = cache.stats
        lines.append("")
        lines.append("# HELP nexural_cache_hits_total Cache hit count")
        lines.append("# TYPE nexural_cache_hits_total counter")
        lines.append(f"nexural_cache_hits_total {cache_stats['hits']}")
        lines.append("# HELP nexural_cache_misses_total Cache miss count")
        lines.append("# TYPE nexural_cache_misses_total counter")
        lines.append(f"nexural_cache_misses_total {cache_stats['misses']}")

        return "\n".join(lines) + "\n"


# Global metrics instance
metrics = _Metrics()


class MetricsMiddleware(BaseHTTPMiddleware):
    """Record request count, duration, and status codes."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path == "/metrics":
            return PlainTextResponse(
                content=metrics.exposition(),
                media_type="text/plain; version=0.0.4; charset=utf-8",
            )

        start = time.time()
        response = await call_next(request)
        duration = time.time() - start

        # Normalize path to avoid cardinality explosion
        path = request.url.path
        if "/sessions/" in path:
            path = "/api/sessions/{id}"

        metrics.record(request.method, path, response.status_code, duration)

        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response
