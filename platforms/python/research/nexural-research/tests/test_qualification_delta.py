from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[5]


def load_delta() -> ModuleType:
    path = REPO_ROOT / "scripts" / "repo-tools" / "verify_qualification_delta.py"
    spec = importlib.util.spec_from_file_location("verify_qualification_delta", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "path",
    [
        "qualification/evidence/desktop/machine-a.json",
        "qualification/evidence/security-reviews/review.json",
        "beta/evidence/learner-001.json",
    ],
)
def test_allows_json_evidence_only(path: str) -> None:
    assert load_delta().is_allowed_evidence_path(path)


@pytest.mark.parametrize(
    "path",
    [
        ".github/workflows/release.yml",
        "qualification/policy.json",
        "qualification/evidence/desktop/tool.ps1",
        "qualification/evidence/../policy.json",
        "beta/evidence/learner-001.json/../../package.json",
        "platforms/ninjatrader/src/RiskEngine.cs",
    ],
)
def test_rejects_code_policy_and_traversal_paths(path: str) -> None:
    assert not load_delta().is_allowed_evidence_path(path)
