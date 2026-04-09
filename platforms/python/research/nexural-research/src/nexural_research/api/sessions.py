"""Shared session state and utility functions used across all routers.

Sessions are stored in-memory for speed with Parquet persistence on disk.
On startup, persisted sessions are reloaded automatically.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import asdict
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import HTTPException

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
        _logger.info("Redis connected at %s", _REDIS_URL.split("@")[-1] if "@" in _REDIS_URL else _REDIS_URL)
    except Exception as e:
        _logger.warning("Redis connection failed (%s), falling back to in-memory sessions", e)
        _redis_client = None


START_TIME = time.time()
MAX_UPLOAD_SIZE = int(os.environ.get("NEXURAL_MAX_UPLOAD_MB", "100")) * 1024 * 1024
MAX_SESSIONS = int(os.environ.get("NEXURAL_MAX_SESSIONS", "1000"))

_SESSION_DIR = Path(os.environ.get(
    "NEXURAL_SESSION_DIR",
    str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "sessions"),
))
_SESSION_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# In-memory session store (primary — fast access)
# ---------------------------------------------------------------------------

sessions: dict[str, dict[str, Any]] = {}


def get_trades(session_id: str) -> pd.DataFrame:
    """Get trades DataFrame from session, raising HTTPException on failure."""
    if session_id not in sessions:
        raise HTTPException(404, f"Session not found: {session_id}. Upload a CSV first.")
    s = sessions[session_id]
    if s["kind"] != "trades":
        raise HTTPException(400, f"This endpoint requires Trades data, got {s['kind']}")
    return s["df"]


def get_executions(session_id: str) -> pd.DataFrame:
    """Get executions DataFrame from session."""
    if session_id not in sessions:
        raise HTTPException(404, f"Session not found: {session_id}")
    s = sessions[session_id]
    if s["kind"] != "executions":
        raise HTTPException(400, f"This endpoint requires Executions data, got {s['kind']}")
    return s["df"]


# ---------------------------------------------------------------------------
# Persistence — Parquet on disk
# ---------------------------------------------------------------------------

def _write_session_to_db(session_id: str, kind: str, filename: str | None, n_rows: int, columns: list[str]) -> None:
    """Write session metadata to SQLAlchemy database (if available)."""
    try:
        from nexural_research.db.engine import SessionLocal
        from nexural_research.db.models import AnalysisSession
        import json
        db = SessionLocal()
        try:
            existing = db.query(AnalysisSession).filter_by(session_id=session_id).first()
            if existing:
                existing.n_rows = n_rows
                existing.filename = filename
            else:
                db.add(AnalysisSession(
                    session_id=session_id,
                    kind=kind,
                    filename=filename,
                    n_rows=n_rows,
                    columns_json=json.dumps(columns),
                ))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        _logger.debug("DB write skipped: %s", e)


def persist_session(session_id: str, df: pd.DataFrame, kind: str, filename: str | None) -> None:
    """Save session data to Parquet and metadata to JSON for restart survival."""
    session_path = _SESSION_DIR / session_id
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
        if not session_path.is_dir():
            continue
        meta_file = session_path / "meta.json"
        data_file = session_path / "data.parquet"
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
            }
            loaded += 1
        except Exception as e:
            _logger.warning("Failed to load persisted session %s: %s", session_path.name, e)

    if loaded:
        _logger.info("Restored %d persisted sessions from disk", loaded)
    return loaded


def delete_persisted_session(session_id: str) -> None:
    """Remove persisted session data from disk."""
    session_path = _SESSION_DIR / session_id
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
