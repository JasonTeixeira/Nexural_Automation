"""Safe deterministic executor for Academy declarative trace programs.

Learner payloads describe a small data-only program. They are never imported,
evaluated, or passed to a shell. The trusted runner produces the trace, fault
evidence, and test results consumed by grading.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

from .faults import FaultInjector
from .models import LearningItem

RUNNER_ID = "nexural.declarative-trace.v1"
MAX_SOURCE_BYTES = 256_000

FAULT_OPERATIONS = {
    "disconnect": "reconcile_after_disconnect",
    "duplicate": "deduplicate_by_event_id",
    "latency": "reject_late_event",
    "partial_fill": "accumulate_partial_fills",
    "stale_data": "reject_stale_timestamp",
}

BASE_EVENTS = [
    {"id": "evt-1", "sequence": 1, "quantity": 2, "state": "accepted", "age_ms": 0},
    {"id": "evt-2", "sequence": 2, "quantity": 2, "state": "filled", "age_ms": 5},
]


def execute_item(item: LearningItem, submission: Mapping[str, Any]) -> dict[str, Any]:
    """Build a canonical machine artifact from learner source.

    Existing ``check`` and ``submit`` service APIs remain stable. A caller may
    provide ``source``, a YAML ``source_path``, or a previously produced
    ``artifact``. Previous artifacts are always replayed from their embedded
    source; their claimed test results are never trusted.
    """
    if item.execution is None:
        return _legacy_rejection(item, submission)
    if item.execution.runner != RUNNER_ID:
        raise ValueError(f"Unsupported Academy runner: {item.execution.runner}")

    source, seed = _source_from_submission(submission)
    program = source.get("program", {}) if isinstance(source, Mapping) else {}
    if not isinstance(program, Mapping):
        program = {}
    operations = _string_list(program.get("operations"))
    settings = program.get("settings", {})
    if not isinstance(settings, Mapping):
        settings = {}

    trace_events = [
        {"sequence": index, "operation": operation, "status": "executed"}
        for index, operation in enumerate(operations, start=1)
    ]
    trace = {
        "status": "complete" if operations and "TODO" not in operations else "incomplete",
        "step_count": len(operations),
        "operations": operations,
        "events": trace_events,
        "deterministic": True,
    }

    injector = FaultInjector()
    fault_evidence: dict[str, dict[str, Any]] = {}
    for profile in item.execution.fault_profiles:
        injected = injector.apply(profile, BASE_EVENTS, seed=seed)
        required = FAULT_OPERATIONS[profile]
        fault_evidence[profile] = {
            "required_operation": required,
            "injected_event_count": len(injected),
            "input_event_count": len(BASE_EVENTS),
            "handled": required in operations,
            "trace_sha256": _sha256(injected),
        }

    context: dict[str, Any] = {
        "source": {"program": {"operations": operations, "settings": dict(settings)}},
        "trace": trace,
        "fault_evidence": fault_evidence,
    }
    results: dict[str, dict[str, Any]] = {}
    for test in (*item.execution.visible_tests, *item.execution.hidden_tests):
        actual = _resolve(context, test.path)
        results[test.id] = {
            "passed": _compare(actual, test.operator, test.expected),
            "visibility": test.visibility,
            "message": test.message,
        }

    artifact: dict[str, Any] = {
        "schema_version": "1.0",
        "item_id": item.id,
        "runner": RUNNER_ID,
        "seed": seed,
        "source": context["source"],
        "source_sha256": _sha256(context["source"]),
        "trace": trace,
        "fault_evidence": fault_evidence,
        "tests": results,
    }
    artifact["digest"] = f"sha256:{_sha256(artifact)}"
    return artifact


def load_program(path: str | Path) -> dict[str, Any]:
    source_path = Path(path).expanduser().resolve()
    if not source_path.is_file():
        raise ValueError(f"Academy source file does not exist: {source_path}")
    if source_path.stat().st_size > MAX_SOURCE_BYTES:
        raise ValueError("Academy source exceeds the 256 KB declarative-program limit")
    payload = yaml.safe_load(source_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Academy source must be a YAML or JSON mapping")
    return payload


def starter_submission(item: LearningItem) -> dict[str, Any]:
    if item.execution is None or item.content_root is None:
        return {"source": {"program": {"operations": [], "settings": {}}}, "seed": 0}
    source = load_program(Path(item.content_root) / item.execution.starter)
    return {"source": source, "seed": 0}


def _source_from_submission(submission: Mapping[str, Any]) -> tuple[dict[str, Any], int]:
    artifact = submission.get("artifact")
    if isinstance(artifact, Mapping):
        source = artifact.get("source", {})
        seed = artifact.get("seed", 0)
    elif "source_path" in submission:
        source = load_program(str(submission["source_path"]))
        seed = submission.get("seed", 0)
    else:
        source = submission.get("source", {})
        seed = submission.get("seed", 0)
    if not isinstance(source, dict):
        source = {}
    if not isinstance(seed, int) or isinstance(seed, bool):
        seed = 0
    return source, seed


def _legacy_rejection(item: LearningItem, submission: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "item_id": item.id,
        "runner": "unavailable",
        "source": {},
        "trace": {"status": "incomplete", "events": []},
        "fault_evidence": {},
        "tests": {},
        "digest": f"sha256:{_sha256(dict(submission))}",
    }


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return []
    return [str(item) for item in value]


def _resolve(payload: Mapping[str, Any], dotted: str) -> Any:
    current: Any = payload
    for part in dotted.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return None
        current = current[part]
    return current


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    if operator == "equals":
        return bool(actual == expected)
    if operator == "contains":
        return isinstance(actual, (list, str, dict)) and expected in actual
    if operator == "not_contains":
        return isinstance(actual, (list, str, dict)) and expected not in actual
    if operator == "gte":
        return isinstance(actual, (int, float)) and actual >= expected
    if operator == "lte":
        return isinstance(actual, (int, float)) and actual <= expected
    if operator == "ordered_subset":
        if not isinstance(actual, list) or not isinstance(expected, list):
            return False
        cursor = iter(actual)
        return all(any(candidate == wanted for candidate in cursor) for wanted in expected)
    raise ValueError(f"Unsupported executable-test operator: {operator}")


def _sha256(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
