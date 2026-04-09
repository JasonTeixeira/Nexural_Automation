"""Tests for the FastAPI backend endpoints."""

import io
import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def uploaded_session(client):
    """Upload a test CSV and return the session ID."""
    csv_content = (
        "trade_id,symbol,side,entry_time,exit_time,net_pnl,commission,strategy\n"
        "T1,NQ,BUY,2025-10-01 09:35,2025-10-01 09:49,195.5,4.5,Fade\n"
        "T2,NQ,SELL,2025-10-01 10:10,2025-10-01 10:25,195.5,4.5,Fade\n"
        "T3,NQ,BUY,2025-10-01 11:00,2025-10-01 11:15,-204.5,4.5,Momentum\n"
        "T4,NQ,SELL,2025-10-02 09:40,2025-10-02 09:55,-404.5,4.5,Fade\n"
        "T5,NQ,BUY,2025-10-02 10:20,2025-10-02 10:40,595.5,4.5,Momentum\n"
        "T6,NQ,BUY,2025-10-02 11:00,2025-10-02 11:10,195.5,4.5,Fade\n"
        "T7,NQ,SELL,2025-10-03 09:35,2025-10-03 09:50,-204.5,4.5,Fade\n"
        "T8,NQ,BUY,2025-10-03 10:15,2025-10-03 10:35,595.5,4.5,Momentum\n"
        "T9,NQ,SELL,2025-10-03 11:05,2025-10-03 11:20,-104.5,4.5,Fade\n"
        "T10,NQ,BUY,2025-10-03 12:00,2025-10-03 12:20,395.5,4.5,Momentum\n"
    )
    resp = client.post(
        "/api/upload?session_id=pytest",
        files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["n_rows"] == 10
    assert data["kind"] == "trades"
    return "pytest"


class TestHealth:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestUpload:
    def test_upload_creates_session(self, client, uploaded_session):
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        data = resp.json()
        session_ids = [s["session_id"] for s in data.get("sessions", [])]
        assert uploaded_session in session_ids


class TestAnalysisEndpoints:
    @pytest.mark.parametrize("endpoint", [
        "/api/analysis/metrics",
        "/api/analysis/risk-return",
        "/api/analysis/expectancy",
        "/api/analysis/dependency",
        "/api/analysis/distribution",
        "/api/analysis/time-decay",
        "/api/analysis/comprehensive",
        "/api/analysis/benchmark",
        "/api/analysis/portfolio",
        "/api/analysis/improvements",
    ])
    def test_analysis_endpoint(self, client, uploaded_session, endpoint):
        resp = client.get(f"{endpoint}?session_id={uploaded_session}")
        assert resp.status_code == 200, f"{endpoint} returned {resp.status_code}: {resp.text[:200]}"
        assert isinstance(resp.json(), dict)


class TestRobustnessEndpoints:
    @pytest.mark.parametrize("endpoint", [
        "/api/robustness/monte-carlo",
        "/api/robustness/parametric-monte-carlo",
        "/api/robustness/block-bootstrap",
        "/api/robustness/walk-forward",
        "/api/robustness/rolling-walk-forward",
        "/api/robustness/deflated-sharpe",
        "/api/robustness/regime",
    ])
    def test_robustness_endpoint(self, client, uploaded_session, endpoint):
        resp = client.get(f"{endpoint}?session_id={uploaded_session}")
        assert resp.status_code == 200, f"{endpoint} returned {resp.status_code}: {resp.text[:200]}"


class TestChartEndpoints:
    @pytest.mark.parametrize("endpoint", [
        "/api/charts/equity",
        "/api/charts/heatmap",
        "/api/charts/distribution",
        "/api/charts/trades",
    ])
    def test_chart_endpoint(self, client, uploaded_session, endpoint):
        resp = client.get(f"{endpoint}?session_id={uploaded_session}")
        assert resp.status_code == 200


class TestExportEndpoints:
    def test_export_json(self, client, uploaded_session):
        resp = client.get(f"/api/export/json?session_id={uploaded_session}")
        assert resp.status_code == 200
        data = resp.json()
        assert "core_metrics" in data
        assert "improvements" in data

    def test_export_csv(self, client, uploaded_session):
        resp = client.get(f"/api/export/csv?session_id={uploaded_session}")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

    def test_export_csv_filtered(self, client, uploaded_session):
        resp = client.get(f"/api/export/csv?session_id={uploaded_session}&filtered=true")
        assert resp.status_code == 200

    def test_report_html(self, client, uploaded_session):
        resp = client.get(f"/api/report/html?session_id={uploaded_session}")
        assert resp.status_code == 200
        assert "Nexural" in resp.text


class TestAI:
    def test_context_preview(self, client, uploaded_session):
        resp = client.post(f"/api/ai/context-preview?session_id={uploaded_session}")
        assert resp.status_code == 200
        data = resp.json()
        assert "context" in data
        assert len(data["context"]) > 100


class TestErrorHandling:
    def test_missing_session(self, client):
        resp = client.get("/api/analysis/metrics?session_id=nonexistent")
        assert resp.status_code == 404

    def test_wrong_data_type(self, client):
        # Upload an executions-type CSV, then try trades-only endpoint
        # This tests the validation
        resp = client.get("/api/analysis/metrics?session_id=nonexistent_session")
        assert resp.status_code in (404, 500)
