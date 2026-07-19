"""Responsive and keyboard-semantic browser checks for the canonical Academy UI.

The DesignLab visual gate runs full Axe analysis (including color contrast) at these same widths.
These repo-local tests protect navigation semantics and overflow without a CDN dependency.
"""

from __future__ import annotations

import os

import pytest

try:
    from playwright.sync_api import expect, sync_playwright

    HAS_PLAYWRIGHT = True
except ImportError:  # pragma: no cover - optional browser dependency
    HAS_PLAYWRIGHT = False

pytestmark = pytest.mark.skipif(not HAS_PLAYWRIGHT, reason="Playwright is not installed")
FRONTEND_URL = os.environ.get("E2E_FRONTEND_URL", "http://127.0.0.1:8011")


@pytest.mark.parametrize("width,height", [(375, 900), (768, 1024), (1024, 900), (1440, 1100)])
def test_responsive_shell_has_no_horizontal_overflow(width: int, height: int) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        page.goto(FRONTEND_URL, wait_until="networkidle")
        expect(page.get_by_role("heading", name="Research flight deck")).to_be_visible()
        dimensions = page.evaluate(
            "() => ({ viewport: document.documentElement.clientWidth, "
            "content: document.documentElement.scrollWidth })"
        )
        assert dimensions["content"] <= dimensions["viewport"]
        context.close()
        browser.close()


def test_lab_tabs_use_roving_keyboard_focus() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 375, "height": 900})
        page = context.new_page()
        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.get_by_role("button", name="Causal Feature Pipeline").click()

        brief = page.locator('[role="tab"]').filter(has_text="brief")
        expect(brief).to_be_visible()
        expect(brief).to_have_attribute("aria-selected", "true")
        brief.focus()
        brief.press("ArrowRight")
        workbench = page.locator('[role="tab"]').filter(has_text="workbench")
        expect(workbench).to_have_attribute("aria-selected", "true")
        expect(workbench).to_be_focused()
        expect(page.get_by_role("tabpanel")).to_be_visible()

        context.close()
        browser.close()


def test_reduced_motion_preference_is_respected() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1024, "height": 900}, reduced_motion="reduce"
        )
        page = context.new_page()
        page.goto(FRONTEND_URL, wait_until="networkidle")
        durations = page.evaluate(
            "() => [...document.querySelectorAll('*')].map((node) => "
            "getComputedStyle(node).animationDuration).filter(Boolean)"
        )
        assert all(value in {"0s", "0.001s", "0.01ms", "1e-05s"} for value in durations)
        context.close()
        browser.close()
