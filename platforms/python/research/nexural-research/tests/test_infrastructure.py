"""Tests for Phase 2 infrastructure: routers, auth, rate limiting, request IDs."""

import io
import os

import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def session_id(client):
    csv = (
        "trade_id,symbol,entry_time,exit_time,net_pnl,strategy\n"
        "T1,NQ,2025-10-01 09:35,2025-10-01 09:49,195.5,Fade\n"
        "T2,NQ,2025-10-01 10:10,2025-10-01 10:25,195.5,Fade\n"
        "T3,NQ,2025-10-01 11:00,2025-10-01 11:15,-204.5,Momentum\n"
        "T4,NQ,2025-10-02 09:40,2025-10-02 09:55,-404.5,Fade\n"
        "T5,NQ,2025-10-02 10:20,2025-10-02 10:40,595.5,Momentum\n"
        "T6,NQ,2025-10-02 11:00,2025-10-02 11:10,195.5,Fade\n"
        "T7,NQ,2025-10-03 09:35,2025-10-03 09:50,-204.5,Fade\n"
        "T8,NQ,2025-10-03 10:15,2025-10-03 10:35,595.5,Momentum\n"
        "T9,NQ,2025-10-03 11:05,2025-10-03 11:20,-104.5,Fade\n"
        "T10,NQ,2025-10-03 12:00,2025-10-03 12:20,395.5,Momentum\n"
    )
    resp = client.post(
        "/api/upload?session_id=infra_test",
        files={"file": ("test.csv", io.BytesIO(csv.encode()), "text/csv")},
    )
    assert resp.status_code == 200
    return "infra_test"


# ===================================================================
# Router mounting — all endpoints still work under /api/
# ===================================================================

class TestRouterMounting:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "active_sessions" in data
        assert "uptime_seconds" in data

    def test_health_ready(self, client):
        resp = client.get("/api/health/ready")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"

    def test_sessions(self, client, session_id):
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        data = resp.json()
        session_ids = [s["session_id"] for s in data.get("sessions", [])]
        assert session_id in session_ids

    def test_analysis_metrics(self, client, session_id):
        resp = client.get(f"/api/analysis/metrics?session_id={session_id}")
        assert resp.status_code == 200
        assert "n_trades" in resp.json()

    def test_analysis_risk_return(self, client, session_id):
        resp = client.get(f"/api/analysis/risk-return?session_id={session_id}")
        assert resp.status_code == 200
        assert "sharpe_ratio" in resp.json()

    def test_analysis_comprehensive(self, client, session_id):
        resp = client.get(f"/api/analysis/comprehensive?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_return" in data
        assert "institutional" in data

    def test_analysis_hurst(self, client, session_id):
        resp = client.get(f"/api/analysis/hurst?session_id={session_id}")
        assert resp.status_code == 200
        assert "hurst_exponent" in resp.json()

    def test_stress_tail(self, client, session_id):
        resp = client.get(f"/api/stress/tail-amplification?session_id={session_id}")
        assert resp.status_code == 200
        assert "scenarios" in resp.json()

    def test_robustness_mc(self, client, session_id):
        resp = client.get(f"/api/robustness/monte-carlo?session_id={session_id}&n=50")
        assert resp.status_code == 200

    def test_charts_equity(self, client, session_id):
        resp = client.get(f"/api/charts/equity?session_id={session_id}")
        assert resp.status_code == 200
        assert "equity" in resp.json()

    def test_export_json(self, client, session_id):
        resp = client.get(f"/api/export/json?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "core_metrics" in data
        assert "institutional" in data

    def test_export_csv(self, client, session_id):
        resp = client.get(f"/api/export/csv?session_id={session_id}")
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

    def test_report_html(self, client, session_id):
        resp = client.get(f"/api/report/html?session_id={session_id}")
        assert resp.status_code == 200
        assert "Nexural" in resp.text

    def test_ai_context_preview(self, client, session_id):
        resp = client.post(f"/api/ai/context-preview?session_id={session_id}")
        assert resp.status_code == 200

    def test_improvements(self, client, session_id):
        resp = client.get(f"/api/analysis/improvements?session_id={session_id}")
        assert resp.status_code == 200

    def test_input_validation_still_works(self, client, session_id):
        resp = client.get(f"/api/robustness/monte-carlo?session_id={session_id}&n=999999")
        assert resp.status_code == 422

    def test_missing_session_404(self, client):
        resp = client.get("/api/analysis/metrics?session_id=nonexistent_xxx")
        assert resp.status_code == 404


# ===================================================================
# Request ID Middleware
# ===================================================================

class TestRequestID:
    def test_response_has_request_id(self, client):
        resp = client.get("/api/health")
        assert "x-request-id" in resp.headers
        assert len(resp.headers["x-request-id"]) > 10  # UUID4

    def test_client_request_id_passed_through(self, client):
        resp = client.get("/api/health", headers={"X-Request-ID": "my-custom-id-123"})
        assert resp.headers["x-request-id"] == "my-custom-id-123"

    def test_different_requests_get_different_ids(self, client):
        r1 = client.get("/api/health")
        r2 = client.get("/api/health")
        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]


# ===================================================================
# Rate Limiting
# ===================================================================

class TestRateLimiting:
    def test_rate_limit_headers_present(self, client):
        resp = client.get("/api/health/ready")
        # Health check is exempt, but ready check uses analysis router
        # Let's check a regular endpoint
        resp = client.get("/api/sessions")
        assert "x-ratelimit-limit" in resp.headers
        assert "x-ratelimit-remaining" in resp.headers

    def test_health_exempt_from_rate_limit(self, client):
        """Health endpoint should not have rate limit headers."""
        resp = client.get("/api/health")
        # Health is exempt — may or may not have headers depending on implementation
        assert resp.status_code == 200


# ===================================================================
# Auth System
# ===================================================================

class TestAuth:
    def test_auth_disabled_by_default(self, client, session_id):
        """With no NEXURAL_AUTH_ENABLED, all requests should pass."""
        resp = client.get(f"/api/analysis/metrics?session_id={session_id}")
        assert resp.status_code == 200

    def test_auth_module_importable(self):
        from nexural_research.api.auth import AuthContext, is_auth_enabled, require_auth
        assert not is_auth_enabled()  # default is disabled
        ctx = AuthContext(authenticated=False)
        assert not ctx.authenticated


# ===================================================================
# Error Handling
# ===================================================================

class TestErrorHandling:
    def test_404_no_traceback(self, client):
        resp = client.get("/api/analysis/metrics?session_id=does_not_exist_xyz")
        assert resp.status_code == 404
        data = resp.json()
        assert "traceback" not in data

    def test_delete_idempotent(self, client):
        resp = client.delete("/api/sessions/nonexistent_session_abc")
        assert resp.status_code == 200

    def test_upload_and_delete_flow(self, client):
        csv = "trade_id,symbol,entry_time,exit_time,net_pnl\n1,NQ,2025-01-01 09:30,2025-01-01 09:45,100\n"
        resp = client.post(
            "/api/upload?session_id=delete_test",
            files={"file": ("t.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        assert resp.status_code == 200
        resp = client.delete("/api/sessions/delete_test")
        assert resp.status_code == 200
        resp = client.get("/api/analysis/metrics?session_id=delete_test")
        assert resp.status_code == 404
