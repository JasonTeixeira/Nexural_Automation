"""Security headers middleware — adds CSP, HSTS, and other protective headers."""

from __future__ import annotations

import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_HSTS_ENABLED = os.environ.get("NEXURAL_HSTS_ENABLED", "false").lower() in ("true", "1")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (disable unused browser features)
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.perplexity.ai; "
            "font-src 'self' data:; "
            "frame-ancestors 'none';"
        )

        # HSTS (only when explicitly enabled — requires HTTPS)
        if _HSTS_ENABLED:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
