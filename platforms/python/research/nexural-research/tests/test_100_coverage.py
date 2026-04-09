"""Targeted tests to reach 100% coverage — covers every uncovered line."""

import io
import os
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app


@pytest.fixture(scope="module")
def client():
    c = TestClient(app)
    # Create a session for all tests
    csv = "trade_id,symbol,side,entry_time,exit_time,net_pnl,commission,strategy\n" + "\n".join(
        f"T{i},NQ,BUY,2025-01-{1+i//10:02d} {9+i%8}:30,2025-01-{1+i//10:02d} {9+i%8}:45,{(-1)**i*(50+i*3):.2f},4.50,CovStrat"
        for i in range(100)
    )
    c.post("/api/upload?session_id=cov_test", files={"file": ("cov.csv", io.BytesIO(csv.encode()), "text/csv")})
    return c


# ===================================================================
# ai_analyst.py — external API calls (mock them)
# ===================================================================

class TestAIAnalystMocked:
    def test_ai_analyst_imports(self):
        """Verify all AI analyst functions are importable."""
        from nexural_research.api.ai_analyst import query_anthropic, query_openai, query_perplexity, build_strategy_context, SYSTEM_PROMPT
        assert callable(query_anthropic)
        assert callable(query_openai)
        assert callable(query_perplexity)
        assert callable(build_strategy_context)
        assert len(SYSTEM_PROMPT) > 50

    def test_build_context(self):
        from nexural_research.api.ai_analyst import build_strategy_context
        df = pd.DataFrame({
            "profit": [100, -50, 200, -30, 150],
            "entry_time": pd.date_range("2025-01-01", periods=5, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=5, freq="h"),
            "instrument": "NQ", "strategy": "Test",
        })
        context = build_strategy_context(df)
        assert "Sharpe" in context
        assert "Kelly" in context
        assert len(context) > 200

    def test_system_prompt_exists(self):
        from nexural_research.api.ai_analyst import SYSTEM_PROMPT
        assert "quant" in SYSTEM_PROMPT.lower() or "analyst" in SYSTEM_PROMPT.lower()


# ===================================================================
# auth.py — all code paths
# ===================================================================

class TestAuthAllPaths:
    def test_hash_key(self):
        from nexural_research.api.auth import _hash_key
        h = _hash_key("test_key_123")
        assert len(h) == 64  # SHA256 hex

    def test_extract_key_bearer(self):
        from nexural_research.api.auth import _extract_key
        assert _extract_key("Bearer my_key", None) == "my_key"

    def test_extract_key_raw_header(self):
        from nexural_research.api.auth import _extract_key
        assert _extract_key("raw_key", None) == "raw_key"

    def test_extract_key_query(self):
        from nexural_research.api.auth import _extract_key
        assert _extract_key(None, "query_key") == "query_key"

    def test_extract_key_none(self):
        from nexural_research.api.auth import _extract_key
        assert _extract_key(None, None) is None

    def test_auth_context_fields(self):
        from nexural_research.api.auth import AuthContext
        ctx = AuthContext(authenticated=True, key_hash="abc", tier="pro")
        assert ctx.authenticated
        assert ctx.tier == "pro"

    def test_is_auth_enabled(self):
        from nexural_research.api.auth import is_auth_enabled
        assert isinstance(is_auth_enabled(), bool)


# ===================================================================
# nt_optimization_csv.py — optimization CSV parser
# ===================================================================

class TestOptimizationCSV:
    def test_parse_optimization_csv(self):
        from nexural_research.ingest.nt_optimization_csv import load_nt_optimization_csv
        csv_content = "Strategy,Instrument,Total net profit,Profit factor,Max. drawdown,Sharpe ratio,# Trades\nMyStrat,NQ,5000,2.5,-1000,1.5,50\nMyStrat,NQ,3000,1.8,-1500,1.2,40\n"
        tmp = Path(tempfile.gettempdir()) / "opt_test.csv"
        tmp.write_text(csv_content, encoding="utf-8")
        try:
            df = load_nt_optimization_csv(str(tmp))
            assert len(df) == 2
        finally:
            tmp.unlink(missing_ok=True)


# ===================================================================
# routers/charts.py — rolling metrics and drawdowns
# ===================================================================

