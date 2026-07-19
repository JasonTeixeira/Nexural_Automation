from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app
from nexural_research.automation import (
    resolve_confined_input_file,
    resolve_confined_output_directory,
)


def _trade_csv(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    base = pd.Timestamp("2025-01-02 09:30:00")
    pd.DataFrame(
        [
            {
                "trade_id": f"T{index}",
                "symbol": "NQ",
                "side": "BUY",
                "entry_time": base + pd.Timedelta(minutes=index),
                "exit_time": base + pd.Timedelta(minutes=index + 1),
                "net_pnl": profit,
                "commission": 4.5,
                "strategy": "security-test",
            }
            for index, profit in enumerate([10, -5, 8, -3, 12, -4, 9, -2, 11, -1], 1)
        ]
    ).to_csv(path, index=False)
    return path


def _local_client() -> TestClient:
    return TestClient(app, client=("127.0.0.1", 51000))


def test_raw_path_http_is_disabled_by_default(tmp_path: Path, monkeypatch) -> None:
    source = _trade_csv(tmp_path / "trades.csv")
    monkeypatch.delenv("NEXURAL_LOCAL_PATH_API_ENABLED", raising=False)
    monkeypatch.delenv("NEXURAL_ALLOWED_DATA_DIRS", raising=False)

    response = _local_client().post(
        "/api/automation/analyze-csv",
        json={"csv_path": str(source), "n_trials": 5, "monte_carlo_sims": 10},
    )

    assert response.status_code == 403
    assert str(source) not in response.text


def test_local_path_http_requires_configured_roots(tmp_path: Path, monkeypatch) -> None:
    source = _trade_csv(tmp_path / "trades.csv")
    monkeypatch.setenv("NEXURAL_LOCAL_PATH_API_ENABLED", "true")
    monkeypatch.delenv("NEXURAL_ALLOWED_DATA_DIRS", raising=False)

    response = _local_client().post(
        "/api/automation/analyze-csv",
        json={"csv_path": str(source), "n_trials": 5, "monte_carlo_sims": 10},
    )

    assert response.status_code == 403
    assert str(source) not in response.text


def test_local_path_http_accepts_confined_input(tmp_path: Path, monkeypatch) -> None:
    allowed = tmp_path / "allowed"
    source = _trade_csv(allowed / "trades.csv")
    monkeypatch.setenv("NEXURAL_LOCAL_PATH_API_ENABLED", "true")
    monkeypatch.setenv("NEXURAL_ALLOWED_DATA_DIRS", str(allowed))

    response = _local_client().post(
        "/api/automation/analyze-csv",
        json={
            "csv_path": str(source),
            "n_trials": 5,
            "monte_carlo_sims": 10,
            "walk_forward_windows": 2,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["source"]["filename"] == "trades.csv"


@pytest.mark.parametrize(
    "unsafe_path",
    [
        r"\\server\share\trades.csv",
        "//server/share/trades.csv",
        r"C:\safe\trades.csv:secret",
        r"\\?\C:\safe\trades.csv",
    ],
)
def test_confinement_rejects_unc_devices_and_ads(
    tmp_path: Path, monkeypatch, unsafe_path: str
) -> None:
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    monkeypatch.setenv("NEXURAL_ALLOWED_DATA_DIRS", str(allowed))

    with pytest.raises(PermissionError, match="unsafe path syntax"):
        resolve_confined_input_file(unsafe_path, require_configured_roots=True)


def test_confinement_rejects_traversal_and_symlink_escape(tmp_path: Path, monkeypatch) -> None:
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    outside = _trade_csv(tmp_path / "outside.csv")
    monkeypatch.setenv("NEXURAL_ALLOWED_DATA_DIRS", str(allowed))

    with pytest.raises(PermissionError, match="unsafe path syntax"):
        resolve_confined_input_file(allowed / ".." / "outside.csv", require_configured_roots=True)

    link = allowed / "linked.csv"
    try:
        os.symlink(outside, link)
    except OSError:
        pytest.skip("Symlink creation is unavailable on this runner")
    with pytest.raises(PermissionError, match="outside configured roots"):
        resolve_confined_input_file(link, require_configured_roots=True)


def test_report_http_requires_confined_output_root(tmp_path: Path, monkeypatch) -> None:
    allowed = tmp_path / "allowed"
    reports = tmp_path / "reports"
    source = _trade_csv(allowed / "trades.csv")
    reports.mkdir()
    monkeypatch.setenv("NEXURAL_LOCAL_PATH_API_ENABLED", "true")
    monkeypatch.setenv("NEXURAL_ALLOWED_DATA_DIRS", str(allowed))
    monkeypatch.setenv("NEXURAL_ALLOWED_REPORT_DIRS", str(reports))

    denied = _local_client().post(
        "/api/automation/report-csv",
        json={"csv_path": str(source), "output_dir": str(tmp_path / "elsewhere")},
    )
    accepted = _local_client().post(
        "/api/automation/report-csv",
        json={"csv_path": str(source), "output_dir": str(reports / "daily")},
    )

    assert denied.status_code == 403
    assert accepted.status_code == 200, accepted.text
    assert Path(accepted.json()["report_path"]).is_relative_to(reports)


def test_report_confinement_rejects_symlink_escape(tmp_path: Path, monkeypatch) -> None:
    reports = tmp_path / "reports"
    outside = tmp_path / "outside"
    reports.mkdir()
    outside.mkdir()
    monkeypatch.setenv("NEXURAL_ALLOWED_REPORT_DIRS", str(reports))

    link = reports / "linked"
    try:
        os.symlink(outside, link, target_is_directory=True)
    except OSError:
        pytest.skip("Symlink creation is unavailable on this runner")

    with pytest.raises(PermissionError, match="outside configured roots"):
        resolve_confined_output_directory(link, require_configured_roots=True)


def test_local_path_http_cannot_be_enabled_for_remote_clients(tmp_path: Path, monkeypatch) -> None:
    allowed = tmp_path / "allowed"
    source = _trade_csv(allowed / "trades.csv")
    monkeypatch.setenv("NEXURAL_LOCAL_PATH_API_ENABLED", "true")
    monkeypatch.setenv("NEXURAL_ALLOWED_DATA_DIRS", str(allowed))

    remote = TestClient(app, client=("203.0.113.9", 51000))
    response = remote.post(
        "/api/automation/analyze-csv",
        json={"csv_path": str(source), "n_trials": 5, "monte_carlo_sims": 10},
    )

    assert response.status_code == 403
