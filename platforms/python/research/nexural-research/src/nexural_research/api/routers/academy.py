"""Scenario-driven Automation Academy HTTP surface.

The router is intentionally thin: the same domain service powers the CLI and
offline workflows, so grading and evidence semantics cannot drift by client.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any, Literal

import yaml  # type: ignore[import-untyped]
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from nexural_research.academy import AcademyService, CurriculumCatalog
from nexural_research.academy.credentials import CredentialIssuer
from nexural_research.academy.faults import FaultInjector
from nexural_research.academy.freshness import check_freshness
from nexural_research.academy.ledger import ExperimentLedger
from nexural_research.academy.presentation import (
    learner_catalog,
    learner_grade,
    learner_progress,
)
from nexural_research.api.auth import current_auth, is_auth_enabled, require_auth

router = APIRouter(
    prefix="/academy",
    tags=["academy"],
    dependencies=[Depends(require_auth)],
)


class LearningActionRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    submission: dict[str, Any] = Field(default_factory=dict)


class FaultRequest(BaseModel):
    profile: Literal["disconnect", "duplicate", "latency", "partial_fill", "stale_data"]
    events: list[dict[str, Any]]
    seed: int = 0


class CohortRequest(BaseModel):
    cohort_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    learner_ids: list[str] = Field(min_length=1, max_length=500)


class CredentialRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    credential: Literal["automation-knowledge-attestation"] = (
        "automation-knowledge-attestation"
    )


class CredentialVerifyRequest(BaseModel):
    token: str = Field(min_length=10, max_length=20_000)


def academy_root() -> Path:
    configured = os.environ.get("NEXURAL_ACADEMY_ROOT")
    if configured:
        root = Path(configured).expanduser().resolve()
        if not (root / "curriculum.yaml").is_file():
            raise RuntimeError("NEXURAL_ACADEMY_ROOT does not contain curriculum.yaml")
        return root
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "academy"
        if (candidate / "curriculum.yaml").is_file():
            return candidate
    raise RuntimeError("Academy curriculum directory could not be located")


def academy_state_root() -> Path:
    configured = os.environ.get("NEXURAL_ACADEMY_STATE_DIR")
    root = Path(configured).expanduser() if configured else Path.home() / ".nexural" / "academy"
    root = root.resolve()
    if is_auth_enabled():
        auth = current_auth()
        if not auth or not auth.authenticated or not auth.key_hash:
            raise HTTPException(status_code=401, detail="Academy authentication context missing")
        return root / "owners" / auth.key_hash
    return root


def academy_service() -> AcademyService:
    return AcademyService.from_paths(academy_root(), academy_state_root())


def _domain_call(operation):
    try:
        return operation()
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/catalog")
def get_catalog() -> dict[str, Any]:
    return learner_catalog(CurriculumCatalog.load(academy_root()))


@router.get("/progress/{learner_id}")
def get_progress(learner_id: str) -> dict[str, Any]:
    service = academy_service()
    return learner_progress(
        _domain_call(lambda: service.progress(learner_id)),
        service.catalog,
    )


@router.get("/trace/{learner_id}")
def get_trace(learner_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    if limit is not None and not 1 <= limit <= 5_000:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 5000")
    return [asdict(row) for row in _domain_call(lambda: academy_service().trace(learner_id, limit))]


@router.get("/ledger/{learner_id}")
def get_ledger(learner_id: str) -> list[dict[str, Any]]:
    service = academy_service()
    _domain_call(lambda: service.progress(learner_id))
    ledger = ExperimentLedger(
        service.store.root / "experiment-ledger.jsonl",
        artifacts_root=service.store.root / "evidence-artifacts",
    )
    rows = []
    for record in ledger.list():
        prefix = f"{learner_id}:"
        if not record.experiment_id.startswith(prefix):
            continue
        rows.append(
            {
                "id": record.id,
                "item_id": record.experiment_id[len(prefix) :],
                "recorded_at": record.recorded_at,
                "code_sha": record.code_sha,
                "data_hash": record.data_hash,
                "seed": record.seed,
                "costs": record.costs,
                "folds": record.folds,
                "artifacts": [
                    {"name": item.name, "sha256": item.sha256, "size": item.size}
                    for item in record.artifacts
                ],
                "previous_hash": record.previous_hash,
                "record_hash": record.record_hash,
                "verified": ledger.verify(record.id),
            }
        )
    return rows


@router.post("/items/{item_id}/start")
def start_item(item_id: str, request: LearningActionRequest) -> dict[str, Any]:
    return asdict(_domain_call(lambda: academy_service().start(request.learner_id, item_id)))


@router.post("/items/{item_id}/check")
def check_item(item_id: str, request: LearningActionRequest) -> dict[str, Any]:
    return learner_grade(
        _domain_call(
            lambda: academy_service().check(
                request.learner_id,
                item_id,
                request.submission,
                record=True,
            )
        )
    )


@router.post("/items/{item_id}/submit")
def submit_item(item_id: str, request: LearningActionRequest) -> dict[str, Any]:
    return learner_grade(
        _domain_call(
            lambda: academy_service().submit(request.learner_id, item_id, request.submission)
        )
    )


@router.post("/items/{item_id}/hint")
def hint_item(item_id: str, request: LearningActionRequest) -> dict[str, Any]:
    return asdict(_domain_call(lambda: academy_service().hint(request.learner_id, item_id)))


@router.get("/freshness")
def get_freshness(max_age_days: int = 365, locales: str = "en,es") -> dict[str, Any]:
    if not 1 <= max_age_days <= 3_650:
        raise HTTPException(status_code=422, detail="max_age_days must be between 1 and 3650")
    report = check_freshness(
        CurriculumCatalog.load(academy_root()),
        max_age_days=max_age_days,
        required_locales=tuple(locale.strip() for locale in locales.split(",") if locale.strip()),
    )
    payload = asdict(report)
    payload["stale_items"] = sorted({issue.item_id for issue in report.issues})
    return payload


@router.post("/faults/apply")
def apply_fault(request: FaultRequest) -> dict[str, Any]:
    events = FaultInjector().apply(request.profile, request.events, seed=request.seed)
    return {"profile": request.profile, "seed": request.seed, "events": events}


@router.post("/cohorts/summary")
def cohort_summary(request: CohortRequest) -> dict[str, Any]:
    return asdict(
        _domain_call(
            lambda: academy_service().cohort_summary(request.cohort_id, request.learner_ids)
        )
    )


@router.get("/marketplace")
def marketplace_catalog() -> dict[str, Any]:
    marketplace_root = (academy_root() / "marketplace").resolve()
    path = marketplace_root / "catalog.yaml"
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return {"templates": []}
    for entry in payload.get("templates", []):
        package = (marketplace_root / entry["package"]).resolve(strict=True)
        if marketplace_root not in package.parents or not package.is_file():
            raise HTTPException(status_code=500, detail="Marketplace package path is invalid")
        actual = f"sha256:{hashlib.sha256(package.read_bytes()).hexdigest()}"
        if actual != entry["digest"]:
            raise HTTPException(status_code=500, detail="Marketplace package digest mismatch")
    return payload


def _credential_issuer() -> CredentialIssuer:
    signing_key = os.environ.get("NEXURAL_ACADEMY_SIGNING_KEY")
    if not signing_key or len(signing_key) < 24:
        raise HTTPException(
            status_code=503,
            detail="Credential issuance requires NEXURAL_ACADEMY_SIGNING_KEY (24+ characters).",
        )
    return CredentialIssuer(signing_key.encode("utf-8"))


@router.post("/credentials/issue")
def issue_credential(request: CredentialRequest) -> dict[str, str]:
    service = academy_service()
    summary = _domain_call(lambda: service.progress(request.learner_id))
    completed = {item.item_id for item in summary.items if item.status == "completed"}
    required = set(service.catalog.capstones)
    missing = sorted(required - completed)
    if missing:
        raise HTTPException(
            status_code=409,
            detail=f"Credential requires completed capstones: {', '.join(missing)}",
        )
    auth = current_auth()
    subject = (
        auth.key_hash
        if is_auth_enabled() and auth and auth.authenticated and auth.key_hash
        else request.learner_id
    )
    evidence = sorted(completed)
    token = _credential_issuer().issue(subject, request.credential, evidence)
    return {"token": token}


@router.post("/credentials/verify")
def verify_credential(request: CredentialVerifyRequest) -> dict[str, Any]:
    return asdict(_domain_call(lambda: _credential_issuer().verify(request.token)))
