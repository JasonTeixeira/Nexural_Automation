"""SQLAlchemy ORM models for persistent state.

Tables:
- users: user accounts (future — placeholder for auth integration)
- api_keys: hashed API keys with tiers and rate limits
- analysis_sessions: uploaded session metadata (survives restarts)
- analysis_runs: cached analysis results with timing
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    """User account — for future auth integration."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # nullable for API-key-only users
    tier = Column(String(50), nullable=False, default="free")  # free, pro, enterprise
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)


class ApiKey(Base):
    """Hashed API keys with metadata."""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)  # FK to users when auth is wired
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, default="default")
    tier = Column(String(50), nullable=False, default="free")
    rate_limit = Column(Integer, nullable=False, default=120)  # requests per minute
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)


class AnalysisSession(Base):
    """Persistent session metadata — replaces in-memory dict for restart survival."""
    __tablename__ = "analysis_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    kind = Column(String(50), nullable=False)  # trades, executions, optimization
    filename = Column(String(255), nullable=True)
    n_rows = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=True)  # JSON array of column names
    data_path = Column(String(500), nullable=True)  # path to Parquet file on disk
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    last_accessed = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_sessions_user", "user_id"),
    )


class AnalysisRun(Base):
    """Cached analysis result — avoids recomputation."""
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, index=True)
    analysis_type = Column(String(100), nullable=False)  # "comprehensive", "hurst", "stress_tail", etc.
    parameters_json = Column(Text, nullable=True)  # query params as JSON
    result_json = Column(Text, nullable=True)  # cached result as JSON
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    duration_ms = Column(Float, nullable=True)

    __table_args__ = (
        Index("idx_runs_session_type", "session_id", "analysis_type"),
    )
