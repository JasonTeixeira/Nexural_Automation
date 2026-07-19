from __future__ import annotations

import json
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from nexural_research.academy.catalog import CurriculumCatalog, default_academy_root
from nexural_research.api.app import app
from nexural_research.cli import main


def test_academy_http_learning_loop(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("NEXURAL_ACADEMY_STATE_DIR", str(tmp_path))
    client = TestClient(app)

    catalog = client.get("/api/academy/catalog")
    assert catalog.status_code == 200
    assert len(catalog.json()["tracks"]) == 5
    lookahead = catalog.json()["lessons"]["research.lookahead"]
    assert lookahead["hidden_checks"] == 2
    assert all(row["visibility"] == "public" for row in lookahead["rubric"])
    assert "uses_future_columns" not in lookahead["starter_submission"]
    serialized_catalog = json.dumps(catalog.json())
    assert "future_guard" not in serialized_catalog
    assert "uses_future_columns" not in serialized_catalog

    started = client.post(
        "/api/academy/items/research.lookahead/start",
        json={"learner_id": "api-learner", "submission": {}},
    )
    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"

    solution = (
        Path(__file__).resolve().parents[5]
        / "academy"
        / "lessons"
        / "research-lookahead"
        / "solution"
        / "program.yaml"
    )
    source = yaml.safe_load(solution.read_text())
    checked = client.post(
        "/api/academy/items/research.lookahead/check",
        json={
            "learner_id": "api-learner",
            "submission": {"source": source},
        },
    )
    assert checked.status_code == 200
    assert checked.json()["passed"] is True
    assert "future_guard" not in json.dumps(checked.json())
    assert checked.json()["hidden_checks"] == {"count": 2, "passed": True}
    assert all(row["visibility"] == "public" for row in checked.json()["criteria"])

    progress = client.get("/api/academy/progress/api-learner")
    assert progress.status_code == 200
    assert progress.json()["completed"] == 0

    submitted = client.post(
        "/api/academy/items/research.lookahead/submit",
        json={
            "learner_id": "api-learner",
            "submission": {"source": source},
        },
    )
    assert submitted.status_code == 200
    assert submitted.json()["passed"] is True
    assert client.get("/api/academy/progress/api-learner").json()["completed"] == 1
    trace = client.get("/api/academy/trace/api-learner").json()
    assert [event["event"] for event in trace[-2:]] == ["lesson_passed", "evidence_recorded"]
    ledger = client.get("/api/academy/ledger/api-learner").json()
    assert ledger[-1]["verified"] is True
    assert ledger[-1]["item_id"] == "research.lookahead"


def test_academy_http_rejects_invalid_learner(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("NEXURAL_ACADEMY_STATE_DIR", str(tmp_path))
    response = TestClient(app).get("/api/academy/progress/..%2Fescape")
    assert response.status_code in {400, 404, 422}


def test_academy_http_enforces_prerequisites(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("NEXURAL_ACADEMY_STATE_DIR", str(tmp_path))
    response = TestClient(app).post(
        "/api/academy/items/research.walk_forward/start",
        json={"learner_id": "api-learner", "submission": {}},
    )
    assert response.status_code == 422
    assert "research.lookahead" in response.json()["detail"]


def test_credential_issuance_uses_server_progress(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("NEXURAL_ACADEMY_STATE_DIR", str(tmp_path))
    monkeypatch.setenv("NEXURAL_ACADEMY_SIGNING_KEY", "test-key-that-is-at-least-24-bytes")
    response = TestClient(app).post(
        "/api/academy/credentials/issue",
        json={
            "learner_id": "new-learner",
            "credential": "automation-knowledge-attestation",
        },
    )
    assert response.status_code == 409
    assert "completed capstones" in response.json()["detail"]


def test_academy_cli_catalog_and_progress(tmp_path: Path, monkeypatch, capsys) -> None:
    monkeypatch.setenv("NEXURAL_ACADEMY_STATE_DIR", str(tmp_path))

    assert main(["academy", "catalog", "--json"]) == 0
    catalog = json.loads(capsys.readouterr().out)
    assert len(catalog["tracks"]) == 5

    assert main(["academy", "progress", "--learner", "cli-learner", "--json"]) == 0
    progress = json.loads(capsys.readouterr().out)
    assert progress["learner_id"] == "cli-learner"


def test_packaged_academy_content_is_complete() -> None:
    root = default_academy_root()
    catalog = CurriculumCatalog.load(root)

    assert root.name == "content"
    assert len(catalog.tracks) == 5
    assert len(catalog.lessons) == 60
    assert len(catalog.capstones) == 5
    assert all(item.execution is not None for item in catalog.lessons.values())
    assert all(item.execution is not None for item in catalog.capstones.values())
    assert (root / "marketplace" / "catalog.yaml").is_file()
    assert (root / "schema" / "learning-item.schema.json").is_file()


def test_packaged_academy_content_matches_repository_source() -> None:
    packaged = default_academy_root()
    repository = Path(__file__).resolve().parents[5] / "academy"

    def resources(root: Path) -> dict[str, bytes]:
        return {
            path.relative_to(root).as_posix(): path.read_bytes()
            for path in root.rglob("*")
            if path.is_file()
            and path.suffix in {".yaml", ".json", ".md"}
            and not any(part.startswith(".") for part in path.relative_to(root).parts)
        }

    assert resources(packaged) == resources(repository)
