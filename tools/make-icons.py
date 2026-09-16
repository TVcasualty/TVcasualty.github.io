#!/usr/bin/env python3
"""Generate the raster icons in public/ from the same mark as public/favicon.svg.

Kept in the repo for reproducibility only. It is not part of `bun run build`;
the outputs it writes are committed. Run it after editing the mark:

    python3 tools/make-icons.py

Pure standard library (zlib + struct), so it needs no image toolchain.
"""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"

YELLOW = (0xFF, 0xC8, 0x33)
PURPLE = (0x6C, 0x00, 0xFF)
DARKGRAY = (0x7A, 0x80, 0x85)

SS = 4  # supersampling factor, for antialiasing

# Mark geometry, in unit coordinates (fractions of the tile edge).
STEM_X0, STEM_X1 = 0.515, 0.665
STEM_Y0, STEM_Y1 = 0.300, 0.620
HOOK_CX, HOOK_CY = 0.445, 0.620
HOOK_R0, HOOK_R1 = 0.070, 0.220
DOT_CX, DOT_CY, DOT_R = 0.590, 0.190, 0.078


def in_mark(x: float, y: float) -> bool:
    """True when unit point (x, y) is inside the lowercase-j mark."""
    if STEM_X0 <= x <= STEM_X1 and STEM_Y0 <= y <= STEM_Y1:
        return True
    dx, dy = x - HOOK_CX, y - HOOK_CY
    if dy >= 0.0 and HOOK_R0 <= (dx * dx + dy * dy) ** 0.5 <= HOOK_R1:
        return True
    dx, dy = x - DOT_CX, y - DOT_CY
    return (dx * dx + dy * dy) ** 0.5 <= DOT_R


def blend(bg, fg, coverage: float):
    return tuple(round(b + (f - b) * coverage) for b, f in zip(bg, fg))


def write_png(path: Path, width: int, height: int, rows) -> None:
    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    print(f"wrote {path.relative_to(ROOT.parent)} ({path.stat().st_size} bytes)")


def tile(size: int, bg, fg) -> Path:
    """A square tile: solid background with the mark centred on it."""
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            hits = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / size
                    y = (py + (sy + 0.5) / SS) / size
                    hits += in_mark(x, y)
            row += bytes(blend(bg, fg, hits / (SS * SS)))
        rows.append(row)
    return rows


def og_card(width: int, height: int) -> list:
    """A wide social card: purple field, yellow band along the bottom, mark at left."""
    rows = []
    band_y = int(height * 0.82)
    mark_size = int(height * 0.62)
    mark_x = int(width * 0.09)
    mark_y = int((band_y - mark_size) / 2)
    for py in range(height):
        row = bytearray()
        bg = YELLOW if py >= band_y else PURPLE
        fg = PURPLE if py >= band_y else YELLOW
        for px in range(width):
            coverage = 0.0
            if mark_x <= px < mark_x + mark_size and mark_y <= py < mark_y + mark_size:
                hits = 0
                for sy in range(SS):
                    for sx in range(SS):
                        x = (px + (sx + 0.5) / SS - mark_x) / mark_size
                        y = (py + (sy + 0.5) / SS - mark_y) / mark_size
                        hits += in_mark(x, y)
                coverage = hits / (SS * SS)
            row += bytes(blend(bg, fg, coverage))
        rows.append(row)
    return rows


if __name__ == "__main__":
    write_png(ROOT / "favicon-32.png", 32, 32, tile(32, YELLOW, PURPLE))
    write_png(ROOT / "apple-touch-icon.png", 180, 180, tile(180, YELLOW, PURPLE))
    write_png(ROOT / "icon-192.png", 192, 192, tile(192, YELLOW, PURPLE))
    write_png(ROOT / "icon-512.png", 512, 512, tile(512, YELLOW, PURPLE))
    write_png(ROOT / "img/og-default.png", 1200, 630, og_card(1200, 630))
