"""Database initialization — create all tables."""

from __future__ import annotations

from nexural_research.db.engine import engine
from nexural_research.db.models import Base


def init_database() -> None:
    """Create all tables if they don't exist. Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_database()
    print("Database tables created successfully.")
