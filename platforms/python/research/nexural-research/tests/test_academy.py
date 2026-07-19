from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator

from nexural_research.academy import AcademyService, CurriculumCatalog
from nexural_research.academy.credentials import CredentialIssuer
from nexural_research.academy.faults import FaultInjector
from nexural_research.academy.freshness import check_freshness
from nexural_research.academy.ledger import ExperimentLedger
from nexural_research.academy.marketplace import Marketplace
from nexural_research.academy.plugins import PluginRegistry

REPO_ROOT = Path(__file__).resolve().parents[5]
ACADEMY_ROOT = REPO_ROOT / "academy"


def test_catalog_loads_five_tracks_sixty_labs_and_five_capstones() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)

    assert len(catalog.tracks) == 5
    assert len(catalog.lessons) == 60
    assert len(catalog.capstones) == 5
    assert all(lesson.objectives and lesson.rubric for lesson in catalog.lessons.values())
    assert all(
        "profit" not in criterion.metric.lower()
        for lesson in catalog.lessons.values()
        for criterion in lesson.rubric
    )


def test_service_runs_learning_loop_and_never_scores_profitability(tmp_path: Path) -> None:
    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    item = service.catalog.item("research.lookahead")
    starter = yaml.safe_load((item.content_root / "starter" / "program.yaml").read_text())
    solution = yaml.safe_load((item.content_root / "solution" / "program.yaml").read_text())
    started = service.start("alice", "research.lookahead")
    assert started.status == "in_progress"

    bad = service.check("alice", "research.lookahead", {"source": starter})
    assert not bad.passed
    assert bad.score < 100
    hint = service.hint("alice", "research.lookahead")
    assert hint.level == 1
    assert "split" in hint.text.lower()

    good = service.submit(
        "alice",
        "research.lookahead",
        {"source": solution},
    )
    assert good.passed
    assert good.score == 100
    assert service.progress("alice").completed == 1
    assert [event.event for event in service.trace("alice")] == [
        "lesson_started",
        "check_failed",
        "hint_requested",
        "lesson_passed",
        "evidence_recorded",
    ]


def test_grading_is_deterministic_and_hidden_feedback_is_withheld(tmp_path: Path) -> None:
    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    item = service.catalog.item("research.lookahead")
    source = yaml.safe_load((item.content_root / "solution" / "program.yaml").read_text())
    source["program"]["settings"]["mode"] = "live"
    submission = {"source": source}
    first = service.check("a", "research.lookahead", submission)
    second = service.check("a", "research.lookahead", submission)
    assert first == second
    hidden = [item for item in first.criteria if item.visibility == "hidden"]
    assert hidden and hidden[0].message == "A hidden safety check failed."


def test_progress_store_rejects_path_traversal(tmp_path: Path) -> None:
    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    with pytest.raises(ValueError):
        service.start("../escape", "research.lookahead")


def test_prerequisites_are_enforced_below_the_ui(tmp_path: Path) -> None:
    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    with pytest.raises(ValueError, match="research.lookahead"):
        service.start("alice", "research.walk_forward")
    with pytest.raises(ValueError, match="research.lookahead"):
        service.submit("alice", "research.walk_forward", {})


def test_fault_injection_is_seeded_and_has_required_profiles() -> None:
    injector = FaultInjector()
    assert {"disconnect", "duplicate", "latency", "partial_fill", "stale_data"} <= set(
        injector.profiles
    )
    assert injector.apply("duplicate", [{"id": "a"}], seed=7) == injector.apply(
        "duplicate", [{"id": "a"}], seed=7
    )


def test_experiment_ledger_hashes_artifacts_and_is_append_only(tmp_path: Path) -> None:
    artifact = tmp_path / "evidence.json"
    artifact.write_text('{"safe": true}', encoding="utf-8")
    ledger = ExperimentLedger(tmp_path / "ledger.jsonl", artifacts_root=tmp_path / "artifacts")
    record = ledger.record(
        experiment_id="exp-1",
        code_sha="abc123",
        data_hash="def456",
        seed=42,
        parameters={"window": 20},
        costs={"commission": 2.4},
        folds=[{"train": [0, 9], "test": [10, 14]}],
        artifacts=[artifact],
    )
    assert record.artifacts[0].sha256
    assert ledger.verify(record.id)
    assert ledger.list()[0].id == record.id


