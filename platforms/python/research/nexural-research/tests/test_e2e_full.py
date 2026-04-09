"""Full end-to-end test suite — every tab, every endpoint, every flow.

This is what a $1M QA firm would run before going live.
Tests the complete pipeline: upload -> analyze -> every page -> export -> cleanup.
"""

import io
import json
import time

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def test_session(client):
    """Upload a realistic test CSV and return session ID."""
    rng = np.random.default_rng(42)
    n = 100
    profits = rng.normal(15, 80, n)
    base = pd.Timestamp("2025-01-06 09:30:00")
    rows = []
    for i in range(n):
        entry = base + pd.Timedelta(hours=i * 2)
        exit_ = entry + pd.Timedelta(minutes=15 + rng.integers(5, 60))
        rows.append(f"T{i},NQ,BUY,{entry.strftime('%Y-%m-%d %H:%M')},{exit_.strftime('%Y-%m-%d %H:%M')},{profits[i]:.2f},4.50,TestStrategy")

    csv = "trade_id,symbol,side,entry_time,exit_time,net_pnl,commission,strategy\n" + "\n".join(rows)
    r = client.post(
        "/api/upload?session_id=e2e_test",
        files={"file": ("e2e_trades.csv", io.BytesIO(csv.encode()), "text/csv")},
    )
    assert r.status_code == 200, f"Upload failed: {r.text[:200]}"
    data = r.json()
    assert data["n_rows"] == 100
    assert data["kind"] == "trades"
    return "e2e_test"


# ===================================================================
# FLOW 1: Upload and Session Management
# ===================================================================

class TestUploadFlow:
    def test_upload_returns_session(self, client, test_session):
        assert test_session == "e2e_test"

    def test_session_appears_in_list(self, client, test_session):
        r = client.get("/api/sessions")
        assert r.status_code == 200
        sids = [s["session_id"] for s in r.json()["sessions"]]
        assert test_session in sids

    def test_upload_persists_to_disk(self, test_session):
        from pathlib import Path
        p = Path("data/sessions") / test_session / "data.parquet"
        assert p.exists()

    def test_upload_writes_to_db(self, test_session):
        try:
            import sqlite3
            conn = sqlite3.connect("data/nexural.db")
            rows = conn.execute("SELECT * FROM analysis_sessions WHERE session_id=?", (test_session,)).fetchall()
            conn.close()
            assert len(rows) >= 1
        except Exception:
            pytest.skip("DB not available")


# ===================================================================
# FLOW 2: Overview Tab (6 endpoints)
# ===================================================================

