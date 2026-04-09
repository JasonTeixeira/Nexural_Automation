"""Database engine configuration.

Supports two modes:
- PostgreSQL (production): Set NEXURAL_DATABASE_URL=postgresql+asyncpg://...
- SQLite (development/testing): Default, zero config, file-based

Connection pooling configured for production workloads.
"""

from __future__ import annotations

import os
from pathlib import Path

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

_logger = logging.getLogger("nexural_research.db")

# Default to SQLite for zero-config dev experience
_DEFAULT_DB = f"sqlite:///{Path(__file__).resolve().parent.parent.parent.parent / 'data' / 'nexural.db'}"
DATABASE_URL = os.environ.get("NEXURAL_DATABASE_URL", _DEFAULT_DB)

# Use sync engine (simpler, works with SQLite and PostgreSQL)
# Async can be added later when PostgreSQL is the primary target
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    echo=os.environ.get("NEXURAL_DB_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
    # SQLite doesn't support pool_size/max_overflow
    **({} if _is_sqlite else {"pool_size": 10, "max_overflow": 20}),
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Log which database is being used
_db_type = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
_logger.info("Database: %s (%s)", _db_type, DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL.split("///")[-1])


def get_db() -> Session:
    """FastAPI dependency — yields a database session, auto-closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
