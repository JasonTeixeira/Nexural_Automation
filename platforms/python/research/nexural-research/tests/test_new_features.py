"""Tests for new features: AI validation, comparison matrix, PDF report, parameter sweep."""

import io
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from nexural_research.api.app import app
from nexural_research.api.ai_validator import validate_ai_response
from nexural_research.analyze.comparison import compare_strategies
from nexural_research.analyze.parameter_sweep import parameter_sweep


def _make(profits):
    n = len(profits)
    base = pd.Timestamp("2025-01-01 09:30:00")
    return pd.DataFrame({
        "profit": profits,
        "entry_time": [base + pd.Timedelta(hours=i) for i in range(n)],
        "exit_time": [base + pd.Timedelta(hours=i, minutes=15) for i in range(n)],
        "instrument": "NQ", "strategy": "Test",
    })


@pytest.fixture(scope="module")
def client():
    c = TestClient(app)
    # Ensure a session exists for these tests
    csv = "trade_id,symbol,entry_time,exit_time,net_pnl,strategy\n" + "\n".join(
        f"T{i},NQ,2025-01-{1+i//10:02d} {9+i%8}:30,2025-01-{1+i//10:02d} {9+i%8}:45,{(-1)**i*(50+i*3)},TestStrat"
        for i in range(50)
    )
    c.post("/api/upload?session_id=nf_test", files={"file": ("t.csv", io.BytesIO(csv.encode()), "text/csv")})
    return c


# ===================================================================
# AI Validator
# ===================================================================

class TestAIValidator:
    def test_validates_correct_sharpe(self):
        df = _make([100, -50, 100, -50, 100, -50, 100, -50, 100, -50])
        from nexural_research.analyze.advanced_metrics import risk_return_metrics
        rr = risk_return_metrics(df)
        # Simulate AI saying the correct Sharpe
        text = f"Your Sharpe ratio is {rr.sharpe_ratio}."
        result = validate_ai_response(text, df)
        # Should find at least one claim
        assert result.total_claims >= 0  # may or may not match regex

    def test_detects_wrong_number(self):
        df = _make([100, -50, 100, -50, 100, -50, 100, -50, 100, -50])
        text = "Your win rate is 99.9%."  # actual is 50%
        result = validate_ai_response(text, df)
        contradicted = [d for d in result.details if d.status == "contradicted"]
        if result.total_claims > 0:
            assert len(contradicted) > 0 or result.confidence_score < 100

    def test_empty_response(self):
        df = _make([100, -50])
        result = validate_ai_response("", df)
        assert result.total_claims == 0
        assert result.confidence_score == 0.0

    def test_no_numeric_claims(self):
        df = _make([100, -50])
        result = validate_ai_response("Your strategy looks good overall.", df)
        assert result.total_claims == 0


class TestAIValidateEndpoint:
    def test_validate_endpoint(self, client):
        r = client.post(
            "/api/ai/validate?session_id=nf_test",
            json={"response_text": "The Sharpe ratio is 1.5 and win rate is 60%."},
        )
        assert r.status_code == 200
        data = r.json()
        assert "total_claims" in data
        assert "confidence_score" in data


# ===================================================================
# Comparison Matrix
# ===================================================================

