"""Nexural Research API — Application Factory.

Mounts all routers, middleware, and configuration.
All endpoint logic lives in routers/ modules.
"""

from __future__ import annotations

import logging
import os
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from nexural_research.api.middleware.metrics import MetricsMiddleware
from nexural_research.api.middleware.rate_limiter import RateLimiterMiddleware
from nexural_research.api.middleware.request_id import RequestIDMiddleware
from nexural_research.api.middleware.security_headers import SecurityHeadersMiddleware
from nexural_research.api.routers import analysis, ai, charts, export, health, robustness, upload
from nexural_research.api.sessions import cleanup_expired_sessions, load_persisted_sessions, sessions

_logger = logging.getLogger("nexural_research.api")

# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app):
    """Application lifecycle — startup, background tasks, and shutdown."""
    import asyncio

    _logger.info("Nexural Research v2.0.0 starting up")

    # Background TTL cleanup task
    async def _ttl_cleanup_loop():
        while True:
            await asyncio.sleep(300)  # every 5 minutes
            try:
                cleanup_expired_sessions()
            except Exception as e:
                _logger.warning("TTL cleanup error: %s", e)

    cleanup_task = asyncio.create_task(_ttl_cleanup_loop())

    yield

    # Shutdown
    cleanup_task.cancel()
    _logger.info("Shutting down gracefully...")


app = FastAPI(
    title="Nexural Research API",
    description="Institutional-grade strategy analysis engine for NinjaTrader trade data",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware stack (order matters — outermost first)
# ---------------------------------------------------------------------------

# CORS
_cors_origins = os.environ.get(
    "NEXURAL_CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Request ID tracking
app.add_middleware(RequestIDMiddleware)

# Rate limiting
app.add_middleware(RateLimiterMiddleware)

# Prometheus metrics
app.add_middleware(MetricsMiddleware)

# Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.add_middleware(SecurityHeadersMiddleware)


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Log errors securely without exposing internals to clients."""
    _logger.error("Unhandled exception: %s\n%s", str(exc), traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Check server logs for details.",
            "type": type(exc).__name__,
        },
    )


# ---------------------------------------------------------------------------
# Mount routers under /api/ and /api/v1/ (versioned)
# ---------------------------------------------------------------------------

for prefix in ["/api", "/api/v1"]:
    app.include_router(health.router, prefix=prefix)
    app.include_router(upload.router, prefix=prefix)
    app.include_router(analysis.router, prefix=prefix)
    app.include_router(robustness.router, prefix=prefix)
    app.include_router(charts.router, prefix=prefix)
    app.include_router(export.router, prefix=prefix)
    app.include_router(ai.router, prefix=prefix)


# ---------------------------------------------------------------------------
# Static frontend serving (production)
# ---------------------------------------------------------------------------

def _find_static_dir() -> Path | None:
    """Locate the built frontend assets."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / "static",
        Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist",
    ]
    for d in candidates:
        if d.is_dir() and (d / "index.html").exists():
            return d
    return None


_static_dir = _find_static_dir()
if _static_dir:
    from fastapi.staticfiles import StaticFiles

    @app.get("/", response_class=HTMLResponse)
    def serve_index():
        return (_static_dir / "index.html").read_text(encoding="utf-8")

    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")


# ---------------------------------------------------------------------------
# Demo mode: load built-in sample data on startup
# ---------------------------------------------------------------------------

def _load_demo_data() -> None:
    """Pre-load sample data so the app has something to show on first launch."""
    sample_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "exports"
    sample = sample_dir / "sample_trades.csv"
    if sample.exists() and "demo" not in sessions:
        try:
            from nexural_research.ingest.nt_csv import load_nt_trades_csv
            df = load_nt_trades_csv(sample)
            sessions["demo"] = {
                "df": df, "kind": "trades", "filename": "demo_trades.csv",
                "n_rows": len(df), "columns": list(df.columns),
            }
        except Exception:
            pass


# Restore persisted sessions from disk (survives restarts)
load_persisted_sessions()

# Initialize database tables
try:
    from nexural_research.db.init_db import init_database
    init_database()
except Exception:
    _logger.debug("Database init skipped (optional dependency)")

_load_demo_data()


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

def run_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    import uvicorn
    uvicorn.run("nexural_research.api.app:app", host=host, port=port, reload=reload)


def launch(port: int = 8000) -> None:
    """Launch the full application: start server and open browser."""
    import threading
    import webbrowser
    import uvicorn

    url = f"http://localhost:{port}"
    threading.Timer(2.0, lambda: webbrowser.open(url)).start()
    print("\n  Nexural Research v2.0.0")
    print(f"  Dashboard:  {url}")
    print(f"  API Docs:   {url}/api/docs")
    print("  Press Ctrl+C to stop\n")
    uvicorn.run("nexural_research.api.app:app", host="127.0.0.1", port=port)


if __name__ == "__main__":
    launch()
