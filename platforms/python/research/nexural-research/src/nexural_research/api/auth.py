"""Authentication system — API key validation with optional JWT.

Configurable via environment:
- NEXURAL_API_KEYS: comma-separated list of valid API keys (empty = auth disabled)
- NEXURAL_AUTH_ENABLED: "true" to enforce auth (default: "false" for backward compat)

When auth is disabled, all requests pass through. When enabled, requests must
include either:
- Header: Authorization: Bearer <api_key>
- Query param: api_key=<key>
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass

from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader, APIKeyQuery

# Configuration
_AUTH_ENABLED = os.environ.get("NEXURAL_AUTH_ENABLED", "false").lower() in ("true", "1", "yes")
_API_KEYS_RAW = os.environ.get("NEXURAL_API_KEYS", "")
_VALID_KEY_HASHES: set[str] = set()

if _API_KEYS_RAW:
    for key in _API_KEYS_RAW.split(","):
        key = key.strip()
        if key:
            _VALID_KEY_HASHES.add(hashlib.sha256(key.encode()).hexdigest())


@dataclass
class AuthContext:
    """Authentication context attached to each request."""
    authenticated: bool
    key_hash: str | None = None
    tier: str = "default"


# FastAPI security schemes
_api_key_header = APIKeyHeader(name="Authorization", auto_error=False)
_api_key_query = APIKeyQuery(name="api_key", auto_error=False)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def _extract_key(header_val: str | None, query_val: str | None) -> str | None:
    """Extract API key from header (Bearer token) or query param."""
    if header_val:
        if header_val.startswith("Bearer "):
            return header_val[7:]
        return header_val
    return query_val


async def require_auth(
    header: str | None = Security(_api_key_header),
    query: str | None = Security(_api_key_query),
) -> AuthContext:
    """FastAPI dependency that validates authentication.

    When NEXURAL_AUTH_ENABLED=false (default), returns unauthenticated context.
    When enabled, requires a valid API key.
    """
    if not _AUTH_ENABLED:
        return AuthContext(authenticated=False)

    key = _extract_key(header, query)
    if not key:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide API key via 'Authorization: Bearer <key>' header or '?api_key=<key>' query param.",
        )

    key_hash = _hash_key(key)
    if key_hash not in _VALID_KEY_HASHES:
        raise HTTPException(status_code=403, detail="Invalid API key.")

    return AuthContext(authenticated=True, key_hash=key_hash)


def is_auth_enabled() -> bool:
    """Check if authentication is currently enforced."""
    return _AUTH_ENABLED
