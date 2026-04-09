"""Request ID middleware — attaches a unique ID to every request for log correlation."""

from __future__ import annotations

import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Context variable accessible throughout the request lifecycle
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject X-Request-ID into every request/response.

    If the client sends X-Request-ID, pass it through.
    Otherwise generate a UUID4.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request_id_var.set(rid)

        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response