class TestChartsRollingAndDrawdowns:
    def test_rolling_metrics(self, client):
        r = client.get("/api/charts/rolling-metrics?session_id=cov_test&window=10")
        assert r.status_code == 200
        d = r.json()
        assert d["n_points"] == 90  # 100 - 10

    def test_drawdowns(self, client):
        r = client.get("/api/charts/drawdowns?session_id=cov_test")
        assert r.status_code == 200
        d = r.json()
        assert "periods" in d
        assert isinstance(d["n_drawdowns"], int)


# ===================================================================
# routers/health.py — deep health branches
# ===================================================================

class TestDeepHealth:
    def test_deep_health_all_checks(self, client):
        r = client.get("/api/health/deep")
        assert r.status_code == 200
        d = r.json()
        assert "runtime" in d["checks"]
        assert d["checks"]["runtime"]["status"] == "ok"
        assert "disk" in d["checks"]
        assert "cache" in d["checks"]


# ===================================================================
# sessions.py — edge cases
# ===================================================================

class TestSessionEdgeCases:
    def test_get_trades_wrong_kind(self, client):
        # Upload an executions-type CSV
        csv = "fill_price,type,action,instrument,time\n100.5,Market,Buy,NQ,2025-01-01 09:30\n"
        client.post("/api/upload?session_id=exec_cov", files={"file": ("exec.csv", io.BytesIO(csv.encode()), "text/csv")})
        r = client.get("/api/analysis/metrics?session_id=exec_cov")
        assert r.status_code == 400  # wrong kind

    def test_cleanup_expired(self):
        from nexural_research.api.sessions import cleanup_expired_sessions
        count = cleanup_expired_sessions()
        assert isinstance(count, int)

    def test_db_write_on_persist(self):
        from nexural_research.api.sessions import _write_session_to_db
        # Should not raise even if DB isn't fully set up
        _write_session_to_db("test_db_write", "trades", "test.csv", 10, ["profit", "entry_time"])


# ===================================================================
# cache.py — invalidation
# ===================================================================

class TestCacheInvalidation:
    def test_invalidate_session(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10)
        c.put("k1", {"_session_id": "s1", "data": 1})
        c.put("k2", {"_session_id": "s2", "data": 2})
        removed = c.invalidate_session("s1")
        assert removed == 1
        hit, _ = c.get("k1")
        assert hit is False
        hit, _ = c.get("k2")
        assert hit is True


# ===================================================================
# equity.py — edge cases
# ===================================================================

class TestEquityEdgeCases:
    def test_missing_profit_column(self):
        from nexural_research.analyze.equity import equity_curve_from_trades
        df = pd.DataFrame({"entry_time": ["2025-01-01"], "exit_time": ["2025-01-01"]})
        with pytest.raises(ValueError, match="profit"):
            equity_curve_from_trades(df)

    def test_missing_time_column(self):
        from nexural_research.analyze.equity import equity_curve_from_trades
        df = pd.DataFrame({"profit": [100]})
        with pytest.raises(ValueError):
            equity_curve_from_trades(df)


# ===================================================================
# metrics.py — edge cases
# ===================================================================

class TestMetricsEdgeCases:
    def test_missing_profit_column(self):
        from nexural_research.analyze.metrics import metrics_from_trades
        df = pd.DataFrame({"entry_time": ["2025-01-01"]})
        with pytest.raises(ValueError, match="profit"):
            metrics_from_trades(df)

    def test_metrics_by_missing_column(self):
        from nexural_research.analyze.metrics import metrics_by
        df = pd.DataFrame({"profit": [100], "entry_time": pd.Timestamp("2025-01-01"), "exit_time": pd.Timestamp("2025-01-01 00:15")})
        with pytest.raises(ValueError, match="missing column"):
            metrics_by(df, "nonexistent_column")


# ===================================================================
# advanced_analytics.py — edge cases for Hurst, ACF, etc.
# ===================================================================

