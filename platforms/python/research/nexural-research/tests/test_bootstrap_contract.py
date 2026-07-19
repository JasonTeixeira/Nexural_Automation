from __future__ import annotations

from pathlib import Path


def test_windows_bootstrap_is_pinned_and_fail_fast() -> None:
    repo_root = Path(__file__).resolve().parents[5]
    script = (repo_root / "scripts" / "setup.ps1").read_text(encoding="utf-8")

    assert "py -3.11 -m venv" in script
    assert "SETUPTOOLS_USE_DISTUTILS" in script
    assert "function Invoke-Checked" in script
    assert "$LASTEXITCODE -ne 0" in script
    assert "python -m venv" not in script.replace("py -3.11 -m venv", "")

    for gate in (
        "pip upgrade",
        "dependency installation",
        "editable package installation",
        "ruff",
        "pytest",
        "sample report generation",
    ):
        assert f"Invoke-Checked '{gate}'" in script
