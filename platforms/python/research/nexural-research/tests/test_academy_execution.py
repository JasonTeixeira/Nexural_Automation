from __future__ import annotations

import json
from pathlib import Path

import pytest

from nexural_research.academy import AcademyService, CurriculumCatalog
from nexural_research.academy.authoring import scaffold_item, validate_package
from nexural_research.academy.execution import execute_item
from nexural_research.academy.presentation import learner_catalog

REPO_ROOT = Path(__file__).resolve().parents[5]
ACADEMY_ROOT = REPO_ROOT / "academy"


def test_curriculum_has_exactly_sixty_executable_labs_across_five_tracks() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)

    assert len(catalog.tracks) == 5
    assert len(catalog.lessons) == 60
    assert len(catalog.capstones) >= 4
    assert all(len(track.lessons) == 12 for track in catalog.tracks.values())
    assert all(item.execution is not None for item in catalog.lessons.values())


def test_every_lab_package_has_bilingual_executable_assets() -> None:
    required = {
        "concept.en.md",
        "concept.es.md",
        "starter/program.yaml",
        "tests/visible.yaml",
        "tests/hidden.yaml",
        "solution/program.yaml",
        "expected-trace.json",
        "rubric.yaml",
    }
    packages = sorted((ACADEMY_ROOT / "lessons").glob("*/manifest.yaml"))

    assert len(packages) == 60
    for manifest in packages:
        package = manifest.parent
        present = {
            path.relative_to(package).as_posix() for path in package.rglob("*") if path.is_file()
        }
        assert required <= present, package.name
        report = validate_package(package)
        assert report.valid, report.errors


def test_machine_runner_derives_results_and_rejects_declared_answers(tmp_path: Path) -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    item = catalog.item("research.lookahead")
    solution = item.content_root / "solution" / "program.yaml"

    artifact = execute_item(item, {"source_path": str(solution)})
    assert artifact["trace"]["status"] == "complete"
    assert artifact["fault_evidence"]
    assert artifact["digest"].startswith("sha256:")

    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    forged = {
        "split_before_features": True,
        "feature_lag": 1,
        "uses_future_columns": False,
        "tests": {"all": {"passed": True}},
    }
    result = service.check("artifact-test", item.id, forged, record=False)
    assert not result.passed


def test_tampered_machine_artifact_is_replayed_not_trusted(tmp_path: Path) -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    item = catalog.item("research.lookahead")
    starter = item.content_root / "starter" / "program.yaml"
    artifact = execute_item(item, {"source_path": str(starter)})
    artifact["tests"] = {criterion.id: {"passed": True} for criterion in item.rubric}

    service = AcademyService.from_paths(ACADEMY_ROOT, tmp_path)
    result = service.check("tamper-test", item.id, {"artifact": artifact}, record=False)
    assert not result.passed


def test_learner_catalog_contains_starter_source_but_no_expected_answers() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    payload = learner_catalog(catalog)
    item = payload["lessons"]["research.lookahead"]
    serialized = json.dumps(item)

    assert item["starter_submission"] == {
        "source": item["starter_source"],
        "seed": 0,
    }
    assert "expected" not in serialized
    assert "hidden_tests" not in serialized
    assert "future_guard" not in serialized


def test_fault_evidence_is_a_graded_machine_derived_criterion() -> None:
    catalog = CurriculumCatalog.load(ACADEMY_ROOT)
    item = catalog.item("bridge.retries")
    solution = item.content_root / "solution" / "program.yaml"
    artifact = execute_item(item, {"source_path": str(solution)})

    assert any(row.metric.startswith("fault_evidence.") for row in item.rubric)
    profile = item.execution.fault_profiles[0]
    evidence = artifact["fault_evidence"][profile]
    assert evidence["injected_event_count"] > 0
    assert evidence["handled"] is True


def test_authoring_scaffold_is_complete_and_fails_until_implemented(tmp_path: Path) -> None:
    package = scaffold_item(
        tmp_path,
        item_id="nt8.example_lab",
        track="nt8-foundations",
        title="Example Lab",
        title_es="Laboratorio de ejemplo",
    )

    report = validate_package(package)
    assert report.valid
    manifest = package / "manifest.yaml"
    assert manifest.is_file()
    assert (package / "tests" / "hidden.yaml").is_file()
    assert (package / "solution" / "program.yaml").is_file()
    with pytest.raises(FileExistsError):
        scaffold_item(
            tmp_path,
            item_id="nt8.example_lab",
            track="nt8-foundations",
            title="Example Lab",
            title_es="Laboratorio de ejemplo",
        )
