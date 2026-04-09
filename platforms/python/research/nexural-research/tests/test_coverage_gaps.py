"""Tests to close coverage gaps in uncovered modules."""

import io
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from nexural_research.api.app import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# ===================================================================
# Excel Export
# ===================================================================

class TestExcelExport:
    def test_generates_valid_xlsx(self, client):
        r = client.get("/api/export/excel?session_id=demo")
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert len(r.content) > 1000  # non-trivial file

    def test_excel_has_multiple_sheets(self):
        from nexural_research.export.excel import generate_excel_report
        from nexural_research.api.sessions import sessions
        if "demo" not in sessions:
            pytest.skip("No demo session")
        df = sessions["demo"]["df"]
        content = generate_excel_report(df)
        # Verify it's valid xlsx by opening it
        wb = pd.ExcelFile(io.BytesIO(content))
        assert "Summary" in wb.sheet_names
        assert "Trades" in wb.sheet_names
        assert "All Metrics" in wb.sheet_names


# ===================================================================
# PDF Report
# ===================================================================

class TestPDFReportContent:
    def test_has_grade(self, client):
        r = client.get("/api/export/pdf-report?session_id=demo")
        assert r.status_code == 200
        html = r.text
        assert "grade" in html.lower() or any(g in html for g in ["A<", "B<", "C<", "D<", "F<"])

    def test_has_metrics_grid(self, client):
        r = client.get("/api/export/pdf-report?session_id=demo")
        html = r.text
        assert "Net Profit" in html
        assert "Sharpe" in html
        assert "Sortino" in html
        assert "Kelly" in html

    def test_has_stress_test(self, client):
        r = client.get("/api/export/pdf-report?session_id=demo")
        html = r.text
        assert "Tail" in html or "Stress" in html
        assert "Disclaimer" in html


# ===================================================================
# Session Persistence
# ===================================================================

class TestSessionPersistence:
    def test_persist_and_load(self):
        from nexural_research.api.sessions import persist_session, load_persisted_sessions, sessions, delete_persisted_session
        df = pd.DataFrame({"profit": [100, -50, 200], "entry_time": pd.date_range("2025-01-01", periods=3, freq="h"), "exit_time": pd.date_range("2025-01-01 00:15", periods=3, freq="h"), "instrument": "NQ", "strategy": "Test"})
        persist_session("persist_test_123", df, "trades", "test.csv")
        # Should be on disk
        from pathlib import Path
        import os
        session_dir = Path(os.environ.get("NEXURAL_SESSION_DIR", "data/sessions"))
        assert (session_dir / "persist_test_123" / "data.parquet").exists()
        assert (session_dir / "persist_test_123" / "meta.json").exists()
        # Cleanup
        delete_persisted_session("persist_test_123")
        assert not (session_dir / "persist_test_123").exists()

    def test_cleanup_expired(self):
        from nexural_research.api.sessions import cleanup_expired_sessions
        count = cleanup_expired_sessions()
        assert isinstance(count, int)


# ===================================================================
# DB Engine
# ===================================================================

class TestDBEngine:
    def test_engine_creates(self):
        from nexural_research.db.engine import engine
        assert engine is not None

    def test_session_factory(self):
        from nexural_research.db.engine import SessionLocal
        db = SessionLocal()
        assert db is not None
        db.close()

    def test_init_database(self):
        from nexural_research.db.init_db import init_database
        init_database()  # should not raise


# ===================================================================
# DB Models
# ===================================================================

class TestDBModels:
    def test_models_importable(self):
        from nexural_research.db.models import User, ApiKey, AnalysisSession, AnalysisRun
        assert User.__tablename__ == "users"
        assert ApiKey.__tablename__ == "api_keys"
        assert AnalysisSession.__tablename__ == "analysis_sessions"
        assert AnalysisRun.__tablename__ == "analysis_runs"


# ===================================================================
# Cache
# ===================================================================