def test_plugins_are_typed_unique_and_discoverable() -> None:
    registry = PluginRegistry()
    registry.register("lessons", "example", lambda: "ok", version="1.0.0")
    assert registry.get("lessons", "example").factory() == "ok"
    with pytest.raises(ValueError):
        registry.register("lessons", "example", lambda: "again")
    with pytest.raises(ValueError):
        registry.register("unknown", "x", lambda: None)


def test_plugin_entry_points_are_fail_closed_and_allowlisted(monkeypatch) -> None:
    loaded: list[str] = []

    class FakeDistribution:
        metadata = {"Name": "Nexural-Academy-Demo"}
        version = "2.1.0"

    class FakeEntryPoint:
        name = "lessons.causal-demo"
        value = "demo_package:factory"
        dist = FakeDistribution()

        @staticmethod
        def load():
            loaded.append("imported")
            return lambda: "lesson"

    monkeypatch.setattr(
        "nexural_research.academy.plugins.metadata.entry_points",
        lambda **_kwargs: [FakeEntryPoint()],
    )

    denied_registry = PluginRegistry()
    denied = denied_registry.discover([])
    assert not denied.loaded
    assert denied.rejected == ("Nexural-Academy-Demo:lessons.causal-demo",)
    assert not loaded

    allowed_registry = PluginRegistry()
    allowed = allowed_registry.discover(["nexural_academy_demo"])
    assert allowed.loaded == ("Nexural-Academy-Demo:lessons.causal-demo",)
    assert allowed_registry.get("lessons", "causal-demo").factory() == "lesson"
    assert loaded == ["imported"]


def test_credentials_are_signed_verifiable_and_tamper_evident() -> None:
    issuer = CredentialIssuer(b"a-key-long-enough-for-local-signing")
    token = issuer.issue("alice", "research-operator", ["research.lookahead"])
    verified = issuer.verify(token)
    assert verified.subject == "alice"
    header, payload, signature = token.split(".")
    tampered = f"{header}.{payload[:-1]}A.{signature}"
    with pytest.raises(ValueError):
        issuer.verify(tampered)


def test_marketplace_reviews_and_cohort_summary(tmp_path: Path) -> None:
    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path / "state")
    item = service.catalog.item("research.lookahead")
    solution = yaml.safe_load((item.content_root / "solution" / "program.yaml").read_text())
    service.submit(
        "a",
        "research.lookahead",
        {"source": solution},
    )
    service.start("b", "research.lookahead")
    summary = service.cohort_summary("desk", ["a", "b"])
    assert summary.learners == 2
    assert summary.completion_rate == 0.5

    market = Marketplace(tmp_path / "market.json")
    market.publish("safe-retries", "1.0.0", "a", ["bridge"], "sha256:abc")
    market.review("safe-retries", "b", 5, "Deterministic and useful")
    assert market.get("safe-retries").rating == 5.0


def test_translation_schema_and_curriculum_freshness() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    assert catalog.default_locale == "en"
    assert all("en" in item.translations for item in catalog.lessons.values())
    report = check_freshness(
        catalog,
        now=datetime(2026, 7, 19, tzinfo=UTC),
        max_age_days=365,
        required_locales=("en", "es"),
    )
    assert report.fresh


def test_content_is_valid_yaml_json_data() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    payload = catalog.to_dict()
    assert json.loads(json.dumps(payload))["schema_version"] == "1.0"

    schema = json.loads((ACADEMY_ROOT / "schema" / "learning-item.schema.json").read_text())
    validator = Draft202012Validator(schema)
    manifests = list((ACADEMY_ROOT / "lessons").glob("*/manifest.yaml"))
    manifests += list((ACADEMY_ROOT / "capstones").glob("*/manifest.yaml"))
    for path in manifests:
        validator.validate(yaml.safe_load(path.read_text(encoding="utf-8")))