class TestAdvancedAnalyticsEdges:
    def test_hurst_zero_variance_chunks(self):
        from nexural_research.analyze.advanced_analytics import hurst_exponent
        # All same values — zero std in chunks
        df = pd.DataFrame({
            "profit": [50.0] * 100,
            "entry_time": pd.date_range("2025-01-01", periods=100, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=100, freq="h"),
        })
        result = hurst_exponent(df)
        assert 0 <= result.hurst_exponent <= 1

    def test_acf_exact_20_trades(self):
        from nexural_research.analyze.advanced_analytics import autocorrelation_analysis
        df = pd.DataFrame({
            "profit": list(range(1, 26)),
            "entry_time": pd.date_range("2025-01-01", periods=25, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=25, freq="h"),
        })
        result = autocorrelation_analysis(df, max_lag=20)
        assert len(result.lags) == 20

    def test_rolling_correlation_no_timestamps(self):
        from nexural_research.analyze.advanced_analytics import rolling_correlation_analysis
        df = pd.DataFrame({"profit": np.random.default_rng(42).normal(0, 100, 100).tolist()})
        result = rolling_correlation_analysis(df, window_size=20)
        # Should work without timestamps
        assert result.n_windows > 0

    def test_information_ratio_all_same(self):
        from nexural_research.analyze.advanced_analytics import information_ratio
        df = pd.DataFrame({
            "profit": [50.0] * 50,
            "entry_time": pd.date_range("2025-01-01", periods=50, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=50, freq="h"),
        })
        result = information_ratio(df)
        assert result.information_ratio == 0.0  # no variance = zero IR


# ===================================================================
# advanced_metrics.py — untested branches
# ===================================================================

class TestAdvancedMetricsEdges:
    def test_annualize_no_timestamps(self):
        from nexural_research.analyze.advanced_metrics import _annualize_factor
        df = pd.DataFrame({"profit": [100]})
        factor = _annualize_factor(df)
        assert factor == 252.0  # default

    def test_risk_return_two_trades(self):
        from nexural_research.analyze.advanced_metrics import risk_return_metrics
        df = pd.DataFrame({
            "profit": [100, -50],
            "entry_time": pd.date_range("2025-01-01", periods=2, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=2, freq="h"),
        })
        rr = risk_return_metrics(df)
        assert rr.sharpe_ratio != 0  # should compute something

    def test_dependency_with_10_trades(self):
        from nexural_research.analyze.advanced_metrics import trade_dependency_analysis
        df = pd.DataFrame({
            "profit": [100, -50, 100, -50, 100, -50, 100, -50, 100, -50],
            "entry_time": pd.date_range("2025-01-01", periods=10, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=10, freq="h"),
        })
        dep = trade_dependency_analysis(df)
        assert dep.z_score != 0 or dep.z_interpretation != ""


# ===================================================================
# routers/upload.py — parse from bytes
# ===================================================================

