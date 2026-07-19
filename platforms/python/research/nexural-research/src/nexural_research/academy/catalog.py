"""Filesystem curriculum catalog with strict, translation-ready manifests."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

from .models import LearningItem, RubricCriterion, Track

FORBIDDEN_SCORE_TERMS = ("profit", "pnl", "sharpe", "return", "win_rate")


class CurriculumCatalog:
    def __init__(
        self,
        *,
        root: Path,
        schema_version: str,
        version: str,
        updated_at: str,
        default_locale: str,
        tracks: dict[str, Track],
        lessons: dict[str, LearningItem],
        capstones: dict[str, LearningItem],
    ) -> None:
        self.root = root
        self.schema_version = schema_version
        self.version = version
        self.updated_at = updated_at
        self.default_locale = default_locale
        self.tracks = tracks
        self.lessons = lessons
        self.capstones = capstones

    @classmethod
    def load(cls, root: str | Path) -> "CurriculumCatalog":
        root = Path(root).resolve()
        manifest = _read_yaml(root / "curriculum.yaml")
        tracks = {
            track.id: track
            for path in sorted((root / "tracks").glob("*.yaml"))
            for track in [_parse_track(_read_yaml(path))]
        }
        lessons = _load_items(root / "lessons", "lesson")
        capstones = _load_items(root / "capstones", "capstone")
        catalog = cls(
            root=root,
            schema_version=str(manifest["schema_version"]),
            version=str(manifest["version"]),
            updated_at=str(manifest["updated_at"]),
            default_locale=str(manifest.get("default_locale", "en")),
            tracks=tracks,
            lessons=lessons,
            capstones=capstones,
        )
        catalog.validate()
        return catalog

    def validate(self) -> None:
        if self.schema_version != "1.0":
            raise ValueError(f"Unsupported curriculum schema: {self.schema_version}")
        all_items = {**self.lessons, **self.capstones}
        if set(self.tracks) == set():
            raise ValueError("Curriculum must contain at least one track")
        for track in self.tracks.values():
            for item_id in (*track.lessons, *track.capstones):
                if item_id not in all_items:
                    raise ValueError(f"Track {track.id} references missing item {item_id}")
        for item in all_items.values():
            if item.track not in self.tracks:
                raise ValueError(f"Item {item.id} references missing track {item.track}")
            if self.default_locale not in item.translations:
                raise ValueError(f"Item {item.id} is missing default translation")
            total_weight = sum(criterion.weight for criterion in item.rubric)
            if total_weight != 100:
                raise ValueError(f"Rubric weights for {item.id} must total 100")
            for criterion in item.rubric:
                lowered = criterion.metric.lower()
                if any(term in lowered for term in FORBIDDEN_SCORE_TERMS):
                    raise ValueError(
                        f"Rubric {item.id}/{criterion.id} attempts to score profitability"
                    )

    def item(self, item_id: str) -> LearningItem:
        try:
            return self.lessons.get(item_id) or self.capstones[item_id]
        except KeyError as exc:
            raise KeyError(f"Unknown Academy item: {item_id}") from exc

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "version": self.version,
            "updated_at": self.updated_at,
            "default_locale": self.default_locale,
            "tracks": {key: asdict(value) for key, value in self.tracks.items()},
            "lessons": {key: asdict(value) for key, value in self.lessons.items()},
            "capstones": {key: asdict(value) for key, value in self.capstones.items()},
        }


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(path)
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected mapping in {path}")
    return payload


def _parse_track(data: dict[str, Any]) -> Track:
    return Track(
        id=str(data["id"]),
        title=str(data["title"]),
        description=str(data["description"]),
        lessons=tuple(map(str, data.get("lessons", ()))),
        capstones=tuple(map(str, data.get("capstones", ()))),
    )


def _load_items(directory: Path, kind: str) -> dict[str, LearningItem]:
    items: dict[str, LearningItem] = {}
    for path in sorted(directory.glob("*/manifest.yaml")):
        data = _read_yaml(path)
        rubric = tuple(
            RubricCriterion(
                id=str(row["id"]),
                metric=str(row["metric"]),
                operator=str(row["operator"]),
                expected=row.get("expected"),
                weight=int(row["weight"]),
                visibility=str(row.get("visibility", "public")),  # type: ignore[arg-type]
                message=str(row.get("message", "Criterion failed.")),
            )
            for row in data["rubric"]
        )
        item = LearningItem(
            id=str(data["id"]),
            kind=kind,  # type: ignore[arg-type]
            track=str(data["track"]),
            title=str(data["title"]),
            objectives=tuple(map(str, data["objectives"])),
            prerequisites=tuple(map(str, data.get("prerequisites", ()))),
            updated_at=str(data["updated_at"]),
            estimated_minutes=int(data.get("estimated_minutes", 30)),
            translations={
                str(locale): {str(k): str(v) for k, v in values.items()}
                for locale, values in data["translations"].items()
            },
            rubric=rubric,
            hints=tuple(map(str, data.get("hints", ()))),
            tags=tuple(map(str, data.get("tags", ()))),
        )
        if item.id in items:
            raise ValueError(f"Duplicate Academy item id: {item.id}")
        items[item.id] = item
    return items
