"""Stable domain models for the scenario-driven Automation Academy."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Literal

Visibility = Literal["public", "hidden"]


@dataclass(frozen=True)
class RubricCriterion:
    id: str
    metric: str
    operator: str
    expected: Any
    weight: int
    visibility: Visibility = "public"
    message: str = "Criterion failed."


@dataclass(frozen=True)
class LearningItem:
    id: str
    kind: Literal["lesson", "capstone"]
    track: str
    title: str
    objectives: tuple[str, ...]
    prerequisites: tuple[str, ...]
    updated_at: str
    estimated_minutes: int
    translations: dict[str, dict[str, str]]
    rubric: tuple[RubricCriterion, ...]
    hints: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class Track:
    id: str
    title: str
    description: str
    lessons: tuple[str, ...]
    capstones: tuple[str, ...] = ()


@dataclass(frozen=True)
class CriterionResult:
    id: str
    passed: bool
    earned: int
    possible: int
    visibility: Visibility
    message: str


@dataclass(frozen=True)
class GradeResult:
    item_id: str
    passed: bool
    score: int
    criteria: tuple[CriterionResult, ...]


@dataclass(frozen=True)
class ItemProgress:
    item_id: str
    status: Literal["not_started", "in_progress", "completed"]
    attempts: int = 0
    hint_level: int = 0
    best_score: int = 0
    last_failures: tuple[str, ...] = ()


@dataclass(frozen=True)
class LearnerSummary:
    learner_id: str
    completed: int
    in_progress: int
    total_attempts: int
    items: tuple[ItemProgress, ...]


@dataclass(frozen=True)
class Hint:
    item_id: str
    level: int
    text: str


@dataclass(frozen=True)
class TraceEvent:
    timestamp: str
    event: str
    learner_id: str
    item_id: str | None = None
    data: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CohortSummary:
    cohort_id: str
    learners: int
    completed_items: int
    started_items: int
    completion_rate: float
    common_failures: tuple[tuple[str, int], ...]


def model_dict(value: Any) -> dict[str, Any]:
    """Return a JSON-safe representation for a dataclass model."""
    return asdict(value)


def utc_now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")
