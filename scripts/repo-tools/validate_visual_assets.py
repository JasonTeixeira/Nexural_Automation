"""Validate production brand assets and accessible repository diagrams.

This check is dependency-free so docs-and-metadata CI can run it immediately
after Python setup. It intentionally validates source properties rather than
subjective composition.
"""

from __future__ import annotations

import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SVG_NS = "http://www.w3.org/2000/svg"

ALLOWED_BRAND_COLORS = {
    "#111714",
    "#18201C",
    "#27332E",
    "#56635D",
    "#F4F0E6",
    "#C7F464",
    "#FF6B35",
    "#8E9B95",
}
FORBIDDEN_TOKENS = (
    "inter",
    "roboto",
    "arial",
    "system-ui",
    "-apple-system",
    "blinkmacsystemfont",
    "#1e40af",
    "#3b82f6",
    "#93c5fd",
    "#0ed3cf",
    "#c7236e",
    "lineargradient",
    "radialgradient",
)
REQUIRED_SVGS = {
    "docs/assets/brand/nx-mark.svg": (512, 512),
    "docs/assets/brand/nexural-automation-wordmark.svg": (1440, 320),
    "docs/assets/brand/nexural-automation-lockup.svg": (1600, 480),
    "platforms/python/research/nexural-research/desktop/icon.svg": (512, 512),
    "platforms/python/research/nexural-research/frontend/public/favicon.svg": (32, 32),
    "platforms/python/research/nexural-research/frontend/dist/favicon.svg": (32, 32),
}
REQUIRED_PNGS = {
    "docs/assets/og-card.png": (1280, 640, 2),
    "docs/assets/screenshots/academy-desktop.png": (1440, 900, 2),
    "docs/assets/screenshots/academy-mobile.png": (375, 900, 2),
    "platforms/python/research/nexural-research/desktop/icon.png": (512, 512, 6),
}
REQUIRED_FILES = (
    "docs/assets/brand/README.md",
    "docs/assets/brand/brand-tokens.json",
    "docs/assets/screenshots/README.md",
)


@dataclass(frozen=True)
class ValidationFailure:
    path: str
    message: str


def _relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def _number(value: str | None) -> int | None:
    if value is None:
        return None
    match = re.fullmatch(r"\s*(\d+)(?:px)?\s*", value)
    return int(match.group(1)) if match else None


def _validate_svg(
    path: Path,
    expected_size: tuple[int, int] | None,
    *,
    enforce_palette: bool,
) -> list[ValidationFailure]:
    failures: list[ValidationFailure] = []
    relative = _relative(path)
    try:
        source = path.read_text(encoding="utf-8")
        root = ET.fromstring(source)
    except (OSError, UnicodeDecodeError, ET.ParseError) as exc:
        return [ValidationFailure(relative, f"invalid SVG: {exc}")]

    if root.tag != f"{{{SVG_NS}}}svg":
        failures.append(
            ValidationFailure(relative, "root element must be SVG namespace <svg>")
        )
    if root.get("role") != "img":
        failures.append(ValidationFailure(relative, 'root must declare role="img"'))

    labelled = root.get("aria-labelledby", "").split()
    elements_by_id = {
        element.get("id"): element for element in root.iter() if element.get("id")
    }
    title_nodes = root.findall(f"{{{SVG_NS}}}title")
    desc_nodes = root.findall(f"{{{SVG_NS}}}desc")
    if len(title_nodes) != 1 or not "".join(title_nodes[0].itertext()).strip():
        failures.append(
            ValidationFailure(relative, "must contain one non-empty direct <title>")
        )
    if len(desc_nodes) != 1 or len("".join(desc_nodes[0].itertext()).strip()) < 12:
        failures.append(
            ValidationFailure(relative, "must contain one descriptive direct <desc>")
        )
    if len(labelled) != 2:
        failures.append(
            ValidationFailure(
                relative, "aria-labelledby must reference title and desc ids"
            )
        )
    elif any(identifier not in elements_by_id for identifier in labelled):
        failures.append(
            ValidationFailure(relative, "aria-labelledby references a missing id")
        )
    elif (
        title_nodes
        and desc_nodes
        and labelled
        != [
            title_nodes[0].get("id"),
            desc_nodes[0].get("id"),
        ]
    ):
        failures.append(
            ValidationFailure(relative, "aria-labelledby order must be title then desc")
        )

    if expected_size is not None:
        actual = (_number(root.get("width")), _number(root.get("height")))
        if actual != expected_size:
            failures.append(
                ValidationFailure(
                    relative, f"expected SVG size {expected_size}, found {actual}"
                )
            )
        view_box = root.get("viewBox", "").split()
        expected_view_box = ["0", "0", str(expected_size[0]), str(expected_size[1])]
        if view_box != expected_view_box:
            failures.append(
                ValidationFailure(
                    relative,
                    f"expected viewBox {' '.join(expected_view_box)}, found {' '.join(view_box)}",
                )
            )

    lowered = source.lower()
    for token in FORBIDDEN_TOKENS:
        if token in lowered:
            failures.append(
                ValidationFailure(relative, f"forbidden visual token: {token}")
            )
    for element in root.iter():
        local_name = element.tag.rsplit("}", 1)[-1].lower()
        if local_name in {"image", "foreignobject", "script"}:
            failures.append(
                ValidationFailure(
                    relative, f"embedded {local_name} content is not permitted"
                )
            )

    if enforce_palette:
        colors = {match.upper() for match in re.findall(r"#[0-9a-fA-F]{6}", source)}
        unexpected = sorted(colors - ALLOWED_BRAND_COLORS)
        if unexpected:
            failures.append(
                ValidationFailure(
                    relative, f"colors outside canonical palette: {unexpected}"
                )
            )
    return failures


