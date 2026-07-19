from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

REPO_ROOT = Path(__file__).resolve().parents[5]
GENERATOR = REPO_ROOT / "scripts" / "repo-tools" / "generate_release_evidence.py"


def prepare_release_tree(tmp_path: Path) -> tuple[Path, Path, Path, Path]:
    artifacts = tmp_path / "release-artifacts"
    build_a = tmp_path / "build-a"
    build_b = tmp_path / "build-b"
    payloads = {
        "python/package.whl": b"wheel",
        "python/package.tar.gz": b"sdist",
        "nt8/Nexural-NT8.zip": b"nt8",
        "qualification/automation.json": b"{}",
        "sbom.spdx.json": b'{"spdxVersion":"SPDX-2.3"}',
        "SHA256SUMS": b"checksums",
    }
    for relative, content in payloads.items():
        payload = artifacts / relative
        payload.parent.mkdir(parents=True, exist_ok=True)
        payload.write_bytes(content)
        Path(f"{payload}.sigstore.json").write_text("{}\n", encoding="utf-8")
    for root in (build_a, build_b):
        for relative, content in {
            "python/package.whl": b"wheel",
            "python/package.tar.gz": b"sdist",
            "nt8/Nexural-NT8.zip": b"nt8",
        }.items():
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    return artifacts, build_a, build_b, artifacts / "sbom.spdx.json"


def run_generator(
    tmp_path: Path, artifacts: Path, build_a: Path, build_b: Path, sbom: Path
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(GENERATOR),
            "--artifacts",
            str(artifacts),
            "--build-a",
            str(build_a),
            "--build-b",
            str(build_b),
            "--bundle-root",
            str(artifacts),
            "--tag",
            "v2.1.0",
            "--commit",
            "a" * 40,
            "--release-commit",
            "b" * 40,
            "--workflow-run",
            "https://github.com/JasonTeixeira/Nexural_Automation/actions/runs/1",
            "--sbom",
            str(sbom),
            "--certificate-identity",
            "https://github.com/JasonTeixeira/Nexural_Automation/.github/workflows/release.yml@refs/heads/main",
            "--output",
            str(tmp_path / "release.json"),
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def test_release_evidence_requires_and_records_sigstore_bundles(tmp_path: Path) -> None:
    artifacts, build_a, build_b, sbom = prepare_release_tree(tmp_path)
    completed = run_generator(tmp_path, artifacts, build_a, build_b, sbom)
    assert completed.returncode == 0, completed.stderr

    evidence = json.loads((tmp_path / "release.json").read_text(encoding="utf-8"))
    schema = json.loads(
        (REPO_ROOT / "schemas" / "release-qualification.schema.json").read_text(
            encoding="utf-8"
        )
    )
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(evidence)
    assert len(evidence["sigstore"]["bundles"]) == 6


def test_release_evidence_rejects_missing_sigstore_bundle(tmp_path: Path) -> None:
    artifacts, build_a, build_b, sbom = prepare_release_tree(tmp_path)
    (artifacts / "python" / "package.whl.sigstore.json").unlink()

    completed = run_generator(tmp_path, artifacts, build_a, build_b, sbom)

    assert completed.returncode != 0
    assert "Missing Sigstore bundle" in completed.stderr
