"""Application service used by CLI, API, MCP, and offline instructors."""

from __future__ import annotations

import hashlib
import json
import uuid
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import replace
from pathlib import Path
from typing import Any

from .catalog import CurriculumCatalog
from .grading import grade
from .ledger import ExperimentLedger
from .mentor import TraceAwareMentor
from .models import (
    CohortSummary,
    GradeResult,
    Hint,
    ItemProgress,
    LearnerSummary,
    TraceEvent,
)
from .progress import ProgressStore, validate_id


class AcademyService:
    def __init__(
        self,
        catalog: CurriculumCatalog,
        progress_store: ProgressStore,
        mentor: TraceAwareMentor | None = None,
    ) -> None:
        self.catalog = catalog
        self.store = progress_store
        self.mentor = mentor or TraceAwareMentor()

    @classmethod
    def from_paths(cls, academy_root: str | Path, state_root: str | Path) -> "AcademyService":
        return cls(CurriculumCatalog.load(academy_root), ProgressStore(state_root))

    def start(self, learner_id: str, item_id: str) -> ItemProgress:
        validate_id(learner_id, "learner id")
        item = self.catalog.item(item_id)
        self._require_prerequisites(learner_id, item.prerequisites)
        before = self.store.get_item(learner_id, item_id)
        progress = self.store.start(learner_id, item_id)
        if before.status == "not_started":
            self.store.append_trace(learner_id, "lesson_started", item_id)
        return progress

    def check(
        self,
        learner_id: str,
        item_id: str,
        submission: Mapping[str, Any],
        *,
        record: bool = True,
    ) -> GradeResult:
        validate_id(learner_id, "learner id")
        item = self.catalog.item(item_id)
        self._require_prerequisites(learner_id, item.prerequisites)
        result = grade(item, submission)
        if record:
            current = self.start(learner_id, item_id)
            failures = tuple(row.id for row in result.criteria if not row.passed)
            updated = replace(
                current,
                attempts=current.attempts + 1,
                best_score=max(current.best_score, result.score),
                last_failures=failures,
            )
            self.store.put_item(learner_id, updated)
            self.store.append_trace(
                learner_id,
                "check_passed" if result.passed else "check_failed",
                item_id,
                {"score": result.score, "failure_count": len(failures)},
            )
        return result

    def submit(self, learner_id: str, item_id: str, submission: Mapping[str, Any]) -> GradeResult:
        validate_id(learner_id, "learner id")
        item = self.catalog.item(item_id)
        self._require_prerequisites(learner_id, item.prerequisites)
        result = grade(item, submission)
        current = self.start(learner_id, item_id)
        failures = tuple(row.id for row in result.criteria if not row.passed)
        updated = replace(
            current,
            status="completed" if result.passed else "in_progress",
            attempts=current.attempts + 1,
            best_score=max(current.best_score, result.score),
            last_failures=failures,
        )
        self.store.put_item(learner_id, updated)
        self.store.append_trace(
            learner_id,
            "lesson_passed" if result.passed else "submission_failed",
            item_id,
            {"score": result.score, "failure_count": len(failures)},
        )
        if result.passed:
            evidence = self._record_evidence(learner_id, item_id, submission)
            self.store.append_trace(
                learner_id,
                "evidence_recorded",
                item_id,
                {"record_id": evidence.id, "record_hash": evidence.record_hash},
            )
        return result

    def hint(self, learner_id: str, item_id: str) -> Hint:
        item = self.catalog.item(item_id)
        self._require_prerequisites(learner_id, item.prerequisites)
        current = self.start(learner_id, item_id)
        level = current.hint_level + 1
        hint = self.mentor.hint(
            item,
            level,
            current.last_failures,
            self.store.trace(learner_id),
        )
        self.store.put_item(learner_id, replace(current, hint_level=level))
        self.store.append_trace(learner_id, "hint_requested", item_id, {"level": level})
        return hint

    def progress(self, learner_id: str) -> LearnerSummary:
        return self.store.summary(learner_id)

    def trace(self, learner_id: str, limit: int | None = None) -> tuple[TraceEvent, ...]:
        return self.store.trace(learner_id, limit)

    def cohort_summary(self, cohort_id: str, learner_ids: Sequence[str]) -> CohortSummary:
        validate_id(cohort_id, "cohort id")
        summaries = [self.progress(learner_id) for learner_id in learner_ids]
        completed = sum(row.completed for row in summaries)
        started = sum(row.completed + row.in_progress for row in summaries)
        failures: Counter[str] = Counter()
        for summary in summaries:
            for item in summary.items:
                failures.update(item.last_failures)
        rate = completed / started if started else 0.0
        return CohortSummary(
            cohort_id=cohort_id,
            learners=len(summaries),
            completed_items=completed,
            started_items=started,
            completion_rate=round(rate, 4),
            common_failures=tuple(failures.most_common(10)),
        )

    def _require_prerequisites(self, learner_id: str, prerequisites: Sequence[str]) -> None:
        incomplete = [
            item_id
            for item_id in prerequisites
            if self.store.get_item(learner_id, item_id).status != "completed"
        ]
        if incomplete:
            raise ValueError(f"Complete prerequisites first: {', '.join(incomplete)}")

    def _record_evidence(
        self,
        learner_id: str,
        item_id: str,
        submission: Mapping[str, Any],
    ):
        encoded = json.dumps(submission, sort_keys=True, separators=(",", ":")).encode()
        pending = self.store.root / "pending-evidence"
        pending.mkdir(parents=True, exist_ok=True)
        snapshot = pending / f"{uuid.uuid4().hex}.json"
        snapshot.write_bytes(encoded)
        ledger = ExperimentLedger(
            self.store.root / "experiment-ledger.jsonl",
            artifacts_root=self.store.root / "evidence-artifacts",
        )
        try:
            return ledger.record(
                experiment_id=f"{learner_id}:{item_id}",
                code_sha=hashlib.sha256(encoded).hexdigest(),
                data_hash=hashlib.sha256(f"{self.catalog.version}:{item_id}".encode()).hexdigest(),
                seed=int(submission.get("seed", 0)),
                parameters=dict(submission),
                costs=dict(submission.get("costs", {}))
                if isinstance(submission.get("costs", {}), Mapping)
                else {},
                folds=list(submission.get("folds", []))
                if isinstance(submission.get("folds", []), list)
                else [],
                artifacts=[snapshot],
            )
        finally:
            snapshot.unlink(missing_ok=True)
