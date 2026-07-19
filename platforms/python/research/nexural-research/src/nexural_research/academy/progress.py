"""Local, atomic learner progress and append-only trace storage."""

from __future__ import annotations

import json
import re
import threading
import uuid
from dataclasses import replace
from pathlib import Path
from typing import Any, cast

from .models import ItemProgress, LearnerSummary, TraceEvent, model_dict, utc_now_iso

SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$")
_LOCKS: dict[Path, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()


def _lock_for(path: Path) -> threading.RLock:
    with _LOCKS_GUARD:
        return _LOCKS.setdefault(path, threading.RLock())


def validate_id(value: str, label: str = "identifier") -> str:
    if not SAFE_ID.fullmatch(value):
        raise ValueError(f"Unsafe {label}: use letters, numbers, '.', '_', '@', or '-'")
    return value


class ProgressStore:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def get_item(self, learner_id: str, item_id: str) -> ItemProgress:
        state = self._read(learner_id)
        row = state.get("items", {}).get(item_id)
        if not row:
            return ItemProgress(item_id=item_id, status="not_started")
        return ItemProgress(
            item_id=item_id,
            status=row["status"],
            attempts=int(row.get("attempts", 0)),
            hint_level=int(row.get("hint_level", 0)),
            best_score=int(row.get("best_score", 0)),
            last_failures=tuple(row.get("last_failures", ())),
        )

    def put_item(self, learner_id: str, progress: ItemProgress) -> ItemProgress:
        with _lock_for(self._path(learner_id)):
            state = self._read(learner_id)
            state.setdefault("items", {})[progress.item_id] = model_dict(progress)
            self._write(learner_id, state)
        return progress

    def start(self, learner_id: str, item_id: str) -> ItemProgress:
        current = self.get_item(learner_id, item_id)
        if current.status == "not_started":
            current = replace(current, status="in_progress")
            self.put_item(learner_id, current)
        return current

    def summary(self, learner_id: str) -> LearnerSummary:
        validate_id(learner_id, "learner id")
        items = tuple(
            self.get_item(learner_id, item_id)
            for item_id in sorted(self._read(learner_id).get("items", {}))
        )
        return LearnerSummary(
            learner_id=learner_id,
            completed=sum(row.status == "completed" for row in items),
            in_progress=sum(row.status == "in_progress" for row in items),
            total_attempts=sum(row.attempts for row in items),
            items=items,
        )

    def append_trace(
        self,
        learner_id: str,
        event: str,
        item_id: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> TraceEvent:
        validate_id(learner_id, "learner id")
        trace = TraceEvent(utc_now_iso(), event, learner_id, item_id, data or {})
        path = self._trace_path(learner_id)
        with _lock_for(path):
            with path.open("a", encoding="utf-8") as handle:
                payload = json.dumps(model_dict(trace), sort_keys=True, separators=(",", ":"))
                handle.write(payload + "\n")
        return trace

    def trace(self, learner_id: str, limit: int | None = None) -> tuple[TraceEvent, ...]:
        validate_id(learner_id, "learner id")
        path = self._trace_path(learner_id)
        if not path.exists():
            return ()
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
        if limit is not None:
            rows = rows[-limit:]
        return tuple(TraceEvent(**row) for row in rows)

    def _path(self, learner_id: str) -> Path:
        return self.root / f"{validate_id(learner_id, 'learner id')}.json"

    def _trace_path(self, learner_id: str) -> Path:
        return self.root / f"{validate_id(learner_id, 'learner id')}.trace.jsonl"

    def _read(self, learner_id: str) -> dict[str, Any]:
        path = self._path(learner_id)
        if not path.exists():
            return {"learner_id": learner_id, "items": {}}
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("learner_id") != learner_id:
            raise ValueError("Progress identity mismatch")
        return cast(dict[str, Any], payload)

    def _write(self, learner_id: str, state: dict[str, Any]) -> None:
        path = self._path(learner_id)
        temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_text(
            json.dumps(state, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
