from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "scripts" / "validate_site.py"
SPEC = importlib.util.spec_from_file_location("validate_site", MODULE_PATH)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = VALIDATOR
SPEC.loader.exec_module(VALIDATOR)


class SiteValidatorTests(unittest.TestCase):
    def test_reports_markdown_and_broken_links(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / "search").mkdir()
            (site / "search" / "search_index.json").write_text("{}", encoding="utf-8")
            (site / "index.html").write_text(
                """
                <html><head>
                  <link rel="canonical" href="https://example.test/">
                  <meta property="og:title" content="x">
                  <meta property="og:description" content="x">
                  <meta property="og:image" content="x">
                  <meta name="twitter:card" content="summary_large_image">
                </head><body>
                  <a href="missing.md">bad</a>
                  <a href="missing/">missing</a>
                  <strong>NOT QUALIFIED</strong> route → boundary —
                </body></html>
                """,
                encoding="utf-8",
            )

            errors = VALIDATOR.validate(site)

            self.assertTrue(any("links to Markdown" in error for error in errors))
            self.assertTrue(any("broken link" in error for error in errors))

    def test_accepts_complete_local_page(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / "search").mkdir()
            (site / "search" / "search_index.json").write_text("{}", encoding="utf-8")
            (site / "index.html").write_text(
                """
                <html><head>
                  <link rel="canonical" href="https://example.test/">
                  <meta property="og:title" content="x">
                  <meta property="og:description" content="x">
                  <meta property="og:image" content="x">
                  <meta name="twitter:card" content="summary_large_image">
                </head><body>
                  <a href="#status">status</a>
                  <h1 id="status">NOT QUALIFIED</h1>
                  <p>route → boundary —</p>
                  <pre tabindex="0">command</pre>
                </body></html>
                """,
                encoding="utf-8",
            )

            self.assertEqual([], VALIDATOR.validate(site))

    def test_reports_mojibake(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / "search").mkdir()
            (site / "search" / "search_index.json").write_text("{}", encoding="utf-8")
            (site / "index.html").write_text(
                """
                <html><head>
                  <link rel="canonical" href="https://example.test/">
                  <meta property="og:title" content="x">
                  <meta property="og:description" content="x">
                  <meta property="og:image" content="x">
                  <meta name="twitter:card" content="summary_large_image">
                </head><body>
                  <h1>NOT QUALIFIED</h1>
                  <p>route → boundary — malformed â€™</p>
                </body></html>
                """,
                encoding="utf-8",
            )

            errors = VALIDATOR.validate(site)

            self.assertTrue(any("mojibake" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
