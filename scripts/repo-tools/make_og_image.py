"""
Generate the OpenGraph social preview card for the repo.

Output: docs/assets/og-card.png (1280x640 PNG, brand-4 palette).

Run:
    python scripts/repo-tools/make_og_image.py

Re-run any time the headline/subhead/version changes.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# --- Brand 4 ----------------------------------------------------------------
CYAN = (14, 211, 207)      # #0ED3CF
CORAL = (232, 93, 58)      # #E85D3A
LIME = (168, 198, 51)      # #A8C633
MAGENTA = (199, 35, 110)   # #C7236E
BG = (8, 10, 14)           # near-black backdrop
INK = (235, 238, 242)      # off-white text
MUTED = (140, 150, 165)

WIDTH, HEIGHT = 1280, 640


def _font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if mono:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def render() -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Subtle dot grid backdrop
    for y in range(0, HEIGHT, 24):
        for x in range(0, WIDTH, 24):
            draw.point((x, y), fill=(22, 26, 32))

    # Left brand stripe (4 segments, brand-4 colors, vertical)
    stripe_w = 12
    seg_h = HEIGHT // 4
    for i, color in enumerate([CYAN, CORAL, LIME, MAGENTA]):
        draw.rectangle([0, i * seg_h, stripe_w, (i + 1) * seg_h], fill=color)

    # Kicker
    pad_x = 72
    y = 96
    draw.text((pad_x, y), "// NEXURAL · AUTOMATION", font=_font(22, mono=True), fill=CYAN)

    # Headline — 2 lines
    y += 60
    draw.text((pad_x, y), "Local-first automation lab", font=_font(64, bold=True), fill=INK)
    y += 78
    draw.text((pad_x, y), "for futures strategy research.", font=_font(64, bold=True), fill=INK)

    # Subhead
    y += 110
    draw.text(
        (pad_x, y),
        "MCP server · Strategy & Bridge SDKs · Validation gauntlet · Futures cost model",
        font=_font(24),
        fill=MUTED,
    )
    y += 38
    draw.text(
        (pad_x, y),
        "NinjaTrader 8 · TradingView · Python — paper-first, agent-callable.",
        font=_font(24),
        fill=MUTED,
    )

    # Footer chips
    y = HEIGHT - 96
    chips = [
        ("Apache-2.0", CYAN),
        ("Python 3.11", CORAL),
        ("MCP smoke-tested", LIME),
        ("v0.1.0-public-mvp", MAGENTA),
    ]
    x = pad_x
    for label, color in chips:
        bbox = draw.textbbox((0, 0), label, font=_font(20, mono=True))
        w = bbox[2] - bbox[0]
        box_w = w + 28
        box_h = 36
        # rounded-ish rectangle
        draw.rectangle([x, y, x + box_w, y + box_h], outline=color, width=2)
        # dot
        draw.ellipse([x + 10, y + 14, x + 18, y + 22], fill=color)
        draw.text((x + 24, y + 8), label, font=_font(18, mono=True), fill=color)
        x += box_w + 16

    # Bottom-right repo handle
    handle = "github.com/JasonTeixeira/Nexural_Automation"
    bbox = draw.textbbox((0, 0), handle, font=_font(18, mono=True))
    w = bbox[2] - bbox[0]
    draw.text((WIDTH - pad_x - w, HEIGHT - 50), handle, font=_font(18, mono=True), fill=MUTED)

    return img


def main() -> None:
    out_path = Path(__file__).resolve().parents[2] / "docs" / "assets" / "og-card.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img = render()
    img.save(out_path, format="PNG", optimize=True)
    print(f"wrote {out_path} ({out_path.stat().st_size:,} bytes, {WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
