"""Validate the built MkDocs site without external network requests."""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


SITE_PREFIX = "/Nexural_Automation/"
REQUIRED_META = {
    ("property", "og:title"),
    ("property", "og:description"),
    ("property", "og:image"),
    ("name", "twitter:card"),
}
MOJIBAKE_MARKERS = ("Ã", "â€™", "â€œ", "â€", "ï¿½", "�")


@dataclass
class Page:
    path: Path
    links: list[tuple[str, str]] = field(default_factory=list)
    ids: set[str] = field(default_factory=set)
    metadata: set[tuple[str, str]] = field(default_factory=set)
    canonical: bool = False
    pre_without_tabindex: int = 0
    nested_asides: int = 0


class PageParser(HTMLParser):
    def __init__(self, path: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.page = Page(path)
        self._aside_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name: value or "" for name, value in attrs}
        if identifier := attributes.get("id"):
            self.page.ids.add(identifier)

        if tag == "a" and attributes.get("href"):
            self.page.links.append(("link", attributes["href"]))
        elif tag in {"img", "script"} and attributes.get("src"):
            self.page.links.append(("asset", attributes["src"]))
        elif tag == "link" and attributes.get("href"):
            relationship = set(attributes.get("rel", "").split())
            if "canonical" in relationship:
                self.page.canonical = True
            elif relationship.intersection({"stylesheet", "icon"}):
                self.page.links.append(("asset", attributes["href"]))

        if tag == "meta":
            for attribute in ("property", "name"):
                if value := attributes.get(attribute):
                    self.page.metadata.add((attribute, value))

        if tag == "pre" and attributes.get("tabindex") != "0":
            self.page.pre_without_tabindex += 1

        if tag == "aside":
            if self._aside_depth:
                self.page.nested_asides += 1
            self._aside_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "aside" and self._aside_depth:
            self._aside_depth -= 1


def parse_pages(site: Path) -> dict[Path, Page]:
    pages: dict[Path, Page] = {}
    for path in sorted(site.rglob("*.html")):
        parser = PageParser(path)
        parser.feed(path.read_text(encoding="utf-8"))
        pages[path.resolve()] = parser.page
    return pages


def local_target(site: Path, source: Path, raw_url: str) -> tuple[Path, str]:
    split = urlsplit(raw_url)
    fragment = unquote(split.fragment)
    route = unquote(split.path)
    if route.startswith(SITE_PREFIX):
        target = site / route.removeprefix(SITE_PREFIX)
    elif route.startswith("/"):
        target = site / route.lstrip("/")
    elif route:
        target = source.parent / route
    else:
        target = source

    if target.is_dir() or not target.suffix:
        target = target / "index.html"
    return target.resolve(), fragment


def validate(site: Path) -> list[str]:
    errors: list[str] = []
    pages = parse_pages(site)
    if not pages:
        return [f"No rendered HTML pages found below {site}"]

    if not (site / "search" / "search_index.json").is_file():
        errors.append("Search index is missing")

    for source, page in pages.items():
        relative_source = source.relative_to(site.resolve())
        rendered = source.read_text(encoding="utf-8")
        is_error_page = relative_source.as_posix() == "404.html"
        for marker in MOJIBAKE_MARKERS:
            if marker in rendered:
                errors.append(
                    f"{relative_source}: suspected UTF-8 mojibake marker {marker!r}"
                )
        if not is_error_page and not page.canonical:
            errors.append(f"{relative_source}: canonical link is missing")
        missing_meta = set() if is_error_page else REQUIRED_META - page.metadata
        for attribute, value in sorted(missing_meta):
            errors.append(f"{relative_source}: missing meta {attribute}={value}")
        if page.pre_without_tabindex:
            errors.append(
                f"{relative_source}: {page.pre_without_tabindex} code region(s) "
                "are not keyboard focusable"
            )
        if page.nested_asides:
            errors.append(
                f"{relative_source}: {page.nested_asides} nested aside(s) found"
            )

        for kind, raw_url in page.links:
            split = urlsplit(raw_url)
            if split.scheme in {
                "http",
                "https",
                "mailto",
                "tel",
                "data",
                "javascript",
            }:
                continue
            if raw_url.startswith("//"):
                continue
            if split.path.lower().endswith(".md"):
                errors.append(
                    f"{relative_source}: rendered {kind} still links to Markdown: {raw_url}"
                )
                continue

            target, fragment = local_target(site.resolve(), source, raw_url)
            if not target.exists():
                errors.append(f"{relative_source}: broken {kind}: {raw_url}")
                continue
            if fragment and target.suffix.lower() == ".html":
                target_page = pages.get(target)
                if target_page is None:
                    errors.append(
                        f"{relative_source}: HTML target was not parsed: {raw_url}"
                    )
                elif fragment not in target_page.ids:
                    errors.append(f"{relative_source}: missing anchor: {raw_url}")

    index = (site / "index.html").read_text(encoding="utf-8")
    if "NOT QUALIFIED" not in index:
        errors.append("Home page does not expose the NOT QUALIFIED state")
    for required_character, name in (("→", "arrow"), ("—", "em dash")):
        if required_character not in index:
            errors.append(f"Home page is missing the UTF-8 {name}")
    if "release score" in index.lower() or ">1.00<" in index:
        errors.append("Home page contains a fabricated release score")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("site", type=Path, help="Rendered MkDocs site directory")
    args = parser.parse_args()
    site = args.site.resolve()
    errors = validate(site)
    if errors:
        grouped: dict[str, list[str]] = defaultdict(list)
        for error in errors:
            grouped[error.split(":", 1)[0]].append(error)
        for group in sorted(grouped):
            for error in grouped[group]:
                print(f"ERROR {error}")
        print(f"Validation failed with {len(errors)} error(s).")
        return 1
    print(f"Validated {len(parse_pages(site))} HTML pages with no broken local links.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
