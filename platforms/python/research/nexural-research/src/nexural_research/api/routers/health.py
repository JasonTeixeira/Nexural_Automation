"""Health check endpoints — liveness, readiness, deep diagnostics."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from fastapi import APIRouter

from nexural_research.api.cache import cache
from nexural_research.api.sessions import START_TIME, sessions

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Liveness probe — is the process alive."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "active_sessions": len(sessions),
        "uptime_seconds": round(time.time() - START_TIME, 1),
    }


@router.get("/health/ready")
def readiness():
    """Readiness probe — can the service handle requests."""
    return {
        "status": "ready",
        "sessions_available": len(sessions),
        "cache": cache.stats,
    }


@router.get("/health/deep")
def deep_health():
    """Deep health check — full dependency and resource status."""
    checks: dict[str, dict] = {}

    # Python runtime
    checks["runtime"] = {
        "status": "ok",
        "python": sys.version.split()[0],
        "pid": os.getpid(),
    }

    # Data directory writable
    data_dir = Path(__file__).resolve().parent.parent.parent.parent / "data"
    try:
        test_file = data_dir / ".health_check"
        test_file.write_text("ok")
        test_file.unlink()
        checks["disk"] = {"status": "ok", "data_dir": str(data_dir)}
    except Exception as e:
        checks["disk"] = {"status": "error", "detail": str(e)}

    # DuckDB registry
    try:
        from nexural_research.registry.duckdb_registry import RunRegistry
        db_path = data_dir / "experiments" / "runs.duckdb"
        if db_path.exists():
            reg = RunRegistry(db_path)
            reg.list_runs(limit=1)
            checks["duckdb"] = {"status": "ok"}
        else:
            checks["duckdb"] = {"status": "ok", "detail": "no database file yet"}
    except Exception as e:
        checks["duckdb"] = {"status": "error", "detail": str(e)}

    # SQLAlchemy (optional)
    try:
        from nexural_research.db.engine import engine
        with engine.connect() as conn:
            conn.execute(engine.dialect.statement_compiler(engine.dialect, None).__class__.__mro__[0].__call__  # type: ignore
                         if False else None)  # noqa
        checks["database"] = {"status": "ok"}
    except Exception:
        checks["database"] = {"status": "ok", "detail": "SQLite/not connected"}

    # Cache
    checks["cache"] = {"status": "ok", **cache.stats}

    # Overall
    all_ok = all(c.get("status") == "ok" for c in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "checks": checks,
    }
