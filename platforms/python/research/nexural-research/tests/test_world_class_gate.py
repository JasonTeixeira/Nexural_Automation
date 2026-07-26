from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[5]


def load_gate() -> ModuleType:
    path = REPO_ROOT / "scripts" / "repo-tools" / "verify_world_class_gate.py"
    spec = importlib.util.spec_from_file_location("verify_world_class_gate", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def sha(character: str) -> str:
    return character * 64


def commit(character: str = "a") -> str:
    return character * 40


def scenarios() -> list[dict[str, str]]:
    return [
        {"id": f"scenario-{index:02d}", "result": "pass", "evidence_sha256": sha("b")}
        for index in range(10)
    ]


def build_complete_fixture(root: Path) -> None:
    for relative in (
        "qualification/policy.json",
        "schemas/desktop-qualification.schema.json",
        "schemas/automation-qualification.schema.json",
        "schemas/release-qualification.schema.json",
        "schemas/external-security-review.schema.json",
        "schemas/maintainer-attestation.schema.json",
        "schemas/beta-evidence.schema.json",
    ):
        source = REPO_ROOT / relative
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    write_json(
        root / "platforms/ninjatrader/packaging/supported-versions.json",
        {
            "ninjatrader": {
                "desktop_qualification_target_versions": ["8.1.7.1", "8.1.7.2"]
            }
        },
    )

    for index, (version, mode) in enumerate(
        (("8.1.7.1", "Playback101"), ("8.1.7.2", "Sim101")), start=1
    ):
        write_json(
            root / f"qualification/evidence/desktop/run-{index}.json",
            {
                "schema_version": "1.0.0",
                "tester_id": f"tester-{index:012x}",
                "machine_id": f"win-{index:012x}",
                "tested_commit": commit(),
                "archive_sha256": sha("a"),
                "environment": {
                    "windows_version": "Windows 11 24H2",
                    "nt8_version": version,
                    "provider_profile": f"provider-{index:012x}",
                },
                "desktop": {
                    "archive_imported": True,
                    "global_compile_passed": True,
                    "preexisting_errors": 0,
                    "evidence_sha256": sha("c"),
                },
                "account_mode": mode,
                "scenarios": scenarios(),
                "recovery": {
                    "disconnect_detected_seconds": 2.0,
                    "restart_reconciled_seconds": 12.0,
                    "evidence_sha256": sha("d"),
                },
                "attestation": {
                    "independent": True,
                    "paper_only": True,
                    "submitted_at": "2026-07-19T12:00:00Z",
                },
            },
        )

    write_json(
        root / "qualification/evidence/automation/run.json",
        {
            "schema_version": "1.0.0",
            "tested_commit": commit(),
            "workflow_run": "https://github.com/JasonTeixeira/Nexural_Automation/actions/runs/1",
            "kernel": {
                "property_cases": 50000,
                "fuzz_cases": 50000,
                "mutation_score_percent": 90.0,
                "surviving_critical_mutants": 0,
            },
            "recovery": {"disconnect_rto_seconds": 1.0, "restart_rto_seconds": 10.0},
            "vulnerabilities": {
                "critical": 0,
                "high": 0,
                "scanners": ["bandit", "pip-audit", "trivy"],
            },
            "generated_at": "2026-07-19T12:00:00Z",
        },
    )
    write_json(
        root / "qualification/evidence/releases/v2.1.0.json",
        {
            "schema_version": "1.0.0",
            "tag": "v2.1.0",
            "tested_commit": commit(),
            "release_commit": commit("9"),
            "workflow_run": "https://github.com/JasonTeixeira/Nexural_Automation/actions/runs/2",
            "reproducible": {"independent_builds": 2, "matching": True},
            "artifacts": [
                {"name": "package.whl", "sha256": sha("1")},
                {"name": "package.tar.gz", "sha256": sha("2")},
                {"name": "Nexural-NT8.zip", "sha256": sha("3")},
            ],
            "sbom": {"format": "SPDX-2.3", "sha256": sha("4")},
            "sigstore": {
                "signed": True,
                "verified": True,
                "oidc_issuer": "https://token.actions.githubusercontent.com",
                "certificate_identity": "https://github.com/JasonTeixeira/Nexural_Automation/.github/workflows/release.yml@refs/heads/main",
                "bundles": [
                    {
                        "artifact": "package.whl",
                        "artifact_sha256": sha("1"),
                        "bundle": "package.whl.sigstore.json",
                        "bundle_sha256": sha("a"),
                    },
                    {
                        "artifact": "package.tar.gz",
                        "artifact_sha256": sha("2"),
                        "bundle": "package.tar.gz.sigstore.json",
                        "bundle_sha256": sha("b"),
                    },
                    {
                        "artifact": "Nexural-NT8.zip",
                        "artifact_sha256": sha("3"),
                        "bundle": "Nexural-NT8.zip.sigstore.json",
                        "bundle_sha256": sha("c"),
                    },
                ],
            },
            "generated_at": "2026-07-19T12:00:00Z",
        },
    )
    write_json(
        root / "qualification/evidence/security-reviews/review.json",
        {
            "schema_version": "1.0.0",
            "reviewer_id": "reviewer-000000000001",
            "independent": True,
            "reviewed_commit": commit(),
            "scope": [
                "filesystem-api",
                "academy-execution",
                "nt8-bridge",
                "execution-risk-kernel",
                "ci-cd",
                "supply-chain",
            ],
            "report_sha256": sha("e"),
            "unresolved": {"critical": 0, "high": 0},
            "completed_at": "2026-07-19T12:00:00Z",
        },
    )
    for index, owner in ((1, True), (2, False)):
        write_json(
            root / f"qualification/evidence/maintainers/maintainer-{index}.json",
            {
                "schema_version": "1.0.0",
                "github_login": f"maintainer-{index}",
                "owner": owner,
                "qualified": True,
                "competencies": [
                    "ninjatrader",
                    "execution",
                    "risk",
                    "release-engineering",
                ],
                "reviewed_commit": commit(),
                "critical_path_approval": True,
                "attested_at": "2026-07-19T12:00:00Z",
            },
        )

    for index in range(100):
        write_json(
            root / f"beta/evidence/learner-{index:03d}.json",
            {
                "schema_version": "1.0.0",
                "participant_id": f"beta-{index:012x}",
                "tested_commit": commit(),
                "environment": {
                    "nt8_version": "8.1.7.2",
                    "windows_version": "Windows 11 24H2",
                    "connection": f"provider-{index % 3}",
                    "account_mode": "Playback101" if index % 2 == 0 else "Sim101",
                },
                "setup": {
                    "clean_machine": index < 95,
                    "minutes_to_first_compile": 5,
                    "minutes_to_first_playback": 8,
                },
                "learning": {
                    "completed_labs": ["nt8-lifecycle"],
                    "completed_capstones": ["nt8-playback"] if index < 25 else [],
                    "code_derived_grading": True,
                    "grading_digest": sha("f"),
                },
                "scenarios": scenarios(),
                "attestation": {
                    "paper_only": True,
                    "no_profitability_claim": True,
                    "submitted_at": "2026-07-19T12:00:00Z",
                },
            },
        )


def test_complete_fixture_passes_every_gate(tmp_path: Path) -> None:
    build_complete_fixture(tmp_path)
    report = load_gate().evaluate(tmp_path)
    assert report.complete is True
    assert report.validation_errors == ()
    assert all(item.passed for item in report.requirements)


@pytest.mark.parametrize(
    ("relative", "gate"),
    [
        ("qualification/evidence/desktop/run-2.json", "windows-machines"),
        ("qualification/evidence/releases/v2.1.0.json", "signed-releases"),
        ("qualification/evidence/security-reviews/review.json", "external-security-review"),
        ("qualification/evidence/maintainers/maintainer-2.json", "non-owner-maintainer"),
        ("beta/evidence/learner-099.json", "external-learners"),
    ],
)
def test_missing_independent_evidence_fails_closed(
    tmp_path: Path, relative: str, gate: str
) -> None:
    build_complete_fixture(tmp_path)
    (tmp_path / relative).unlink()
    report = load_gate().evaluate(tmp_path)
    result = next(item for item in report.requirements if item.id == gate)
    assert report.complete is False
    assert result.passed is False


def test_repository_does_not_claim_unearned_external_evidence() -> None:
    report = load_gate().evaluate(REPO_ROOT)
    assert report.complete is False
    assert (
        next(item for item in report.requirements if item.id == "external-learners").observed == 0
    )
    assert next(item for item in report.requirements if item.id == "signed-releases").observed == 0


def test_pre_release_stage_excludes_only_signed_release(tmp_path: Path) -> None:
    build_complete_fixture(tmp_path)
    (tmp_path / "qualification/evidence/releases/v2.1.0.json").unlink()
    report = load_gate().evaluate(tmp_path, stage="pre-release")
    assert report.complete is True
    signed = next(item for item in report.requirements if item.id == "signed-releases")
    assert signed.passed is False


def test_evidence_from_another_commit_is_ignored(tmp_path: Path) -> None:
    build_complete_fixture(tmp_path)
    report = load_gate().evaluate(tmp_path, target_commit=commit("9"))
    assert report.complete is False
    assert report.target_commit == commit("9")
    assert (
        next(
            item for item in report.requirements if item.id == "automated-evidence-bundle"
        ).observed
        == 0
    )


def test_failed_beta_scenarios_do_not_count_as_learners(tmp_path: Path) -> None:
    build_complete_fixture(tmp_path)
    learner = tmp_path / "beta/evidence/learner-099.json"
    record = json.loads(learner.read_text(encoding="utf-8"))
    record["scenarios"][0]["result"] = "fail"
    write_json(learner, record)
    report = load_gate().evaluate(tmp_path)
    learners = next(item for item in report.requirements if item.id == "external-learners")
    assert learners.observed == 99
    assert report.complete is False


def test_duplicate_beta_records_cannot_inflate_clean_setup_rate(tmp_path: Path) -> None:
    build_complete_fixture(tmp_path)
    for index in range(90, 95):
        path = tmp_path / f"beta/evidence/learner-{index:03d}.json"
        record = json.loads(path.read_text(encoding="utf-8"))
        record["setup"]["clean_machine"] = False
        write_json(path, record)
    clean_record = json.loads(
        (tmp_path / "beta/evidence/learner-000.json").read_text(encoding="utf-8")
    )
    for index in range(10):
        write_json(tmp_path / f"beta/evidence/duplicate-{index:02d}.json", clean_record)

    report = load_gate().evaluate(tmp_path)

    clean_rate = next(item for item in report.requirements if item.id == "clean-setup-rate")
    assert clean_rate.observed == 0.9
    assert clean_rate.passed is False
    assert report.complete is False
