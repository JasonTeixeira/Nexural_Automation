"""Local lesson-template marketplace metadata and reviews."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .models import utc_now_iso
from .progress import validate_id


@dataclass(frozen=True)
class Review:
    reviewer: str
    stars: int
    comment: str
    created_at: str


@dataclass(frozen=True)
class MarketplaceEntry:
    name: str
    version: str
    publisher: str
    tags: tuple[str, ...]
    digest: str
    published_at: str
    reviews: tuple[Review, ...]
    rating: float


class Marketplace:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def publish(
        self,
        name: str,
        version: str,
        publisher: str,
        tags: list[str],
        digest: str,
    ) -> MarketplaceEntry:
        validate_id(name, "template name")
        rows = self._read()
        if name in rows:
            raise ValueError(f"Marketplace template already exists: {name}")
        if not digest.startswith("sha256:"):
            raise ValueError("Template digest must use sha256:<hex> format")
        rows[name] = {
            "name": name,
            "version": version,
            "publisher": publisher,
            "tags": sorted(set(tags)),
            "digest": digest,
            "published_at": utc_now_iso(),
            "reviews": [],
        }
        self._write(rows)
        return self.get(name)

    def review(self, name: str, reviewer: str, stars: int, comment: str) -> MarketplaceEntry:
        if stars not in range(1, 6):
            raise ValueError("Review stars must be between 1 and 5")
        rows = self._read()
        if name not in rows:
            raise KeyError(f"Unknown marketplace template: {name}")
        if any(row["reviewer"] == reviewer for row in rows[name]["reviews"]):
            raise ValueError("A reviewer may review a template only once")
        rows[name]["reviews"].append(
            {
                "reviewer": reviewer,
                "stars": stars,
                "comment": comment,
                "created_at": utc_now_iso(),
            }
        )
        self._write(rows)
        return self.get(name)

    def get(self, name: str) -> MarketplaceEntry:
        try:
            row = self._read()[name]
        except KeyError as exc:
            raise KeyError(f"Unknown marketplace template: {name}") from exc
        reviews = tuple(Review(**review) for review in row["reviews"])
        rating = (
            round(sum(review.stars for review in reviews) / len(reviews), 2) if reviews else 0.0
        )
        return MarketplaceEntry(
            name=row["name"],
            version=row["version"],
            publisher=row["publisher"],
            tags=tuple(row["tags"]),
            digest=row["digest"],
            published_at=row["published_at"],
            reviews=reviews,
            rating=rating,
        )

    def list(self, *, tag: str | None = None) -> tuple[MarketplaceEntry, ...]:
        return tuple(
            entry
            for entry in (self.get(name) for name in sorted(self._read()))
            if tag is None or tag in entry.tags
        )

    def _read(self) -> dict[str, dict]:
        if not self.path.exists():
            return {}
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Marketplace database is malformed")
        return payload

    def _write(self, rows: dict[str, dict]) -> None:
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps(rows, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        temporary.replace(self.path)
