#!/usr/bin/env python3
"""Audit colour contrast for every band in the generated stylesheet.

Reads public/styles/site.css, resolves each band's semantic colour tokens back
to concrete sRGB hex values, and checks the pairs that carry meaning against
WCAG 2.1 AA: 4.5:1 for body text and UI labels, 3.0:1 for large display accents
and focus indicators.

    bun run css && python3 tools/check-contrast.py

Exits non-zero on any failure, so it can gate a commit. Only the sRGB fallbacks
are checked; the display-p3 variants are more saturated, not lighter or darker,
so they do not change these ratios meaningfully.
"""

import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "public/styles/site.css"

BANDS = ["gray", "darkgray", "yellow", "white", "black", "purple", "aqua", "aqua-light"]

# (foreground token, background token, minimum ratio)
#
# `subtler` is deliberately absent. It is only ever used for hairlines,
# dividers and card borders — decorative boundaries that convey no information
# and are exempt under WCAG 1.4.11, since removing them entirely would not
# change what the page communicates. Holding them to 3:1 would force the
# dividers to compete with the text.
PAIRS = [
    ("text", "page-bg", 4.5),
    ("subtle", "page-bg", 4.5),
    ("button-text", "button-bg", 4.5),
    ("card-text", "card-bg", 4.5),
    ("accent", "page-bg", 3.0),
    ("focus-ring", "page-bg", 3.0),
]


def linearise(channel: float) -> float:
    c = channel / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def main() -> int:
    if not CSS.exists():
        print(f"✗ {CSS} not found — run `bun run css` first", file=sys.stderr)
        return 2
    css = CSS.read_text()

    # Primitive palette: --colors-foo: #rrggbb
    primitives = dict(
        re.findall(r"--colors-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b", css)
    )

    def aliases(selector: str) -> dict[str, str]:
        """--colors-a: var(--colors-b) pairs inside one selector block."""
        match = re.search(re.escape(selector) + r"\s*\{(.*?)\n\s*\}", css, re.S)
        if not match:
            return {}
        return dict(
            re.findall(
                r"--colors-([a-z0-9-]+):\s*var\(--colors-([a-z0-9-]+)\)", match.group(1)
            )
        )

    root = aliases(":where(:root, :host)")
    bands = {}
    for band in BANDS:
        # Panda quotes the selector only when the value contains a hyphen.
        sel = f'[data-color="{band}"]' if "-" in band else f"[data-color={band}]"
        bands[band] = aliases(sel)

    def resolve(token: str, band_map: dict[str, str]) -> str | None:
        """Follow var() indirection until a concrete hex value is reached."""
        for _ in range(10):
            if token in primitives:
                return primitives[token]
            nxt = band_map.get(token) or root.get(token)
            if not nxt or nxt == token:
                return None
            token = nxt
        return None

    width = max(len(p[0]) for p in PAIRS) + 1
    header = f"{'band':11}" + "".join(f"{fg:>{width+4}}" for fg, _, _ in PAIRS)
    print(header)
    print("-" * len(header))

    failures = []
    for band, band_map in bands.items():
        cells = []
        for fg_tok, bg_tok, threshold in PAIRS:
            fg, bg = resolve(fg_tok, band_map), resolve(bg_tok, band_map)
            if not fg or not bg:
                cells.append(f"{'??':>{width+4}}")
                failures.append(f"{band}: could not resolve {fg_tok} or {bg_tok}")
                continue
            ratio = contrast(fg, bg)
            flag = " " if ratio >= threshold else "!"
            cells.append(f"{ratio:>{width+3}.2f}{flag}")
            if ratio < threshold:
                failures.append(
                    f"{band}.{fg_tok} on {bg_tok}: {ratio:.2f}:1 "
                    f"({fg} on {bg}) — needs {threshold}:1"
                )
        print(f"{band:11}" + "".join(cells))

    print()
    if failures:
        print(f"✗ {len(failures)} contrast failure(s):")
        for failure in failures:
            print(f"   {failure}")
        return 1

    print("✓ all bands pass: text and UI ≥ 4.5:1, accents and rings ≥ 3.0:1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
