"""Curriculum staleness and translation coverage checks."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from .catalog import CurriculumCatalog


@dataclass(frozen=True)
class FreshnessIssue:
    item_id: str
    issue: str


@dataclass(frozen=True)
class FreshnessReport:
    fresh: bool
    checked_at: str
    max_age_days: int
    issues: tuple[FreshnessIssue, ...]


def check_freshness(
    catalog: CurriculumCatalog,
    *,
    now: datetime | None = None,
    max_age_days: int = 180,
    required_locales: tuple[str, ...] | None = None,
) -> FreshnessReport:
    current = (now or datetime.now(UTC)).astimezone(UTC)
    locales = required_locales or (catalog.default_locale,)
    issues: list[FreshnessIssue] = []
    for item in (*catalog.lessons.values(), *catalog.capstones.values()):
        updated = datetime.fromisoformat(item.updated_at).replace(tzinfo=UTC)
        age = (current - updated).days
        if age > max_age_days:
            issues.append(FreshnessIssue(item.id, f"stale_by_{age - max_age_days}_days"))
        for locale in locales:
            translation = item.translations.get(locale)
            if not translation or not translation.get("title") or not translation.get("summary"):
                issues.append(FreshnessIssue(item.id, f"missing_translation:{locale}"))
    return FreshnessReport(not issues, current.isoformat(), max_age_days, tuple(issues))
