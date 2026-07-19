from __future__ import annotations

import io
import re

import pytest
from fastapi.testclient import TestClient

from nexural_research.api import auth as auth_module
from nexural_research.api import sessions as sessions_module
from nexural_research.api.app import app
from nexural_research.api.sessions import sessions

CSV = (
    "trade_id,symbol,entry_time,exit_time,net_pnl\n"
    "1,NQ,2025-01-01 09:30,2025-01-01 09:45,100\n"
    "2,NQ,2025-01-01 10:00,2025-01-01 10:15,-50\n"
)


def _upload(client: TestClient, key: str, requested_id: str | None = None):
    suffix = f"?session_id={requested_id}" if requested_id else ""
    return client.post(
        f"/api/upload{suffix}",
        headers={"Authorization": f"Bearer {key}"},
        files={"file": ("trades.csv", io.BytesIO(CSV.encode()), "text/csv")},
    )


@pytest.fixture
def authenticated_client(monkeypatch, tmp_path):
    keys = {"owner-a", "owner-b"}
    monkeypatch.setattr(auth_module, "_AUTH_ENABLED", True)
    monkeypatch.setattr(auth_module, "_VALID_KEY_HASHES", {auth_module._hash_key(k) for k in keys})
    monkeypatch.setattr(sessions_module, "_SESSION_DIR", tmp_path)
    sessions.clear()
    with TestClient(app) as client:
        yield client
    sessions.clear()


def test_upload_uses_server_uuid_even_when_caller_supplies_session_id(authenticated_client):
    response = _upload(authenticated_client, "owner-a", "../../outside")

    assert response.status_code == 200
    session_id = response.json()["session_id"]
    assert re.fullmatch(
        r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
        session_id,
    )
    assert "../../outside" not in sessions


def test_session_owner_can_list_read_and_delete(authenticated_client):
    response = _upload(authenticated_client, "owner-a")
    session_id = response.json()["session_id"]
    headers = {"Authorization": "Bearer owner-a"}

    listed = authenticated_client.get("/api/sessions", headers=headers)
    assert session_id in {item["session_id"] for item in listed.json()["sessions"]}
    assert (
        authenticated_client.get(
            f"/api/analysis/metrics?session_id={session_id}", headers=headers
        ).status_code
        == 200
    )
    assert (
        authenticated_client.delete(f"/api/sessions/{session_id}", headers=headers).status_code
        == 200
    )


def test_cross_owner_access_is_hidden_and_cannot_delete(authenticated_client):
    response = _upload(authenticated_client, "owner-a")
    session_id = response.json()["session_id"]
    owner_b = {"Authorization": "Bearer owner-b"}

    listed = authenticated_client.get("/api/sessions", headers=owner_b)
    assert session_id not in {item["session_id"] for item in listed.json()["sessions"]}
    assert (
        authenticated_client.get(
            f"/api/analysis/metrics?session_id={session_id}", headers=owner_b
        ).status_code
        == 404
    )
    assert (
        authenticated_client.post(
            f"/api/ai/context-preview?session_id={session_id}", headers=owner_b
        ).status_code
        == 404
    )
    assert (
        authenticated_client.delete(f"/api/sessions/{session_id}", headers=owner_b).status_code
        == 404
    )
    assert session_id in sessions


def test_session_routes_require_auth_when_enabled(authenticated_client):
    assert authenticated_client.get("/api/sessions").status_code == 401
    assert authenticated_client.get("/api/analysis/metrics?session_id=missing").status_code == 401


@pytest.mark.parametrize("hostile_id", ["../../escape", "..\\..\\escape", "C:\\escape"])
def test_persistence_rejects_paths_outside_session_root(monkeypatch, tmp_path, hostile_id):
    import pandas as pd
    from fastapi import HTTPException

    session_root = tmp_path / "sessions"
    session_root.mkdir()
    monkeypatch.setattr(sessions_module, "_SESSION_DIR", session_root)

    with pytest.raises(HTTPException) as exc:
        sessions_module.persist_session(
            hostile_id,
            pd.DataFrame({"profit": [100.0]}),
            "trades",
            "trades.csv",
        )

    assert exc.value.status_code == 404
    assert list(tmp_path.iterdir()) == [session_root]
