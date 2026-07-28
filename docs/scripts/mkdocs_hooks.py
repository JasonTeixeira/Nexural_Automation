"""Small, deterministic accessibility transforms for rendered documentation."""

from __future__ import annotations

import re


_PRE_TAG = re.compile(r"<pre(?P<attributes>[^>]*)>", re.IGNORECASE)


def _accessible_pre(match: re.Match[str]) -> str:
    attributes = match.group("attributes")
    if re.search(r"\btabindex\s*=", attributes, re.IGNORECASE):
        return match.group(0)
    return f'<pre tabindex="0" aria-label="Scrollable code example"{attributes}>'


def on_post_page(output: str, **_: object) -> str:
    """Make overflow code regions reachable before client-side JavaScript runs."""

    return _PRE_TAG.sub(_accessible_pre, output)
