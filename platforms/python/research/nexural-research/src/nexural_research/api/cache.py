"""In-memory LRU cache for expensive analysis results.

Cache key = sha256(session_id + endpoint + params).
Returns X-Cache: HIT/MISS header.
Upgradable to Redis by swapping the storage backend.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from collections import OrderedDict
from typing import Any

_logger = logging.getLogger("nexural_research.cache")

_MAX_SIZE = int(os.environ.get("NEXURAL_CACHE_MAX_SIZE", "500"))
_DEFAULT_TTL = int(os.environ.get("NEXURAL_CACHE_TTL", "300"))  # 5 minutes


class AnalysisCache:
    """TTL-based LRU cache for analysis results."""

    def __init__(self, max_size: int = _MAX_SIZE, default_ttl: int = _DEFAULT_TTL):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._hits = 0
        self._misses = 0

    @staticmethod
    def make_key(session_id: str, endpoint: str, params: dict | None = None) -> str:
        raw = f"{session_id}:{endpoint}:{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, key: str) -> tuple[bool, Any]:
        """Returns (hit, value). If expired, returns miss."""
        if key in self._store:
            expires_at, value = self._store[key]
            if time.time() < expires_at:
                self._store.move_to_end(key)
                self._hits += 1
                return True, value
            else:
                del self._store[key]
        self._misses += 1
        return False, None

    def put(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl or self.default_ttl
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (time.time() + ttl, value)
        while len(self._store) > self.max_size:
            self._store.popitem(last=False)

    def invalidate_session(self, session_id: str) -> int:
        """Remove all cached results for a session. Returns count removed."""
        to_remove = [k for k, (_, v) in self._store.items()
                     if isinstance(v, dict) and v.get("_session_id") == session_id]
        for k in to_remove:
            del self._store[k]
        return len(to_remove)

    def clear(self) -> None:
        self._store.clear()
        self._hits = 0
        self._misses = 0

    @property
    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "size": len(self._store),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total * 100, 1) if total > 0 else 0.0,
        }


# Global cache instance
cache = AnalysisCache()
