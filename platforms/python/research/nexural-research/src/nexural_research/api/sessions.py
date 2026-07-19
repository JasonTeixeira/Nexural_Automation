"""Shared session state and utility functions used across all routers.

Sessions are stored in-memory for speed with Parquet persistence on disk.
On startup, persisted sessions are reloaded automatically.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import HTTPException

from nexural_research.api.auth import AuthContext, current_auth, is_auth_enabled

_logger = logging.getLogger("nexural_research.sessions")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Redis connection (optional — set NEXURAL_REDIS_URL to enable)
_REDIS_URL = os.environ.get("NEXURAL_REDIS_URL", "")
_redis_client = None

if _REDIS_URL:
    try:
        import redis

        _redis_client = redis.from_url(_REDIS_URL, decode_responses=False)
        _redis_client.ping()
        _logger.info(
            "Redis connected at %s", _REDIS_URL.split("@")[-1] if "@" in _REDIS_URL else _REDIS_URL
        )
    except Exception as e:
        _logger.warning("Redis connection failed (%s), falling back to in-memory sessions", e)
        _redis_client = None


START_TIME = time.time()
MAX_UPLOAD_SIZE = int(os.environ.get("NEXURAL_MAX_UPLOAD_MB", "100")) * 1024 * 1024
MAX_SESSIONS = int(os.environ.get("NEXURAL_MAX_SESSIONS", "1000"))

_SESSION_DIR = Path(
    os.environ.get(
        "NEXURAL_SESSION_DIR",
        str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "sessions"),
    )
)
_SESSION_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# In-memory session store (primary — fast access)
# ---------------------------------------------------------------------------

sessions: dict[str, dict[str, Any]] = {}

_SAFE_SESSION_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def new_session_id() -> str:
    """Issue an opaque server-side identifier for a newly uploaded session."""
    return str(uuid.uuid4())


def _session_path(session_id: str) -> Path:
    """Resolve a session directory and prove that it remains under the data root."""
    if not _SAFE_SESSION_ID.fullmatch(session_id):
        raise HTTPException(404, "Session not found")
    root = _SESSION_DIR.resolve()
    candidate = (_SESSION_DIR / session_id).resolve()
    if candidate.parent != root:
        raise HTTPException(404, "Session not found")
    return candidate


def _is_owned(session: dict[str, Any], auth: AuthContext | None = None) -> bool:
    """Enforce API-key ownership only when authentication is enabled."""
    if not is_auth_enabled():
        return True
    auth = auth or current_auth()
    return bool(
        auth and auth.authenticated and auth.key_hash and session.get("owner_hash") == auth.key_hash
    )


def get_session(session_id: str, auth: AuthContext | None = None) -> dict[str, Any]:
    """Fetch a visible session without revealing cross-owner identifiers."""
    session = sessions.get(session_id)
    if session is None or not _is_owned(session, auth):
        raise HTTPException(404, f"Session not found: {session_id}")
    return session


def get_trades(session_id: str) -> pd.DataFrame:
    """Get trades DataFrame from session, raising HTTPException on failure."""
    s = get_session(session_id)
    if s["kind"] != "trades":
        raise HTTPException(400, f"This endpoint requires Trades data, got {s['kind']}")
    return s["df"]


def get_executions(session_id: str) -> pd.DataFrame:
    """Get executions DataFrame from session."""
    s = get_session(session_id)
    if s["kind"] != "executions":
        raise HTTPException(400, f"This endpoint requires Executions data, got {s['kind']}")
    return s["df"]


# ---------------------------------------------------------------------------
# Persistence — Parquet on disk
# ---------------------------------------------------------------------------


def _write_session_to_db(
    session_id: str, kind: str, filename: str | None, n_rows: int, columns: list[str]
) -> None:
    """Write session metadata to SQLAlchemy database (if available)."""
    try:
        import json

        from nexural_research.db.engine import SessionLocal
        from nexural_research.db.models import AnalysisSession

        db = SessionLocal()
        try:
            existing = db.query(AnalysisSession).filter_by(session_id=session_id).first()
            if existing:
                existing.n_rows = n_rows
                existing.filename = filename
            else:
                db.add(
                    AnalysisSession(
                        session_id=session_id,
                        kind=kind,
                        filename=filename,
                        n_rows=n_rows,
                        columns_json=json.dumps(columns),
                    )
                )
            db.commit()
        finally:
            db.close()
    except Exception as e:
        _logger.debug("DB write skipped: %s", e)


def persist_session(
    session_id: str,
    df: pd.DataFrame,
    kind: str,
    filename: str | None,
    owner_hash: str | None = None,
) -> None:
    """Save session data to Parquet and metadata to JSON for restart survival."""
    session_path = _session_path(session_id)
    session_path.mkdir(parents=True, exist_ok=True)

    # Save data as Parquet
    parquet_path = session_path / "data.parquet"
    df.to_parquet(parquet_path, index=False)

    # Save metadata
    meta = {
        "kind": kind,
        "filename": filename,
        "n_rows": len(df),
        "columns": list(df.columns),
        "created_at": time.time(),
        "owner_hash": owner_hash,
    }
    (session_path / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    # Also write to DB
    _write_session_to_db(session_id, kind, filename, len(df), list(df.columns))
    _logger.info("Persisted session %s (%d rows)", session_id, len(df))


def load_persisted_sessions() -> int:
    """Reload all persisted sessions from disk on startup. Returns count loaded."""
    loaded = 0
    if not _SESSION_DIR.exists():
        return 0

    for session_path in _SESSION_DIR.iterdir():
        if not session_path.is_dir() or session_path.is_symlink():
            continue
        try:
            safe_path = _session_path(session_path.name)
        except HTTPException:
            _logger.warning("Ignored invalid persisted session directory: %s", session_path.name)
            continue
        meta_file = safe_path / "meta.json"
        data_file = safe_path / "data.parquet"
        if not meta_file.exists() or not data_file.exists():
            continue

        try:
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
            df = pd.read_parquet(data_file)
            sessions[session_path.name] = {
                "df": df,
                "kind": meta["kind"],
                "filename": meta.get("filename"),
                "n_rows": meta["n_rows"],
                "columns": meta.get("columns", list(df.columns)),
                "created_at": meta.get("created_at", time.time()),
                "owner_hash": meta.get("owner_hash"),
            }
            loaded += 1
        except Exception as e:
            _logger.warning("Failed to load persisted session %s: %s", session_path.name, e)

    if loaded:
        _logger.info("Restored %d persisted sessions from disk", loaded)
    return loaded


def delete_persisted_session(session_id: str) -> None:
    """Remove persisted session data from disk."""
    session_path = _session_path(session_id)
    if session_path.exists():
        import shutil

        shutil.rmtree(session_path, ignore_errors=True)


# ---------------------------------------------------------------------------
# Session TTL cleanup
# ---------------------------------------------------------------------------

SESSION_TTL_HOURS = int(os.environ.get("NEXURAL_SESSION_TTL_HOURS", "24"))


def cleanup_expired_sessions() -> int:
    """Remove sessions older than TTL. Returns count removed."""
    if SESSION_TTL_HOURS <= 0:
        return 0
    cutoff = time.time() - (SESSION_TTL_HOURS * 3600)
    expired = [sid for sid, s in sessions.items() if s.get("created_at", time.time()) < cutoff]
    for sid in expired:
        sessions.pop(sid, None)
        delete_persisted_session(sid)
    if expired:
        _logger.info("Cleaned up %d expired sessions (TTL=%dh)", len(expired), SESSION_TTL_HOURS)
    return len(expired)


# ---------------------------------------------------------------------------
# Serialization utility
# ---------------------------------------------------------------------------


def safe_serialize(obj: Any) -> Any:
    """Recursively convert dataclasses / non-JSON types for JSON output."""
    if hasattr(obj, "__dataclass_fields__"):
        return {k: safe_serialize(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [safe_serialize(v) for v in obj]
    if isinstance(obj, dict):
        return {k: safe_serialize(v) for k, v in obj.items()}
    if isinstance(obj, float) and (obj == float("inf") or obj == float("-inf")):
        return str(obj)
    return obj
