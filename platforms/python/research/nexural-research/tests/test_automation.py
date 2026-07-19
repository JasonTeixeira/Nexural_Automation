from __future__ import annotations

import importlib.util

import pandas as pd
import pytest

from nexural_research.automation import (
    CAPABILITIES,
    analyze_strategy_export,
    compare_strategy_exports,
    create_bridge_scaffold,
    create_strategy_scaffold,
    estimate_strategy_costs,
    generate_strategy_report,
    run_strategy_gauntlet_export,
)
from nexural_research.bridge_sdk import BridgeFill, BridgeSignal, CsvSignalBridge
from nexural_research.contracts import validate_bridge_contract, validate_strategy_metadata


def _write_trade_csv(path, profits: list[float]) -> None:
    base = pd.Timestamp("2025-01-02 09:30:00")
    rows = []
    for i, profit in enumerate(profits):
        rows.append(
            {
                "trade_id": f"T{i + 1}",
                "symbol": "NQ",
                "side": "BUY" if i % 2 == 0 else "SELL",
                "entry_time": base + pd.Timedelta(minutes=30 * i),
                "exit_time": base + pd.Timedelta(minutes=30 * i + 12),
                "net_pnl": profit,
                "commission": 4.50,
                "strategy": "pytest",
            }
        )
    pd.DataFrame(rows).to_csv(path, index=False)


@pytest.fixture()
def strategy_csv(tmp_path):
    path = tmp_path / "strategy_a.csv"
    profits = [120, 90, -45, 80, -35, 110, 70, -50] * 10
    _write_trade_csv(path, profits)
    return path


def test_analyze_strategy_export_returns_agent_decision(strategy_csv):
    result = analyze_strategy_export(
        strategy_csv,
        n_trials=20,
        monte_carlo_sims=50,
        walk_forward_windows=3,
    )

    assert result["source"]["platform"] == "ninjatrader"
    assert result["summary"]["n_trades"] == 80
    assert result["summary"]["net_profit"] > 0
    assert result["automation_decision"]["status"] in {
        "reject_for_live_trading",
        "watchlist",
        "promote_to_paper_trading",
    }
    assert "deflated_sharpe" in result["robustness"]
    assert result["improvement_plan"]["grade"] in {"A", "B+", "B", "C", "D", "F"}


def test_compare_strategy_exports_ranks_multiple_csvs(tmp_path, strategy_csv):
    second = tmp_path / "strategy_b.csv"
    _write_trade_csv(second, [60, -40, 75, -55, 65, -35, 80, -45] * 10)

    result = compare_strategy_exports([strategy_csv, second])

    assert result["comparison"]["n_strategies"] == 2
    assert len(result["comparison"]["rankings"]) == 2
    assert result["comparison"]["best_overall"] in {"strategy_1", "strategy_2"}


def test_generate_strategy_report_writes_html(tmp_path, strategy_csv):
    result = generate_strategy_report(strategy_csv, output_dir=tmp_path / "reports")
    report_path = tmp_path / "reports" / "strategy_a_nexural_report.html"

    assert result["report_path"] == str(report_path)
    assert report_path.exists()
    assert "Nexural" in report_path.read_text(encoding="utf-8")


def test_run_strategy_gauntlet_export_returns_institutional_checks(strategy_csv):
    result = run_strategy_gauntlet_export(
        strategy_csv,
        strategy_name="pytest",
        symbol="NQ",
        min_trades=20,
        n_trials=10,
    )

    gauntlet = result["gauntlet"]
    assert gauntlet["strategy_name"] == "pytest"
    assert len(gauntlet["checks"]) == 10
    assert gauntlet["decision"] in {"PROMOTE_TO_PAPER", "REJECT", "TUNE", "REWRITE"}
    assert {check["name"] for check in gauntlet["checks"]} >= {
        "deflated_sharpe",
        "walk_forward_validation",
        "cost_stress",
    }


def test_estimate_strategy_costs_uses_futures_cost_model():
    result = estimate_strategy_costs(symbol="NQ", trades=100, quantity=2, stress_profile="elevated")

    assert result["symbol"] == "NQ"
    assert result["stress_profile"] == "elevated"
    assert result["round_turn_cost_per_trade"] > 0
    assert result["estimated_total_cost"] == pytest.approx(
        result["round_turn_cost_per_trade"] * 100,
        abs=1.0,
    )


def test_create_strategy_scaffold_writes_sdk_files(tmp_path):
    result = create_strategy_scaffold(
        name="Opening Range Failure",
        platform="python",
        output_dir=tmp_path,
    )
    root = tmp_path / "opening_range_failure"

    assert result["strategy"] == "opening_range_failure"
    assert root.exists()
    assert (root / "metadata.yaml").exists()
    assert (root / "src" / "opening_range_failure.py").exists()


def test_create_bridge_scaffold_writes_contract(tmp_path):
    result = create_bridge_scaffold(name="NinjaTrader CSV", output_dir=tmp_path)
    root = tmp_path / "ninjatrader_csv"

    assert result["bridge"] == "ninjatrader_csv"
    assert root.exists()
    assert (root / "bridge_contract.json").exists()
    assert (root / "bridge.py").exists()


def test_csv_bridge_lifecycle_writes_paper_safe_records(tmp_path):
    bridge = CsvSignalBridge(tmp_path / "signals.jsonl")

    signal_ack = bridge.send_signal(
        BridgeSignal(
            strategy_name="pytest_strategy",
            symbol="NQ",
            side="BUY",
            quantity=1,
            timestamp="2026-01-01T14:30:00Z",
            metadata={"mode": "paper"},
        )
    )
    flatten_ack = bridge.flatten("NQ", "test_complete")
    kill_ack = bridge.kill_switch("operator_test")
    reconcile_ack = bridge.reconcile_fills(
        [
            BridgeFill(
                symbol="NQ",
                side="BUY",
                quantity=1,
                price=18000.25,
                timestamp="2026-01-01T14:31:00Z",
                external_id="fill-001",
            )
        ]
    )

    assert signal_ack.accepted is True
    assert flatten_ack.accepted is True
    assert kill_ack.accepted is True
    assert reconcile_ack.accepted is True
    records = (tmp_path / "signals.jsonl").read_text(encoding="utf-8")
    assert '"type": "signal"' in records
    assert '"control": "kill_switch"' in records
    assert '"type": "fill_reconciliation"' in records


def test_strategy_metadata_contract_validates(tmp_path):
    create_strategy_scaffold(name="Opening Range Failure", platform="python", output_dir=tmp_path)
    report = validate_strategy_metadata(tmp_path / "opening_range_failure" / "metadata.yaml")

    assert report["valid"] is True
    assert report["errors"] == []


def test_bridge_contract_validates(tmp_path):
    create_bridge_scaffold(name="NinjaTrader CSV", output_dir=tmp_path)
    report = validate_bridge_contract(tmp_path / "ninjatrader_csv" / "bridge_contract.json")

    assert report["valid"] is True
    assert report["errors"] == []


def test_capabilities_are_mcp_catalog_ready():
    assert "supported_imports" in CAPABILITIES
    assert "deflated_sharpe_overfitting_check" in CAPABILITIES["automation_workflows"]
    assert "institutional_gauntlet" in CAPABILITIES["automation_workflows"]


@pytest.mark.skipif(importlib.util.find_spec("mcp") is None, reason="MCP SDK not installed")
def test_mcp_server_factory_loads_when_sdk_available():
    from nexural_research.mcp_server import create_mcp_server

    server = create_mcp_server()
    assert server is not None
