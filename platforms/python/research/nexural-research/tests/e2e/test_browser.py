"""Canonical browser workflows for the Vite Automation Academy frontend.

Start the built FastAPI app first:
  py -3.11 -m uvicorn nexural_research.api.app:app --host 127.0.0.1 --port 8011
Then run:
  pytest tests/e2e -v
"""

from __future__ import annotations

import json
import os

import pytest

try:
    from playwright.sync_api import Page, expect, sync_playwright

    HAS_PLAYWRIGHT = True
except ImportError:  # pragma: no cover - optional browser dependency
    HAS_PLAYWRIGHT = False

pytestmark = pytest.mark.skipif(not HAS_PLAYWRIGHT, reason="Playwright is not installed")
FRONTEND_URL = os.environ.get("E2E_FRONTEND_URL", "http://127.0.0.1:8011")


@pytest.fixture()
def page() -> Page:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        current_page = context.new_page()
        yield current_page
        context.close()
        browser.close()


def test_academy_shell_and_live_catalog_load(page: Page) -> None:
    response = page.goto(FRONTEND_URL, wait_until="networkidle")
    assert response is not None and response.ok
    expect(page.get_by_role("heading", name="Research flight deck")).to_be_visible()
    expect(page.get_by_text("Five operating tracks")).to_be_visible()
    expect(page.get_by_role("button", name="Causal Feature Pipeline")).to_be_enabled()


def test_mission_submission_creates_evidence_ledger_record(page: Page) -> None:
    page.goto(FRONTEND_URL, wait_until="networkidle")
    page.get_by_role("button", name="Causal Feature Pipeline").click()
    submission = {
        "source": {
            "program": {
                "operations": [
                    "load_fixture",
                    "split_before_feature_engineering",
                    "reject_stale_timestamp",
                    "emit_evidence",
                ],
                "settings": {"mode": "paper", "deterministic": True},
            }
        },
        "seed": 42,
    }
    page.get_by_label("Lab submission JSON").fill(json.dumps(submission, indent=2))
    page.get_by_role("button", name="Submit", exact=False).click()

    expect(page.get_by_text("PASS", exact=True)).to_be_visible()
    expect(page.locator(".academy-grade.passed strong")).to_have_text("100")

    page.get_by_role("button", name="Evidence ledger").click()
    expect(page.get_by_text("research.lookahead", exact=False).first).to_be_visible()
    ledger = page.locator("main").inner_text()
    assert any(len(token) >= 12 for token in ledger.replace("…", " ").split())


def test_hidden_safety_contract_does_not_leak_internal_identifier(page: Page) -> None:
    page.goto(FRONTEND_URL, wait_until="networkidle")
    page.get_by_role("button", name="Causal Feature Pipeline").click()
    unsafe = {
        "source": {
            "program": {
                "operations": [
                    "load_fixture",
                    "split_before_feature_engineering",
                    "emit_evidence",
                ],
                "settings": {"mode": "paper", "deterministic": True},
            }
        },
        "seed": 42,
    }
    page.get_by_label("Lab submission JSON").fill(json.dumps(unsafe))
    page.get_by_role("button", name="Check", exact=False).click()

    expect(page.get_by_text("REVISE", exact=True)).to_be_visible()
    assert "hidden_tests" not in page.locator("main").inner_text()


def test_analysis_workspace_remains_reachable(page: Page) -> None:
    page.goto(FRONTEND_URL, wait_until="networkidle")
    page.get_by_role("button", name="Overview").click()
    expect(page.get_by_text("Import Data", exact=True).first).to_be_visible()
