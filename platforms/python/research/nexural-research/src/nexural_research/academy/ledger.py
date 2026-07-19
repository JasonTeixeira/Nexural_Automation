"""Append-only experiment and artifact lineage ledger."""

from __future__ import annotations

import hashlib
import json
import shutil
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import utc_now_iso

_LEDGER_LOCKS: dict[Path, threading.RLock] = {}
_LEDGER_LOCKS_GUARD = threading.Lock()


def _ledger_lock(path: Path) -> threading.RLock:
    with _LEDGER_LOCKS_GUARD:
        return _LEDGER_LOCKS.setdefault(path, threading.RLock())


@dataclass(frozen=True)
class ArtifactRecord:
    name: str
    path: str
    sha256: str
    size: int


@dataclass(frozen=True)
class ExperimentRecord:
    id: str
    experiment_id: str
    recorded_at: str
    code_sha: str
    data_hash: str
    seed: int
    parameters: dict[str, Any]
    costs: dict[str, Any]
    folds: list[dict[str, Any]]
    artifacts: tuple[ArtifactRecord, ...]
    previous_hash: str | None
    record_hash: str


class ExperimentLedger:
    def __init__(self, path: str | Path, *, artifacts_root: str | Path) -> None:
        self.path = Path(path).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.artifacts_root = Path(artifacts_root).resolve()
        self.artifacts_root.mkdir(parents=True, exist_ok=True)

    def record(
        self,
        *,
        experiment_id: str,
        code_sha: str,
        data_hash: str,
        seed: int,
        parameters: dict[str, Any],
        costs: dict[str, Any],
        folds: list[dict[str, Any]],
        artifacts: list[str | Path],
    ) -> ExperimentRecord:
        with _ledger_lock(self.path):
            record_id = uuid.uuid4().hex
            destination = self.artifacts_root / record_id
            destination.mkdir()
            artifact_rows: list[ArtifactRecord] = []
            for source_value in artifacts:
                source = Path(source_value).resolve(strict=True)
                if not source.is_file():
                    raise ValueError(f"Artifact must be a file: {source}")
                target = destination / source.name
                shutil.copy2(source, target)
                artifact_rows.append(
                    ArtifactRecord(
                        source.name,
                        str(target),
                        _file_hash(target),
                        target.stat().st_size,
                    )
                )
            prior = self.list()
            unsigned = {
                "id": record_id,
                "experiment_id": experiment_id,
                "recorded_at": utc_now_iso(),
                "code_sha": code_sha,
                "data_hash": data_hash,
                "seed": int(seed),
                "parameters": parameters,
                "costs": costs,
                "folds": folds,
                "artifacts": [row.__dict__ for row in artifact_rows],
                "previous_hash": prior[-1].record_hash if prior else None,
            }
            record_hash = _payload_hash(unsigned)
            payload = {**unsigned, "record_hash": record_hash}
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n")
            return _parse_record(payload)

    def list(self) -> tuple[ExperimentRecord, ...]:
        if not self.path.exists():
            return ()
        return tuple(
            _parse_record(json.loads(line))
            for line in self.path.read_text(encoding="utf-8").splitlines()
            if line
        )

    def verify(self, record_id: str | None = None) -> bool:
        previous: str | None = None
        found = record_id is None
        for record in self.list():
            unsigned = {
                "id": record.id,
                "experiment_id": record.experiment_id,
                "recorded_at": record.recorded_at,
                "code_sha": record.code_sha,
                "data_hash": record.data_hash,
                "seed": record.seed,
                "parameters": record.parameters,
                "costs": record.costs,
                "folds": record.folds,
                "artifacts": [row.__dict__ for row in record.artifacts],
                "previous_hash": record.previous_hash,
            }
            if record.previous_hash != previous or _payload_hash(unsigned) != record.record_hash:
                return False
            if any(_file_hash(Path(row.path)) != row.sha256 for row in record.artifacts):
                return False
            previous = record.record_hash
            found = found or record.id == record_id
        return found


def _payload_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _parse_record(payload: dict[str, Any]) -> ExperimentRecord:
    return ExperimentRecord(
        id=payload["id"],
        experiment_id=payload["experiment_id"],
        recorded_at=payload["recorded_at"],
        code_sha=payload["code_sha"],
        data_hash=payload["data_hash"],
        seed=int(payload["seed"]),
        parameters=payload["parameters"],
        costs=payload["costs"],
        folds=payload["folds"],
        artifacts=tuple(ArtifactRecord(**row) for row in payload["artifacts"]),
        previous_hash=payload["previous_hash"],
        record_hash=payload["record_hash"],
    )