def _png_header(path: Path) -> tuple[int, int, int]:
    with path.open("rb") as stream:
        header = stream.read(29)
    if (
        len(header) != 29
        or header[:8] != b"\x89PNG\r\n\x1a\n"
        or header[12:16] != b"IHDR"
    ):
        raise ValueError("invalid PNG signature or IHDR")
    width, height = struct.unpack(">II", header[16:24])
    return width, height, header[25]


def _validate_png(
    path: Path, expected: tuple[int, int, int]
) -> list[ValidationFailure]:
    relative = _relative(path)
    try:
        actual = _png_header(path)
    except (OSError, ValueError) as exc:
        return [ValidationFailure(relative, str(exc))]
    failures: list[ValidationFailure] = []
    if actual != expected:
        failures.append(
            ValidationFailure(
                relative,
                f"expected PNG width/height/color-type {expected}, found {actual}",
            )
        )
    if path.stat().st_size < 2_048:
        failures.append(
            ValidationFailure(relative, "production PNG is suspiciously small")
        )
    return failures


def _validate_tokens(path: Path) -> list[ValidationFailure]:
    relative = _relative(path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [ValidationFailure(relative, f"invalid token JSON: {exc}")]
    colors = set(payload.get("colors", {}).values())
    required = {"#111714", "#F4F0E6", "#C7F464", "#FF6B35"}
    failures = []
    if not required <= colors:
        failures.append(
            ValidationFailure(relative, "required four-color identity is incomplete")
        )
    typography = payload.get("typography", {})
    if typography != {"display": "Space Grotesk", "technical": "JetBrains Mono"}:
        failures.append(
            ValidationFailure(relative, "canonical typography pair has drifted")
        )
    return failures


def validate() -> list[ValidationFailure]:
    failures: list[ValidationFailure] = []
    for relative in (*REQUIRED_SVGS, *REQUIRED_PNGS, *REQUIRED_FILES):
        path = ROOT / relative
        if not path.is_file():
            failures.append(ValidationFailure(relative, "required asset is missing"))
    if failures:
        return failures

    for relative, size in REQUIRED_SVGS.items():
        failures.extend(_validate_svg(ROOT / relative, size, enforce_palette=True))
    for relative, expected in REQUIRED_PNGS.items():
        failures.extend(_validate_png(ROOT / relative, expected))

    diagrams = sorted((ROOT / "docs" / "assets" / "diagrams").glob("*.svg"))
    if not diagrams:
        failures.append(
            ValidationFailure("docs/assets/diagrams", "no documentation diagrams found")
        )
    for diagram in diagrams:
        failures.extend(_validate_svg(diagram, None, enforce_palette=False))

    failures.extend(
        _validate_tokens(ROOT / "docs" / "assets" / "brand" / "brand-tokens.json")
    )
    public_favicon = (
        ROOT
        / "platforms"
        / "python"
        / "research"
        / "nexural-research"
        / "frontend"
        / "public"
        / "favicon.svg"
    )
    dist_favicon = public_favicon.parents[1] / "dist" / "favicon.svg"
    if public_favicon.read_bytes() != dist_favicon.read_bytes():
        failures.append(
            ValidationFailure(
                _relative(dist_favicon),
                "built favicon must be byte-identical to public favicon",
            )
        )
    return failures


def main() -> int:
    failures = validate()
    if failures:
        print("Visual asset validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure.path}: {failure.message}", file=sys.stderr)
        return 1
    diagram_count = len(list((ROOT / "docs" / "assets" / "diagrams").glob("*.svg")))
    print(
        "Visual assets valid: "
        f"{len(REQUIRED_SVGS)} SVGs, {len(REQUIRED_PNGS)} PNGs, "
        f"{diagram_count} accessible diagrams."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
