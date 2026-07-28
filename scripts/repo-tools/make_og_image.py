"""Deterministically render Nexural Automation production raster assets.

Outputs:
    docs/assets/og-card.png                                      1280x640 RGB
    platforms/python/research/nexural-research/desktop/icon.png 512x512 RGBA

The vector sources remain canonical. This renderer uses Pillow's embedded font
and fixed geometric primitives so it has no host-font, network, or timestamp
dependency.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CHARCOAL = (17, 23, 20)
SURFACE = (24, 32, 28)
STRUCTURE = (39, 51, 46)
PAPER = (244, 240, 230)
LIME = (199, 244, 100)
ORANGE = (255, 107, 53)
MUTED = (142, 155, 149)

ROOT = Path(__file__).resolve().parents[2]


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Use Pillow's embedded font rather than a machine-specific font path."""

    return ImageFont.load_default(size=size)


def _spaced_text(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    *,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: tuple[int, int, int],
    spacing: int,
) -> None:
    x, y = position
    for character in text:
        draw.text((x, y), character, font=font, fill=fill)
        box = draw.textbbox((x, y), character, font=font)
        x = int(box[2]) + spacing


def _draw_nx_mark(
    draw: ImageDraw.ImageDraw,
    *,
    origin: tuple[int, int],
    size: int,
    background: tuple[int, int, int] = SURFACE,
) -> None:
    x, y = origin
    scale = size / 512

    def p(value: float) -> int:
        return round(value * scale)

    draw.rounded_rectangle(
        (x, y, x + size, y + size),
        radius=p(88),
        fill=background,
        outline=STRUCTURE,
        width=max(1, p(2)),
    )
    draw.line(
        (x + p(36), y + p(104), x + p(476), y + p(104)),
        fill=STRUCTURE,
        width=max(1, p(2)),
    )
    draw.line(
        (x + p(36), y + p(408), x + p(476), y + p(408)),
        fill=STRUCTURE,
        width=max(1, p(2)),
    )
    width = max(2, p(34))
    draw.line(
        (
            x + p(92),
            y + p(366),
            x + p(92),
            y + p(146),
            x + p(238),
            y + p(366),
            x + p(238),
            y + p(146),
        ),
        fill=LIME,
        width=width,
        joint="curve",
    )
    draw.line(
        (x + p(286), y + p(146), x + p(420), y + p(366)), fill=ORANGE, width=width
    )
    draw.line(
        (x + p(420), y + p(146), x + p(286), y + p(366)), fill=ORANGE, width=width
    )
    draw.rectangle((x + p(36), y + p(36), x + p(80), y + p(44)), fill=LIME)
    draw.rectangle((x + p(84), y + p(36), x + p(102), y + p(44)), fill=ORANGE)
    radius = max(2, p(8))
    draw.ellipse(
        (
            x + p(456) - radius,
            y + p(456) - radius,
            x + p(456) + radius,
            y + p(456) + radius,
        ),
        fill=PAPER,
    )


def render_app_icon() -> Image.Image:
    image = Image.new("RGBA", (512, 512), (*CHARCOAL, 255))
    draw = ImageDraw.Draw(image)
    _draw_nx_mark(draw, origin=(0, 0), size=512, background=CHARCOAL)
    return image


def render_og_card() -> Image.Image:
    width, height = 1280, 640
    image = Image.new("RGB", (width, height), CHARCOAL)
    draw = ImageDraw.Draw(image)

    for x in range(0, width + 1, 40):
        draw.line((x, 0, x, height), fill=STRUCTURE, width=1)
    for y in range(0, height + 1, 40):
        draw.line((0, y, width, y), fill=STRUCTURE, width=1)

    draw.rectangle((0, 0, 16, height), fill=LIME)
    draw.rectangle((16, 0, 24, height), fill=ORANGE)
    _draw_nx_mark(draw, origin=(72, 70), size=176)

    _spaced_text(
        draw,
        (286, 72),
        "NEXURAL AUTOMATION",
        font=_font(31),
        fill=LIME,
        spacing=4,
    )
    draw.rectangle((286, 122, 1170, 126), fill=STRUCTURE)
    draw.rectangle((286, 122, 470, 126), fill=ORANGE)

    draw.text((286, 166), "AUTOMATION THAT", font=_font(72), fill=PAPER)
    draw.text((286, 246), "PROVES ITS WORK.", font=_font(72), fill=PAPER)

    draw.text(
        (286, 358),
        "NinjaTrader safety engineering + reproducible research",
        font=_font(27),
        fill=MUTED,
    )
    draw.text(
        (286, 398),
        "Simulation-first. Evidence-driven. Fail-closed.",
        font=_font(27),
        fill=MUTED,
    )

    chips = ("RESEARCH", "REPLAY", "EVIDENCE", "PAPER ONLY")
    chip_x = 286
    for index, label in enumerate(chips):
        font = _font(20)
        bounds = draw.textbbox((0, 0), label, font=font)
        chip_width = int(bounds[2] - bounds[0]) + 42
        color = ORANGE if index == len(chips) - 1 else LIME
        draw.rounded_rectangle(
            (chip_x, 474, chip_x + chip_width, 516),
            radius=4,
            fill=SURFACE,
            outline=color,
            width=2,
        )
        draw.rectangle((chip_x + 12, 491, chip_x + 18, 497), fill=color)
        draw.text((chip_x + 26, 485), label, font=font, fill=color)
        chip_x += chip_width + 14

    draw.rectangle((72, 566, 1208, 568), fill=STRUCTURE)
    draw.text(
        (72, 586),
        "github.com/JasonTeixeira/Nexural_Automation",
        font=_font(20),
        fill=MUTED,
    )
    draw.text((1056, 586), "NX / 01", font=_font(20), fill=PAPER)
    return image


def _save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=False, compress_level=9)
    print(
        f"wrote {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes, {image.width}x{image.height})"
    )


def main() -> None:
    _save_png(render_og_card(), ROOT / "docs" / "assets" / "og-card.png")
    _save_png(
        render_app_icon(),
        ROOT
        / "platforms"
        / "python"
        / "research"
        / "nexural-research"
        / "desktop"
        / "icon.png",
    )


if __name__ == "__main__":
    main()
