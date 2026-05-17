"""Generate transparent PNGs from raw logo screenshots (Pillow only)."""
from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"


def luminance(r: int, g: int, b: int) -> float:
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


def process_atom(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            lum = luminance(r, g, b)
            # Drop outer black / inner charcoal; keep pale atom strokes
            if lum < 0.42:
                px[x, y] = (r, g, b, 0)
            else:
                px[x, y] = (r, g, b, a)
    im.save(path_out, optimize=True)


def process_s_mark(path_in: Path, path_out: Path) -> None:
    """Isolate ribbon S: drop textured paper + navy squircle using HSV heuristics."""
    im = Image.open(path_in).convert("RGBA")
    px = im.load()
    w, h = im.size

    # Average corner colour ≈ paper background
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    pr = pg = pb = 0
    for cx, cy in corners:
        r, g, b, _ = px[cx, cy]
        pr, pg, pb = pr + r, pg + g, pb + b
    pr, pg, pb = pr / 4, pg / 4, pb / 4

    def paper_distance(r: int, g: int, b: int) -> float:
        return ((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2) ** 0.5

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
            ch, cs, cv = colorsys.rgb_to_hsv(rn, gn, bn)
            mx, mn = max(r, g, b), min(r, g, b)
            spread = mx - mn
            avg = (r + g + b) / 3

            # Outer textured sheet
            if paper_distance(r, g, b) < 55 and cs < 0.12:
                px[x, y] = (0, 0, 0, 0)
                continue

            # Very light low-saturation areas (paper grain)
            if cv > 0.78 and cs < 0.14:
                px[x, y] = (0, 0, 0, 0)
                continue

            # Navy / charcoal squircle plate & outer drop shadow (flat dark neutrals)
            blue_band = 0.52 < ch < 0.75
            if blue_band and cv < 0.55 and cs > 0.06:
                px[x, y] = (0, 0, 0, 0)
                continue

            if spread < 28 and avg < 72:
                px[x, y] = (0, 0, 0, 0)
                continue

            # Near-black residual frame
            if mx < 42 and cs < 0.3:
                px[x, y] = (0, 0, 0, 0)
                continue

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    im.save(path_out, optimize=True)


def emit_favicon_sizes(src: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    base = Image.open(src).convert("RGBA")
    for size in (128, 96, 32, 16):
        resized = base.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(out_dir / f"favicon-{size}x{size}.png", optimize=True)


def main() -> None:
    atom_in = ASSETS / "_src-atom.png"
    s_in = ASSETS / "_src-s-mark.png"
    if not atom_in.exists() or not s_in.exists():
        raise SystemExit(f"Missing sources in {ASSETS}")

    process_atom(atom_in, ASSETS / "atom-mark.png")
    process_s_mark(s_in, ASSETS / "app-logo.png")

    icons = ROOT / "public" / "icons"
    emit_favicon_sizes(ASSETS / "app-logo.png", icons)

    # ICO best-effort: reuse 32x32
    ico_path = ROOT / "public" / "favicon.ico"
    im32 = Image.open(icons / "favicon-32x32.png").convert("RGBA")
    im32.save(ico_path, format="ICO", sizes=[(32, 32)])

    print("Wrote app-logo.png, atom-mark.png, public/icons/*, public/favicon.ico")


if __name__ == "__main__":
    main()
