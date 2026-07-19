"""Learner-safe Academy projections.

Domain models retain full grader detail for instructors and offline audit. These
helpers produce public contracts that do not disclose hidden test definitions,
answers, or internal failure identifiers.
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from .catalog import CurriculumCatalog
from .models import GradeResult, LearnerSummary


def _starter_value(expected: Any) -> Any:
    if isinstance(expected, bool):
        return not expected
    if isinstance(expected, (int, float)):
        return expected + 1 if expected == 0 else 0
    if isinstance(expected, str):
        return "TODO"
    if isinstance(expected, list):
        return []
    return None


def learner_catalog(catalog: CurriculumCatalog) -> dict[str, Any]:
    """Strip hidden rubric contracts and provide intentionally failing starters."""
    payload = catalog.to_dict()
    for collection in ("lessons", "capstones"):
        for item in payload[collection].values():
            public_rubric = []
            starter: dict[str, Any] = {}
            hidden_checks = 0
            for criterion in item["rubric"]:
                if criterion["visibility"] == "hidden":
                    hidden_checks += 1
                else:
                    starter[criterion["metric"]] = _starter_value(criterion["expected"])
                    public_rubric.append(criterion)
            item["rubric"] = public_rubric
            item["hidden_checks"] = hidden_checks
            item["starter_submission"] = starter
    return payload


def learner_grade(result: GradeResult) -> dict[str, Any]:
    """Remove hidden criterion detail and expose only aggregate safety status."""
    payload = asdict(result)
    hidden = [row for row in payload["criteria"] if row["visibility"] == "hidden"]
    payload["criteria"] = [row for row in payload["criteria"] if row["visibility"] != "hidden"]
    payload["hidden_checks"] = {
        "count": len(hidden),
        "passed": all(row["passed"] for row in hidden),
    }
    return payload


def learner_progress(summary: LearnerSummary, catalog: CurriculumCatalog) -> dict[str, Any]:
    """Remove internal hidden-test identifiers from persisted learner failures."""
    hidden_ids = {
        criterion.id
        for item in (*catalog.lessons.values(), *catalog.capstones.values())
        for criterion in item.rubric
        if criterion.visibility == "hidden"
    }
    payload = asdict(summary)
    for item in payload["items"]:
        failures = item["last_failures"]
        public = [failure for failure in failures if failure not in hidden_ids]
        if any(failure in hidden_ids for failure in failures):
            public.append("hidden_safety_check")
        item["last_failures"] = public
    return payload
