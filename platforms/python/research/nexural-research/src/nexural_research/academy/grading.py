"""Deterministic Academy grader over trusted machine-produced evidence."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .execution import execute_item
from .models import CriterionResult, GradeResult, LearningItem, RubricCriterion

MISSING = object()


def grade(item: LearningItem, submission: Mapping[str, Any]) -> GradeResult:
    evidence = execute_item(item, submission)
    results = tuple(_evaluate(criterion, evidence) for criterion in item.rubric)
    score = sum(result.earned for result in results)
    return GradeResult(item.id, score == 100, score, results)


def _evaluate(criterion: RubricCriterion, submission: Mapping[str, Any]) -> CriterionResult:
    actual = _resolve(submission, criterion.metric)
    passed = _compare(actual, criterion.operator, criterion.expected)
    if passed:
        message = "Passed."
    elif criterion.visibility == "hidden":
        message = "A hidden safety check failed."
    else:
        message = criterion.message
    return CriterionResult(
        id=criterion.id,
        passed=passed,
        earned=criterion.weight if passed else 0,
        possible=criterion.weight,
        visibility=criterion.visibility,
        message=message,
    )


def _resolve(submission: Mapping[str, Any], dotted_path: str) -> Any:
    value: Any = submission
    for part in dotted_path.split("."):
        if not isinstance(value, Mapping) or part not in value:
            return MISSING
        value = value[part]
    return value


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    if actual is MISSING:
        return False
    if operator == "equals":
        return bool(actual == expected)
    if operator == "not_equals":
        return bool(actual != expected)
    if operator == "gte":
        return isinstance(actual, (int, float)) and actual >= expected
    if operator == "lte":
        return isinstance(actual, (int, float)) and actual <= expected
    if operator == "contains":
        return expected in actual
    if operator == "not_contains":
        return expected not in actual
    if operator == "truthy":
        return bool(actual)
    if operator == "falsy":
        return not bool(actual)
    if operator == "unique":
        return isinstance(actual, list) and len(actual) == len({repr(v) for v in actual})
    raise ValueError(f"Unsupported rubric operator: {operator}")