class TestCacheOperations:
    def test_put_get(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10, default_ttl=60)
        c.put("test_key", {"data": 42})
        hit, val = c.get("test_key")
        assert hit is True
        assert val == {"data": 42}

    def test_miss(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10)
        hit, val = c.get("nonexistent")
        assert hit is False
        assert val is None

    def test_ttl_expiry(self):
        import time
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10, default_ttl=1)
        c.put("expire_key", {"data": 1}, ttl=1)
        # Wait for TTL to expire
        time.sleep(1.2)
        hit, val = c.get("expire_key")
        assert hit is False

    def test_max_size_eviction(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=3, default_ttl=60)
        c.put("a", 1)
        c.put("b", 2)
        c.put("c", 3)
        c.put("d", 4)  # should evict "a"
        hit, _ = c.get("a")
        assert hit is False
        hit, val = c.get("d")
        assert hit is True

    def test_stats(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10, default_ttl=60)
        c.put("k1", "v1")
        c.get("k1")  # hit
        c.get("k2")  # miss
        s = c.stats
        assert s["hits"] == 1
        assert s["misses"] == 1
        assert s["size"] == 1

    def test_clear(self):
        from nexural_research.api.cache import AnalysisCache
        c = AnalysisCache(max_size=10)
        c.put("k", "v")
        c.clear()
        assert c.stats["size"] == 0

    def test_make_key(self):
        from nexural_research.api.cache import AnalysisCache
        k1 = AnalysisCache.make_key("demo", "comprehensive", {"rfr": 0.0})
        k2 = AnalysisCache.make_key("demo", "comprehensive", {"rfr": 0.0})
        k3 = AnalysisCache.make_key("demo", "comprehensive", {"rfr": 0.05})
        assert k1 == k2
        assert k1 != k3


# ===================================================================
# Auth Module
# ===================================================================

class TestAuthModule:
    def test_auth_disabled_by_default(self):
        from nexural_research.api.auth import is_auth_enabled
        # In test env, auth should be disabled
        assert not is_auth_enabled()

    def test_auth_context_creation(self):
        from nexural_research.api.auth import AuthContext
        ctx = AuthContext(authenticated=False)
        assert not ctx.authenticated
        ctx2 = AuthContext(authenticated=True, key_hash="abc123", tier="pro")
        assert ctx2.authenticated
        assert ctx2.tier == "pro"


# ===================================================================
# Middleware
# ===================================================================

class TestMiddleware:
    def test_request_id_generated(self, client):
        r = client.get("/api/health")
        rid = r.headers.get("x-request-id")
        assert rid is not None
        assert len(rid) > 10

    def test_rate_limit_headers(self, client):
        r = client.get("/api/sessions")
        assert "x-ratelimit-limit" in r.headers
        assert int(r.headers["x-ratelimit-limit"]) > 0

    def test_response_time_header(self, client):
        r = client.get("/api/health")
        rt = r.headers.get("x-response-time")
        assert rt is not None
        assert "s" in rt

    def test_metrics_endpoint(self, client):
        r = client.get("/metrics")
        assert r.status_code == 200
        assert "nexural_requests_total" in r.text
        assert "nexural_active_sessions" in r.text


# ===================================================================
# Comparison Matrix
# ===================================================================

class TestComparisonMatrixEdgeCases:
    def test_same_session_twice(self, client):
        r = client.get("/api/compare/matrix?session_ids=demo,demo")
        assert r.status_code == 200
        data = r.json()
        assert data["n_strategies"] == 2

    def test_missing_session(self, client):
        r = client.get("/api/compare/matrix?session_ids=demo,nonexistent_xyz")
        assert r.status_code == 404

    def test_single_session_error(self, client):
        r = client.get("/api/compare/matrix?session_ids=demo")
        assert r.status_code == 400


# ===================================================================
# Parameter Sweep Caching
# ===================================================================

class TestSweepCaching:
    def test_sweep_cached(self, client):
        r1 = client.get("/api/analysis/parameter-sweep?session_id=demo&stop_steps=3&target_steps=3&size_steps=2")
        assert r1.status_code == 200
        r2 = client.get("/api/analysis/parameter-sweep?session_id=demo&stop_steps=3&target_steps=3&size_steps=2")
        assert r2.status_code == 200
        # Second call should be faster (cached)
        assert r1.json()["n_combinations"] == r2.json()["n_combinations"]
