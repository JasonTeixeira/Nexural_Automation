"""Authentication system - API key validation.

Configurable via environment:
- NEXURAL_API_KEYS: comma-separated list of valid API keys
- NEXURAL_AUTH_ENABLED: "true" to enforce auth

When auth is disabled, all requests pass through for local research. When
enabled, requests must include `Authorization: Bearer <api_key>`.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from contextvars import ContextVar
from dataclasses import dataclass

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

_AUTH_ENABLED = os.environ.get("NEXURAL_AUTH_ENABLED", "false").lower() in {
    "true",
    "1",
    "yes",
}
_API_KEYS_RAW = os.environ.get("NEXURAL_API_KEYS", "")
_KEY_HASH_PEPPER = os.environ.get(
    "NEXURAL_API_KEY_HASH_PEPPER", ""
).encode() or secrets.token_bytes(32)
_VALID_KEY_HASHES: set[str] = set()


def _hash_key(key: str) -> str:
    """Create a keyed, comparison-safe identifier without retaining the API key."""
    return hmac.new(_KEY_HASH_PEPPER, key.encode(), hashlib.sha256).hexdigest()


if _API_KEYS_RAW:
    for key in _API_KEYS_RAW.split(","):
        key = key.strip()
        if key:
            _VALID_KEY_HASHES.add(_hash_key(key))


@dataclass
class AuthContext:
    """Authentication context attached to each request."""

    authenticated: bool
    key_hash: str | None = None
    tier: str = "default"


_api_key_header = APIKeyHeader(name="Authorization", auto_error=False)
_request_auth: ContextVar[AuthContext | None] = ContextVar("nexural_request_auth", default=None)


def _extract_key(header_val: str | None, legacy_query_val: str | None = None) -> str | None:
    """Extract API key while preserving the historical helper signature."""
    if not header_val:
        return legacy_query_val
    if header_val.startswith("Bearer "):
        return header_val[7:]
    return header_val


async def require_auth(
    header: str | None = Security(_api_key_header),
) -> AuthContext:
    """Validate authentication when NEXURAL_AUTH_ENABLED is set."""
    if not _AUTH_ENABLED:
        context = AuthContext(authenticated=False)
        _request_auth.set(context)
        return context

    key = _extract_key(header)
    if not key:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide 'Authorization: Bearer <key>'.",
        )

    key_hash = _hash_key(key)
    if not any(hmac.compare_digest(key_hash, candidate) for candidate in _VALID_KEY_HASHES):
        raise HTTPException(status_code=403, detail="Invalid API key.")

    context = AuthContext(authenticated=True, key_hash=key_hash)
    _request_auth.set(context)
    return context


def current_auth() -> AuthContext | None:
    """Return the auth context established by the current request dependency."""
    return _request_auth.get()


def is_auth_enabled() -> bool:
    """Check if authentication is currently enforced."""
    return _AUTH_ENABLED