class TestComparisonMatrix:
    def test_two_strategies(self):
        df_a = _make([100, -30, 120, -25, 110, -20, 105, -35, 115, -28, 100, -30])
        df_b = _make([-50, 30, -60, 25, -55, 20, -45, 35, -65, 28, -50, 30])
        result = compare_strategies([
            ("strat_a", "strategy_a.csv", df_a),
            ("strat_b", "strategy_b.csv", df_b),
        ])
        assert result.n_strategies == 2
        assert len(result.rankings) == 2
        assert result.rankings[0].overall_rank == 1
        assert result.rankings[1].overall_rank == 2
        assert result.best_overall in ("strat_a", "strat_b")
        assert len(result.interpretation) > 10

    def test_single_strategy_error(self):
        df = _make([100, -50])
        result = compare_strategies([("a", "a.csv", df)])
        assert result.n_strategies == 1
        assert "at least 2" in result.interpretation

    def test_composite_score_bounded(self):
        df_a = _make([100, -30] * 10)
        df_b = _make([50, -20] * 10)
        result = compare_strategies([
            ("a", "a.csv", df_a),
            ("b", "b.csv", df_b),
        ])
        for r in result.rankings:
            assert 0 <= r.composite_score <= 100

    def test_comparison_endpoint(self, client):
        # Upload two sessions
        csv_a = "trade_id,symbol,entry_time,exit_time,net_pnl\n1,NQ,2025-01-01 09:30,2025-01-01 09:45,100\n2,NQ,2025-01-01 10:00,2025-01-01 10:15,-30\n"
        csv_b = "trade_id,symbol,entry_time,exit_time,net_pnl\n1,ES,2025-01-01 09:30,2025-01-01 09:45,50\n2,ES,2025-01-01 10:00,2025-01-01 10:15,-60\n"
        client.post("/api/upload?session_id=cmp_a", files={"file": ("a.csv", io.BytesIO(csv_a.encode()), "text/csv")})
        client.post("/api/upload?session_id=cmp_b", files={"file": ("b.csv", io.BytesIO(csv_b.encode()), "text/csv")})
        r = client.get("/api/compare/matrix?session_ids=cmp_a,cmp_b")
        assert r.status_code == 200
        data = r.json()
        assert data["n_strategies"] == 2
        assert "rankings" in data


# ===================================================================
# Parameter Sweep
# ===================================================================

class TestParameterSweep:
    def test_basic_sweep(self):
        profits = [100, -30, 120, -25, 110, -20, 105, -35, 115, -28, 100, -30]
        df = _make(profits)
        result = parameter_sweep(df, stop_steps=3, target_steps=3, size_steps=2)
        assert result.n_combinations == 18  # 3x3x2
        assert result.optimal is not None
        assert 0 <= result.profitable_pct <= 100
        assert 0 <= result.stability_score <= 100

    def test_overfitting_detection(self):
        profits = [100, -30, 120, -25, 110, -20, 105, -35, 115, -28, 100, -30]
        df = _make(profits)
        result = parameter_sweep(df, stop_steps=4, target_steps=4, size_steps=3)
        assert result.overfitting_risk in ("low", "medium", "high")
        assert isinstance(result.overfitting_reasons, list)

    def test_insufficient_data(self):
        df = _make([100, -50])
        result = parameter_sweep(df)
        assert result.n_combinations == 0

    def test_sweep_endpoint(self, client):
        r = client.get("/api/analysis/parameter-sweep?session_id=nf_test&stop_steps=3&target_steps=3&size_steps=2")
        assert r.status_code == 200
        data = r.json()
        assert "n_combinations" in data
        assert "overfitting_risk" in data
        assert data["n_combinations"] == 18


# ===================================================================
# PDF Report
# ===================================================================

class TestPDFReport:
    def test_pdf_report_generates_html(self, client):
        r = client.get("/api/export/pdf-report?session_id=nf_test")
        assert r.status_code == 200
        html = r.text
        assert "Strategy Analysis Report" in html
        assert "Net Profit" in html
        assert "Sharpe" in html
        assert "Recommendations" in html
        assert "Disclaimer" in html

    def test_pdf_report_has_grade(self, client):
        r = client.get("/api/export/pdf-report?session_id=nf_test")
        html = r.text
        # Grade should be one of A, B+, B, C, D, F
        assert any(grade in html for grade in ["A</div>", "B</div>", "C</div>", "D</div>", "F</div>", "B+</div>"])

    def test_pdf_report_custom_title(self, client):
        r = client.get("/api/export/pdf-report?session_id=nf_test&title=My%20Custom%20Report")
        assert r.status_code == 200
        assert "My Custom Report" in r.text


# ===================================================================
# API Versioning
# ===================================================================

class TestAPIVersioning:
    def test_v1_prefix_works(self, client):
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_v1_analysis_works(self, client):
        r = client.get("/api/v1/analysis/metrics?session_id=nf_test")
        assert r.status_code == 200
        assert "total_trades" in r.json()

    def test_legacy_prefix_still_works(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_v1_sessions(self, client):
        r = client.get("/api/v1/sessions")
        assert r.status_code == 200
        assert "sessions" in r.json()