class TestUploadParsing:
    def test_upload_with_session_id(self, client):
        csv = "trade_id,symbol,entry_time,exit_time,net_pnl\n1,NQ,2025-01-01 09:30,2025-01-01 09:45,100\n"
        r = client.post(
            "/api/upload?session_id=parse_test_123",
            files={"file": ("t.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        assert r.status_code == 200
        assert r.json()["session_id"] == "parse_test_123"

    def test_upload_detects_kind(self, client):
        csv = "trade_id,symbol,entry_time,exit_time,net_pnl\n1,NQ,2025-01-01 09:30,2025-01-01 09:45,100\n"
        r = client.post(
            "/api/upload?session_id=kind_test",
            files={"file": ("t.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        assert r.json()["kind"] == "trades"


# ===================================================================
# export/excel.py — already tested but verify sheets
# ===================================================================

class TestExcelSheets:
    def test_excel_has_all_sheets(self, client):
        r = client.get("/api/export/excel?session_id=cov_test")
        assert r.status_code == 200
        wb = pd.ExcelFile(io.BytesIO(r.content))
        assert "Summary" in wb.sheet_names
        assert "Trades" in wb.sheet_names
        assert "All Metrics" in wb.sheet_names


# ===================================================================
# heatmap.py — edge cases
# ===================================================================

class TestHeatmapEdges:
    def test_heatmap_with_mean_agg(self, client):
        r = client.get("/api/charts/heatmap?session_id=cov_test&agg=mean")
        assert r.status_code == 200

    def test_heatmap_with_count_agg(self, client):
        r = client.get("/api/charts/heatmap?session_id=cov_test&agg=count")
        assert r.status_code == 200


# ===================================================================
# robustness.py — edge cases
# ===================================================================

class TestRobustnessEdges:
    def test_walk_forward_no_exit_time(self):
        from nexural_research.analyze.robustness import walk_forward_split
        df = pd.DataFrame({
            "profit": [100, -50, 200, -30, 150],
            "entry_time": pd.date_range("2025-01-01", periods=5, freq="h"),
        })
        result = walk_forward_split(df, split=0.7, ts_col="entry_time")
        assert result.in_sample_n + result.out_sample_n == 5

    def test_mc_empty_data(self):
        from nexural_research.analyze.robustness import monte_carlo_max_drawdown
        df = pd.DataFrame({"profit": []})
        result = monte_carlo_max_drawdown(df)
        assert result.n == 0


# ===================================================================
# portfolio.py — single strategy and no timestamps
# ===================================================================

class TestPortfolioEdges:
    def test_single_strategy_portfolio(self):
        from nexural_research.analyze.portfolio import portfolio_analysis
        df = pd.DataFrame({
            "profit": [100, -50, 200],
            "entry_time": pd.date_range("2025-01-01", periods=3, freq="h"),
            "exit_time": pd.date_range("2025-01-01 00:15", periods=3, freq="h"),
            "strategy": "OnlyOne",
        })
        result = portfolio_analysis(df)
        assert result.n_strategies == 1

    def test_portfolio_no_timestamps(self):
        from nexural_research.analyze.portfolio import portfolio_analysis
        df = pd.DataFrame({
            "profit": [100, -50, 200, -30, 150, -20],
            "strategy": ["A", "A", "A", "B", "B", "B"],
        })
        result = portfolio_analysis(df)
        assert result.n_strategies == 2


# ===================================================================
# nt_csv.py — save_processed
# ===================================================================

class TestNTCSVEdges:
    def test_save_processed_csv(self):
        from nexural_research.ingest.nt_csv import save_processed
        df = pd.DataFrame({"profit": [100, -50]})
        tmp = Path(tempfile.gettempdir()) / "save_test.csv"
        path = save_processed(df, str(tmp))
        assert path.exists()
        tmp.unlink(missing_ok=True)

    def test_save_processed_parquet(self):
        from nexural_research.ingest.nt_csv import save_processed
        df = pd.DataFrame({"profit": [100, -50]})
        tmp = Path(tempfile.gettempdir()) / "save_test.parquet"
        path = save_processed(df, str(tmp))
        assert path.exists()
        tmp.unlink(missing_ok=True)

    def test_save_processed_bad_format(self):
        from nexural_research.ingest.nt_csv import save_processed
        df = pd.DataFrame({"profit": [100]})
        with pytest.raises(ValueError, match="Unsupported"):
            save_processed(df, "/tmp/test.xyz")


# ===================================================================
# report/html.py — edge cases
# ===================================================================

class TestHTMLReport:
    def test_html_report_content(self, client):
        r = client.get("/api/report/html?session_id=cov_test")
        assert r.status_code == 200
        assert "<html" in r.text.lower() or "nexural" in r.text.lower()

    def test_html_report_custom_title(self, client):
        r = client.get("/api/report/html?session_id=cov_test&title=Coverage%20Test")
        assert r.status_code == 200


# ===================================================================
# comparison.py — edge cases
# ===================================================================

class TestComparisonEdges:
    def test_three_strategies(self):
        from nexural_research.analyze.comparison import compare_strategies
        df_a = pd.DataFrame({"profit": [100, -30] * 10, "entry_time": pd.date_range("2025-01-01", periods=20, freq="h"), "exit_time": pd.date_range("2025-01-01 00:15", periods=20, freq="h"), "instrument": "NQ", "strategy": "A"})
        df_b = pd.DataFrame({"profit": [50, -20] * 10, "entry_time": pd.date_range("2025-01-01", periods=20, freq="h"), "exit_time": pd.date_range("2025-01-01 00:15", periods=20, freq="h"), "instrument": "NQ", "strategy": "B"})
        df_c = pd.DataFrame({"profit": [-10, 5] * 10, "entry_time": pd.date_range("2025-01-01", periods=20, freq="h"), "exit_time": pd.date_range("2025-01-01 00:15", periods=20, freq="h"), "instrument": "NQ", "strategy": "C"})
        result = compare_strategies([("a", "a.csv", df_a), ("b", "b.csv", df_b), ("c", "c.csv", df_c)])
        assert result.n_strategies == 3
        assert result.rankings[0].overall_rank == 1
        assert result.rankings[2].overall_rank == 3