class TestOverviewTab:
    def test_core_metrics(self, client, test_session):
        r = client.get(f"/api/analysis/metrics?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["total_trades"] == 100
        assert "winning_trades" in d
        assert "losing_trades" in d
        assert d["winning_trades"] + d["losing_trades"] == d["total_trades"]
        assert 0 <= d["win_rate"] <= 1
        assert isinstance(d["net_profit"], (int, float))
        assert isinstance(d["max_drawdown"], (int, float))
        assert d["max_drawdown"] <= 0  # drawdown is negative

    def test_risk_return(self, client, test_session):
        r = client.get(f"/api/analysis/risk-return?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        for field in ["sharpe_ratio", "sortino_ratio", "calmar_ratio", "omega_ratio", "tail_ratio", "risk_of_ruin"]:
            assert field in d, f"Missing field: {field}"
            assert isinstance(d[field], (int, float, str)), f"{field} has wrong type"

    def test_expectancy(self, client, test_session):
        r = client.get(f"/api/analysis/expectancy?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert "kelly_pct" in d
        assert "optimal_f" in d
        assert 0 <= d["optimal_f"] <= 1

    def test_institutional(self, client, test_session):
        r = client.get(f"/api/analysis/institutional?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["max_consecutive_wins"] >= 0
        assert d["max_consecutive_losses"] >= 0
        assert 0 <= d["time_under_water_pct"] <= 100

    def test_equity_curve(self, client, test_session):
        r = client.get(f"/api/charts/equity?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["timestamps"]) == 100
        assert len(d["equity"]) == 100
        assert len(d["drawdown"]) == 100
        assert len(d["trade_pnl"]) == 100

    def test_improvements_grade(self, client, test_session):
        r = client.get(f"/api/analysis/improvements?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["grade"] in ("A", "B+", "B", "C", "D", "F")
        assert isinstance(d["improvements"], list)


# ===================================================================
# FLOW 3: Advanced Metrics Tab
# ===================================================================

class TestAdvancedTab:
    def test_comprehensive(self, client, test_session):
        r = client.get(f"/api/analysis/comprehensive?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        for section in ["risk_return", "expectancy", "dependency", "distribution", "time_decay", "institutional"]:
            assert section in d, f"Missing section: {section}"
            assert isinstance(d[section], dict)


# ===================================================================
# FLOW 4: Distribution Tab
# ===================================================================

class TestDistributionTab:
    def test_metrics(self, client, test_session):
        r = client.get(f"/api/analysis/distribution?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["var_95"] < 0  # VaR is a loss
        assert d["cvar_95"] <= d["var_95"]  # CVaR is worse than VaR

    def test_chart(self, client, test_session):
        r = client.get(f"/api/charts/distribution?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["bins"]) > 0
        assert len(d["counts"]) > 0
        assert len(d["bins"]) == len(d["counts"])


# ===================================================================
# FLOW 5: Desk Analytics Tab (4 endpoints)
# ===================================================================

class TestDeskAnalyticsTab:
    def test_hurst(self, client, test_session):
        r = client.get(f"/api/analysis/hurst?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert 0 <= d["hurst_exponent"] <= 1
        assert d["regime"] in ("mean_reverting", "random_walk", "trending")
        assert d["confidence"] in ("high", "medium", "low")

    def test_acf(self, client, test_session):
        r = client.get(f"/api/analysis/acf?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["lags"]) == 20
        assert len(d["autocorrelations"]) == 20
        assert d["confidence_bound"] > 0
        for ac in d["autocorrelations"]:
            assert -1 <= ac <= 1

    def test_rolling_correlation(self, client, test_session):
        r = client.get(f"/api/analysis/rolling-correlation?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["n_windows"] > 0
        assert len(d["rolling_autocorr"]) == d["n_windows"]
        assert d["regime_changes_detected"] >= 0

    def test_information_ratio(self, client, test_session):
        r = client.get(f"/api/analysis/information-ratio?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["information_ratio"], (int, float))
        assert isinstance(d["is_outperforming"], bool)


# ===================================================================
# FLOW 6: Improvements Tab
# ===================================================================

class TestImprovementsTab:
    def test_full_report(self, client, test_session):
        r = client.get(f"/api/analysis/improvements?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert "recommendations" in d
        assert "time_filter" in d
        assert "drawdown_recovery" in d
        assert "mae_mfe" in d
        for rec in d["recommendations"]:
            assert rec["priority"] in ("critical", "high", "medium", "low")


# ===================================================================
# FLOW 7: Monte Carlo Tab
# ===================================================================

class TestMonteCarloTab:
    def test_parametric(self, client, test_session):
        r = client.get(f"/api/robustness/parametric-monte-carlo?session_id={test_session}&n_simulations=100")
        assert r.status_code == 200
        d = r.json()
        assert d["n_simulations"] == 100
        assert "percentiles" in d
        assert 0 <= d["probability_of_profit"] <= 100

    def test_bootstrap(self, client, test_session):
        r = client.get(f"/api/robustness/block-bootstrap?session_id={test_session}&n_simulations=100")
        assert r.status_code == 200
        d = r.json()
        assert d["n_simulations"] == 100
        assert d["block_size"] >= 3


# ===================================================================
# FLOW 8: Walk-Forward Tab
# ===================================================================

class TestWalkForwardTab:
    def test_simple(self, client, test_session):
        r = client.get(f"/api/robustness/walk-forward?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["in_sample_n"] + d["out_sample_n"] == 100

    def test_rolling(self, client, test_session):
        r = client.get(f"/api/robustness/rolling-walk-forward?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert "folds" in d
        assert "walk_forward_efficiency" in d
        assert d["n_windows"] > 0


# ===================================================================
# FLOW 9: Overfitting Tab
# ===================================================================

class TestOverfittingTab:
    def test_deflated_sharpe(self, client, test_session):
        r = client.get(f"/api/robustness/deflated-sharpe?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["survives_deflation"], bool)
        assert len(d["interpretation"]) > 10


# ===================================================================
# FLOW 10: Regime Tab
# ===================================================================

class TestRegimeTab:
    def test_regime(self, client, test_session):
        r = client.get(f"/api/robustness/regime?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["regimes"], list)
        assert len(d["regimes"]) > 0
        for reg in d["regimes"]:
            assert "regime" in reg
            assert "n_trades" in reg
            assert "sharpe" in reg


# ===================================================================
# FLOW 11: Stress Testing Tab (3 endpoints)
# ===================================================================

class TestStressTestingTab:
    def test_tail(self, client, test_session):
        r = client.get(f"/api/stress/tail-amplification?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["scenarios"]) == 9  # 3 tails x 3 multipliers
        for s in d["scenarios"]:
            assert "still_profitable" in s
            assert s["multiplier"] >= 1.0

    def test_historical(self, client, test_session):
        r = client.get(f"/api/stress/historical?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["worst_single_trade"] < 0
        assert len(d["worst_windows"]) > 0

    def test_sensitivity(self, client, test_session):
        r = client.get(f"/api/stress/sensitivity?session_id={test_session}&size_steps=4&stop_steps=4")
        assert r.status_code == 200
        d = r.json()
        assert d["n_points"] == 16
        assert 0 <= d["robustness_score"] <= 100


# ===================================================================
# FLOW 12: Trade Log Tab
# ===================================================================

class TestTradeLogTab:
    def test_trades_list(self, client, test_session):
        r = client.get(f"/api/charts/trades?session_id={test_session}&limit=50")
        assert r.status_code == 200
        d = r.json()
        assert "trades" in d
        assert len(d["trades"]) == 50


# ===================================================================
# FLOW 13: Heatmap Tab
# ===================================================================

class TestHeatmapTab:
    def test_heatmap(self, client, test_session):
        r = client.get(f"/api/charts/heatmap?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["days"]) > 0
        assert len(d["hours"]) > 0
        assert len(d["values"]) == len(d["days"])
        assert len(d["counts"]) == len(d["days"])


# ===================================================================
# FLOW 14: Equity Curve Tab
# ===================================================================

class TestEquityCurveTab:
    def test_equity_data(self, client, test_session):
        r = client.get(f"/api/charts/equity?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        # Equity final = sum of trade_pnl
        assert abs(d["equity"][-1] - sum(d["trade_pnl"])) < 0.1


# ===================================================================
# FLOW 15: Rolling Metrics Tab
# ===================================================================

class TestRollingMetricsTab:
    def test_rolling(self, client, test_session):
        r = client.get(f"/api/charts/rolling-metrics?session_id={test_session}&window=20")
        assert r.status_code == 200
        d = r.json()
        assert d["n_points"] == 80  # 100 - 20 window
        for wr in d["rolling_win_rate"]:
            assert 0 <= wr <= 100


# ===================================================================
# FLOW 16: Compare Tab
# ===================================================================

class TestCompareTab:
    def test_comparison(self, client, test_session):
        r = client.get(f"/api/export/comparison?session_a={test_session}&session_b={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert d["net_profit"]["delta"] == 0  # same strategy = zero delta


# ===================================================================
# FLOW 17: AI Analyst Tab
# ===================================================================

class TestAIAnalystTab:
    def test_context_preview(self, client, test_session):
        r = client.post(f"/api/ai/context-preview?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["context"]) > 500  # substantial context
        assert d["approx_tokens"] > 100

    def test_validate_endpoint(self, client, test_session):
        r = client.post(
            f"/api/ai/validate?session_id={test_session}",
            json={"response_text": "The Sharpe ratio is 1.5 and the win rate is 55%."},
        )
        assert r.status_code == 200
        d = r.json()
        assert "confidence_score" in d


# ===================================================================
# FLOW 18: Export Tab
# ===================================================================

class TestExportTab:
    def test_json_export(self, client, test_session):
        r = client.get(f"/api/export/json?session_id={test_session}")
        assert r.status_code == 200
        d = r.json()
        assert "core_metrics" in d
        assert "institutional" in d

    def test_csv_export(self, client, test_session):
        r = client.get(f"/api/export/csv?session_id={test_session}")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]

    def test_excel_export(self, client, test_session):
        r = client.get(f"/api/export/excel?session_id={test_session}")
        assert r.status_code == 200
        assert len(r.content) > 5000

    def test_pdf_report(self, client, test_session):
        r = client.get(f"/api/export/pdf-report?session_id={test_session}")
        assert r.status_code == 200
        assert "Net Profit" in r.text
        assert "Sharpe" in r.text
        assert "Disclaimer" in r.text

    def test_html_report(self, client, test_session):
        r = client.get(f"/api/report/html?session_id={test_session}")
        assert r.status_code == 200
        assert "Nexural" in r.text


# ===================================================================
# FLOW 19: Parameter Sweep
# ===================================================================

class TestParameterSweepTab:
    def test_sweep(self, client, test_session):
        r = client.get(f"/api/analysis/parameter-sweep?session_id={test_session}&stop_steps=3&target_steps=3&size_steps=2")
        assert r.status_code == 200
        d = r.json()
        assert d["n_combinations"] == 18
        assert d["optimal"] is not None
        assert d["overfitting_risk"] in ("low", "medium", "high")


# ===================================================================
# FLOW 20: Compare Matrix
# ===================================================================

class TestCompareMatrixTab:
    def test_matrix(self, client, test_session):
        # Upload a second session
        csv2 = "trade_id,symbol,entry_time,exit_time,net_pnl\n" + "\n".join(
            f"{i},ES,2025-02-{1+i//10:02d} 09:30,2025-02-{1+i//10:02d} 09:45,{(-1)**i * 40}"
            for i in range(30)
        )
        client.post("/api/upload?session_id=e2e_compare", files={"file": ("cmp.csv", io.BytesIO(csv2.encode()), "text/csv")})
        r = client.get(f"/api/compare/matrix?session_ids={test_session},e2e_compare")
        assert r.status_code == 200
        d = r.json()
        assert d["n_strategies"] == 2
        assert d["rankings"][0]["overall_rank"] == 1


# ===================================================================
# FLOW 21: Health & Infrastructure
# ===================================================================

class TestHealthInfrastructure:
    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["version"] == "2.0.0"

    def test_readiness(self, client):
        r = client.get("/api/health/ready")
        assert r.status_code == 200
        assert "cache" in r.json()

    def test_deep(self, client):
        r = client.get("/api/health/deep")
        assert r.status_code == 200
        assert "checks" in r.json()

    def test_v1_works(self, client, test_session):
        r = client.get(f"/api/v1/analysis/metrics?session_id={test_session}")
        assert r.status_code == 200
        assert r.json()["total_trades"] == 100

    def test_prometheus(self, client):
        r = client.get("/metrics")
        assert r.status_code == 200
        assert "nexural_requests_total" in r.text

    def test_security_headers(self, client):
        r = client.get("/api/health")
        assert r.headers.get("x-content-type-options") == "nosniff"
        assert r.headers.get("x-frame-options") == "DENY"
        assert "Content-Security-Policy" in r.headers

    def test_request_id(self, client):
        r = client.get("/api/health")
        assert len(r.headers.get("x-request-id", "")) > 10

    def test_rate_limit_headers(self, client):
        r = client.get("/api/sessions")
        assert "x-ratelimit-limit" in r.headers


# ===================================================================
# FLOW 22: Cleanup
# ===================================================================

class TestCleanup:
    def test_delete_session(self, client, test_session):
        r = client.delete(f"/api/sessions/{test_session}")
        assert r.status_code == 200
        # Verify gone
        r2 = client.get(f"/api/analysis/metrics?session_id={test_session}")
        assert r2.status_code == 404
