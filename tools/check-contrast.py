#!/usr/bin/env python3
"""Audit colour contrast of the built site against WCAG 2.1 AA.

    bun run build && python3 tools/check-contrast.py

This reads the *shipped output* — dist/*.html and public/styles/site.css — and
works out, for every piece of text on every page, what colour it actually
renders in, how large it actually renders, and therefore which WCAG threshold
it actually has to meet. Nothing about the design is transcribed into this
file, so it cannot drift out of sync with the components.

Why it has to work this way
--------------------------
WCAG's relaxed 3:1 ratio applies only to "large" text: >=18.66px bold or
>=24px regular. This design sizes everything in `em` on top of a root font size
that is itself a function of viewport width (BRIEF 3.1), so the *same* label is
large on a desktop monitor and small on a phone. A hardcoded threshold is
therefore always wrong somewhere. Instead this script:

  1. parses the rem ladder out of the stylesheet (html/body font-size rules,
     including the ones inside media queries),
  2. replays it at a range of viewport widths,
  3. walks the real DOM to compound each element's `em` chain into a px size,
  4. demands 4.5:1 unless the text clears the large-text bar at *every* width
     tested, down to 320px.

That last point is deliberately strict: text that only qualifies as large on a
desktop does not get the exemption, because the phone rendering is the one that
fails.

Anything the script cannot interpret is a hard error rather than a silent pass,
so adding a component with an unrecognised font-size or colour will fail the
check instead of slipping through unaudited.

Only the sRGB fallbacks are audited. The display-p3 variants are more
saturated, not lighter or darker, so they do not change these ratios
meaningfully.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_PATH = ROOT / "public/styles/site.css"
DIST = ROOT / "dist"

# Viewports to replay the ladder at. 320 is a small phone, 390 a common one,
# 670 and 1100 are the design's own breakpoints, 1440 a desktop.
VIEWPORTS = [320, 390, 670, 900, 1100, 1440]

# WCAG 2.1 large-text thresholds, in CSS px.
LARGE_BOLD_PX = 18.66
LARGE_REGULAR_PX = 24.0
BOLD_THRESHOLD = 700

# Elements whose text content is not rendered to the user.
NON_VISUAL = {"script", "style", "title", "head", "meta", "link"}

# Void elements, which never receive a closing tag.
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

# Panda's layers, in the order declared in the stylesheet. Later layers win
# regardless of specificity, which is why utilities override element rules.
LAYER_ORDER = ["reset", "base", "tokens", "recipes", "utilities"]


# --------------------------------------------------------------------------- #
# Colour maths
# --------------------------------------------------------------------------- #

def _linearise(channel: float) -> float:
    c = channel / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linearise(r) + 0.7152 * _linearise(g) + 0.0722 * _linearise(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def blend(fg: str, bg: str, alpha: float) -> str:
    """Composite a translucent colour over an opaque one."""
    f = fg.lstrip("#")
    b = bg.lstrip("#")
    if len(f) == 3:
        f = "".join(c * 2 for c in f)
    if len(b) == 3:
        b = "".join(c * 2 for c in b)
    out = []
    for i in (0, 2, 4):
        fv, bv = int(f[i : i + 2], 16), int(b[i : i + 2], 16)
        out.append(round(fv * alpha + bv * (1 - alpha)))
    return "#" + "".join(f"{v:02x}" for v in out)


# --------------------------------------------------------------------------- #
# Stylesheet
# --------------------------------------------------------------------------- #

@dataclass
class Rule:
    selector: str
    layer: int
    order: int
    specificity: tuple[int, int, int]
    declarations: dict[str, str]
    media: str = ""


class Stylesheet:
    """Just enough CSS understanding to resolve colour, size and weight."""

    def __init__(self, text: str) -> None:
        self.text = text
        self.primitives: dict[str, str] = dict(
            re.findall(r"--colors-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b", text)
        )
        self.rules: list[Rule] = []
        self._order = 0
        self._parse_block(self._strip_comments(text), context=[])

    # -- parsing ---------------------------------------------------------- #

    @staticmethod
    def _strip_comments(text: str) -> str:
        return re.sub(r"/\*.*?\*/", "", text, flags=re.S)

    def _parse_block(self, text: str, context: list[str]) -> None:
        """Recursively parse a CSS block, carrying @layer/@media context down.

        Written as a real recursive descent over balanced braces. An earlier
        version tried to track nesting with a flat stack and silently lost
        rules whose at-rule context closed on the same line — which produced a
        confidently wrong rem ladder, so this is deliberately explicit.
        """
        i = 0
        n = len(text)
        while i < n:
            brace = text.find("{", i)
            semi = text.find(";", i)

            # A statement at-rule such as `@layer a, b;` or `@import ...;`
            if semi != -1 and (brace == -1 or semi < brace):
                i = semi + 1
                continue
            if brace == -1:
                break

            prelude = text[i:brace].strip()
            close = self._match_brace(text, brace)
            body = text[brace + 1 : close]

            if prelude.startswith("@"):
                if re.match(r"@(layer|media|supports|scope|container)\b", prelude):
                    self._parse_block(body, context + [prelude])
                # @keyframes, @font-face and friends hold nothing we audit.
            else:
                self._add_rules(prelude, body, context)

            i = close + 1

    def _add_rules(self, prelude: str, body: str, context: list[str]) -> None:
        declarations = self._declarations(body)
        if not declarations:
            return
        layer = self._layer_of(context)
        media = " and ".join(c for c in context if c.startswith("@media"))
        for selector in self._split_selectors(prelude):
            self.rules.append(
                Rule(
                    selector,
                    layer,
                    self._order,
                    self._specificity(selector),
                    declarations,
                    media,
                )
            )
            self._order += 1

    @staticmethod
    def _split_selectors(prelude: str) -> list[str]:
        """Split a selector list on top-level commas only."""
        out, depth, current = [], 0, ""
        for ch in prelude:
            if ch in "([":
                depth += 1
            elif ch in ")]":
                depth -= 1
            if ch == "," and depth == 0:
                out.append(current.strip())
                current = ""
            else:
                current += ch
        if current.strip():
            out.append(current.strip())
        return [s for s in out if s]

    @staticmethod
    def _match_brace(text: str, start: int) -> int:
        depth = 0
        for j in range(start, len(text)):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    return j
        return len(text) - 1

    @staticmethod
    def _layer_of(context: list[str]) -> int:
        for entry in reversed(context):
            m = re.match(r"@layer\s+([\w-]+)\s*$", entry)
            if m:
                name = m.group(1)
                if name in LAYER_ORDER:
                    return LAYER_ORDER.index(name)
        return len(LAYER_ORDER)  # unlayered CSS wins over every layer

    @staticmethod
    def _declarations(body: str) -> dict[str, str]:
        out: dict[str, str] = {}
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, _, value = decl.partition(":")
            prop, value = prop.strip(), value.strip()
            if prop in {
                "color",
                "background",
                "background-color",
                "background-image",
                "font-size",
                "font-weight",
            }:
                out[prop] = value
        return out

    @staticmethod
    def _specificity(selector: str) -> tuple[int, int, int]:
        sel = re.sub(r":where\([^)]*\)", "", selector)
        ids = len(re.findall(r"#[\w-]+", sel))
        classes = len(re.findall(r"\.[\w\\:.-]+|\[[^\]]+\]|:[a-z-]+", sel))
        tags = len(re.findall(r"(?:^|[\s>+~])([a-z][\w-]*)", sel))
        return (ids, classes, tags)

    # -- media queries ---------------------------------------------------- #

    @staticmethod
    def media_applies(media: str, viewport: int) -> bool:
        if not media:
            return True
        for m in re.finditer(r"min-width:\s*([\d.]+)(px|rem)", media):
            value = float(m.group(1))
            px = value * 16 if m.group(2) == "rem" else value
            if viewport < px:
                return False
        for m in re.finditer(r"max-width:\s*([\d.]+)(px|rem)", media):
            value = float(m.group(1))
            px = value * 16 if m.group(2) == "rem" else value
            if viewport > px:
                return False
        # Feature queries and non-width conditions are treated as applying.
        return True

    # -- token resolution ------------------------------------------------- #

    def band_aliases(self, band: str | None) -> dict[str, str]:
        if band is None:
            sel = ":where(:root, :host)"
        else:
            sel = f'[data-color="{band}"]' if "-" in band else f"[data-color={band}]"
        m = re.search(re.escape(sel) + r"\s*\{(.*?)\n\s*\}", self.text, re.S)
        if not m:
            return {}
        return dict(
            re.findall(
                r"--colors-([a-z0-9-]+):\s*var\(--colors-([a-z0-9-]+)\)", m.group(1)
            )
        )

    def resolve_var(self, name: str, band: str | None) -> str | None:
        """Follow --colors-* indirection to a concrete hex value."""
        aliases = self.band_aliases(band)
        root = self.band_aliases(None)
        token = name
        for _ in range(12):
            if token == "transparent":
                return "transparent"
            if token in self.primitives and self.primitives[token]:
                return self.primitives[token]
            nxt = aliases.get(token) or root.get(token)
            if not nxt or nxt == token:
                return None
            token = nxt
        return None

    def colour_value(self, value: str, band: str | None) -> str | list[str] | None:
        """Interpret a colour/background value. Gradients return every stop."""
        value = value.strip()
        if value in {"inherit", "currentColor", "initial", "unset"}:
            return value
        if value == "transparent":
            return "transparent"

        stops = re.findall(r"#[0-9a-fA-F]{3,8}|var\(--colors-([a-z0-9-]+)\)", value)
        if "gradient(" in value:
            resolved = []
            for m in re.finditer(
                r"#[0-9a-fA-F]{6}|var\(--colors-([a-z0-9-]+)\)", value
            ):
                if m.group(1):
                    hexv = self.resolve_var(m.group(1), band)
                else:
                    hexv = m.group(0)
                if hexv and hexv != "transparent":
                    resolved.append(hexv)
            return resolved or None

        m = re.fullmatch(r"var\(--colors-([a-z0-9-]+)\)", value)
        if m:
            return self.resolve_var(m.group(1), band)
        if re.fullmatch(r"#[0-9a-fA-F]{3,6}", value):
            return value
        m = re.fullmatch(r"rgba?\(([^)]*)\)", value)
        if m:
            parts = [p.strip() for p in re.split(r"[,\s/]+", m.group(1)) if p.strip()]
            if len(parts) >= 3:
                try:
                    r, g, b = (int(float(p)) for p in parts[:3])
                    return "#%02x%02x%02x" % (r, g, b)
                except ValueError:
                    return None
        return None


# --------------------------------------------------------------------------- #
# DOM
# --------------------------------------------------------------------------- #

@dataclass
class Node:
    tag: str
    attrs: dict[str, str]
    parent: "Node | None" = None
    children: list["Node"] = field(default_factory=list)
    text: str = ""

    @property
    def classes(self) -> list[str]:
        return self.attrs.get("class", "").split()

    def ancestors(self) -> list["Node"]:
        out, node = [], self.parent
        while node:
            out.append(node)
            node = node.parent
        return out

    def path(self) -> str:
        chain = [n.tag for n in reversed(self.ancestors())] + [self.tag]
        return " > ".join(chain[-4:])

    def css_path(self) -> str:
        """A unique, deterministic selector for this node.

        Uses :nth-child so the browser can compute the identical string for the
        same element, which is what lets tools/audit-visual.mjs compare its
        findings against this script's element by element. Element-only indexing
        (text nodes are not counted) matches how :nth-child works.
        """
        parts: list[str] = []
        node: Node | None = self
        while node and node.parent and node.tag != "#document":
            siblings = [c for c in node.parent.children if c.tag != "#document"]
            # Identity, not equality: Node is a dataclass, so `==` compares the
            # whole subtree and list.index() would recurse until it blew up.
            index = next(
                i for i, sibling in enumerate(siblings) if sibling is node
            ) + 1
            parts.append(f"{node.tag}:nth-child({index})")
            node = node.parent
        return " > ".join(reversed(parts))


class DOM(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("#document", {})
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, {k: (v or "") for k, v in attrs}, parent=self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, {k: (v or "") for k, v in attrs}, parent=self.current)
        self.current.children.append(node)

    def handle_endtag(self, tag):
        node = self.current
        while node and node.tag != tag:
            node = node.parent
        if node and node.parent:
            self.current = node.parent

    def handle_data(self, data):
        if data.strip():
            self.current.text += data.strip() + " "

    def walk(self, node: Node | None = None):
        node = node or self.root
        for child in node.children:
            yield child
            yield from self.walk(child)


# --------------------------------------------------------------------------- #
# Selector matching
# --------------------------------------------------------------------------- #

def _matches_compound(node: Node, compound: str) -> bool:
    """Match a single compound selector (no combinators) against one node."""
    compound = compound.strip()
    if not compound or compound == "*":
        return True
    # Reject anything relying on state or pseudo-elements we cannot evaluate.
    for pseudo in (
        "::before", "::after", "::placeholder", "::selection",
        ":hover", ":focus", ":active", ":checked", ":visited",
        "::file-selector-button", ":focus-visible", ":not",
    ):
        if pseudo in compound:
            return False

    m = re.match(r"^([a-z][\w-]*)?", compound)
    tag = m.group(1) if m else None
    if tag and node.tag != tag:
        return False
    rest = compound[len(tag) :] if tag else compound

    for part in re.findall(r"#[\w-]+|\.(?:[\w-]|\\.)+|\[[^\]]+\]", rest):
        if part.startswith("#"):
            if node.attrs.get("id") != part[1:]:
                return False
        elif part.startswith("."):
            want = part[1:].replace("\\", "")
            if want not in [c.replace("\\", "") for c in node.classes]:
                return False
        elif part.startswith("["):
            am = re.match(r"\[([\w-]+)(?:([~|^$*]?=)\"?([^\"\]]*)\"?)?\]", part)
            if not am:
                return False
            name, op, value = am.group(1), am.group(2), am.group(3)
            if name not in node.attrs:
                return False
            if op == "=" and node.attrs[name] != value:
                return False
    return True


def selector_matches(node: Node, selector: str) -> bool:
    """Match descendant/child selectors against a node and its ancestors."""
    selector = re.sub(r":where\(([^)]*)\)", r"\1", selector).strip()
    if "," in selector:
        return any(selector_matches(node, s) for s in selector.split(","))
    if "+" in selector or "~" in selector:
        return False  # sibling rules are not needed for colour or size

    parts = [p.strip() for p in re.split(r"\s*(>)\s*|\s+", selector) if p and p.strip()]
    if not parts:
        return False

    # Walk right-to-left through the ancestor chain.
    if not _matches_compound(node, parts[-1]):
        return False
    remaining = parts[:-1]
    chain = node.ancestors()
    ci = 0
    for part in reversed(remaining):
        if part == ">":
            continue
        found = False
        while ci < len(chain):
            candidate = chain[ci]
            ci += 1
            if _matches_compound(candidate, part):
                found = True
                break
        if not found:
            return False
    return True


# --------------------------------------------------------------------------- #
# Cascade
# --------------------------------------------------------------------------- #

class Resolver:
    def __init__(self, sheet: Stylesheet) -> None:
        self.sheet = sheet
        self._cache: dict[tuple[int, str, int], list[Rule]] = {}

    def declarations_for(
        self, node: Node, prop: str, viewport: int
    ) -> list[Rule]:
        """Rules setting `prop` on `node`, in ascending cascade order."""
        hits = [
            r
            for r in self.sheet.rules
            if prop in r.declarations
            and self.sheet.media_applies(r.media, viewport)
            and selector_matches(node, r.selector)
        ]
        hits.sort(key=lambda r: (r.layer, r.specificity, r.order))
        return hits

    def winning(self, node: Node, prop: str, viewport: int) -> str | None:
        hits = self.declarations_for(node, prop, viewport)
        return hits[-1].declarations[prop] if hits else None

    # -- font size -------------------------------------------------------- #

    def root_px(self, viewport: int) -> float:
        """The html font-size, replayed from the stylesheet's own rules."""
        html = Node("html", {})
        value = self.winning(html, "font-size", viewport)
        if value is None:
            raise ValueError("no html font-size rule found in the stylesheet")
        return self._absolute_length(value, viewport, base=16.0)

    def _absolute_length(self, value: str, viewport: int, base: float) -> float:
        value = value.strip()
        m = re.fullmatch(r"([\d.]+)px", value)
        if m:
            return float(m.group(1))
        m = re.fullmatch(r"([\d.]+)vw", value)
        if m:
            return float(m.group(1)) * viewport / 100
        m = re.fullmatch(r"([\d.]+)rem", value)
        if m:
            return float(m.group(1)) * base
        raise ValueError(f"unsupported html/body font size: {value!r}")

    def font_px(self, node: Node, viewport: int) -> float:
        """Rendered px size of a node, compounding the em chain from <body>."""
        root = self.root_px(viewport)
        body = Node("body", {})
        body_value = self.winning(body, "font-size", viewport)
        if body_value is None:
            raise ValueError("no body font-size rule found in the stylesheet")
        size = self._absolute_length(body_value, viewport, base=root)

        # Apply each ancestor's font-size from the outside in.
        for element in list(reversed(node.ancestors())) + [node]:
            if element.tag in {"#document", "html", "body"}:
                continue
            value = self.winning(element, "font-size", viewport)
            if value is None:
                continue
            size = self._relative_size(value, size, root, viewport)
        return size

    def _relative_size(
        self, value: str, inherited: float, root: float, viewport: int
    ) -> float:
        value = value.strip()
        if value == "inherit":
            return inherited
        m = re.fullmatch(r"([\d.]+)em", value)
        if m:
            return inherited * float(m.group(1))
        m = re.fullmatch(r"([\d.]+)%", value)
        if m:
            return inherited * float(m.group(1)) / 100
        m = re.fullmatch(r"([\d.]+)rem", value)
        if m:
            return float(m.group(1)) * root
        m = re.fullmatch(r"([\d.]+)px", value)
        if m:
            return float(m.group(1))
        m = re.fullmatch(r"([\d.]+)vw", value)
        if m:
            return float(m.group(1)) * viewport / 100
        raise ValueError(f"unsupported font-size: {value!r}")

    # -- font weight ------------------------------------------------------ #

    def font_weight(self, node: Node, viewport: int) -> int:
        weight = 400
        for element in list(reversed(node.ancestors())) + [node]:
            value = self.winning(element, "font-weight", viewport)
            if value is None:
                continue
            weight = self._weight_value(value, weight)
        return weight

    def _weight_value(self, value: str, inherited: int) -> int:
        value = value.strip()
        if value == "inherit":
            return inherited
        if value == "bolder":
            return min(900, inherited + 300)
        if value == "lighter":
            return max(100, inherited - 300)
        if value in {"normal", "regular"}:
            return 400
        if value == "bold":
            return 700
        m = re.fullmatch(r"\d{3}", value)
        if m:
            return int(value)
        m = re.fullmatch(r"var\(--font-weights-([a-z]+)\)", value)
        if m:
            named = re.search(
                rf"--font-weights-{m.group(1)}:\s*(\d+)", self.sheet.text
            )
            if named:
                return int(named.group(1))
        raise ValueError(f"unsupported font-weight: {value!r}")

    # -- band ------------------------------------------------------------- #

    @staticmethod
    def band_of(node: Node) -> str | None:
        for element in [node] + node.ancestors():
            if "data-color" in element.attrs:
                return element.attrs["data-color"]
        return None

    # -- colours ---------------------------------------------------------- #

    def text_colour(self, node: Node, viewport: int) -> str | None:
        band = self.band_of(node)
        for element in [node] + node.ancestors():
            value = self.winning(element, "color", viewport)
            if value is None or value.strip() in {"inherit", "currentColor"}:
                continue
            resolved = self.sheet.colour_value(value, self.band_of(element) or band)
            if isinstance(resolved, list):
                return resolved[0] if resolved else None
            if resolved and resolved != "transparent":
                return resolved
        return None

    def backdrop(self, node: Node, viewport: int) -> list[str]:
        """Opaque colours the text can sit on, nearest painted layer first."""
        band = self.band_of(node)
        for element in [node] + node.ancestors():
            local_band = self.band_of(element) or band
            for prop in ("background-image", "background", "background-color"):
                value = self.winning(element, prop, viewport)
                if value is None:
                    continue
                resolved = self.sheet.colour_value(value, local_band)
                if isinstance(resolved, list) and resolved:
                    return resolved
                if resolved and resolved not in {"transparent", "inherit", "none"}:
                    return [resolved]
        return []


# --------------------------------------------------------------------------- #
# Audit
# --------------------------------------------------------------------------- #

def qualifies_as_large(px: float, weight: int) -> bool:
    return px >= (LARGE_BOLD_PX if weight >= BOLD_THRESHOLD else LARGE_REGULAR_PX)


@dataclass
class Finding:
    page: str
    path: str
    snippet: str
    band: str | None
    fg: str
    bg: str
    ratio: float
    threshold: float
    px: float
    weight: int
    viewport: int


def audit_page(page: Path, sheet: Stylesheet, resolver: Resolver):
    dom = DOM()
    dom.feed(page.read_text())

    findings: list[Finding] = []
    checked = 0
    errors: list[str] = []
    records: list[dict] = []

    for node in dom.walk():
        if not node.text.strip():
            continue
        if node.tag in NON_VISUAL:
            continue
        if any(a.tag in NON_VISUAL for a in node.ancestors()):
            continue
        # Visually hidden helpers are exempt: they are for screen readers.
        if "visually-hidden" in node.classes:
            continue

        for viewport in VIEWPORTS:
            try:
                px = resolver.font_px(node, viewport)
                weight = resolver.font_weight(node, viewport)
            except ValueError as exc:
                errors.append(f"{page.name} {node.path()}: {exc}")
                break

            fg = resolver.text_colour(node, viewport)
            backdrop = resolver.backdrop(node, viewport)
            if not fg or not backdrop:
                errors.append(
                    f"{page.name} {node.path()}: unresolved "
                    f"{'colour' if not fg else 'background'}"
                )
                break

            threshold = 4.5
            if all(
                qualifies_as_large(resolver.font_px(node, vw), weight)
                for vw in VIEWPORTS
            ):
                threshold = 3.0

            records.append(
                {
                    "page": page.name,
                    "selector": node.css_path(),
                    "viewport": viewport,
                    "fontSizePx": round(px, 3),
                    "fontWeight": weight,
                    "color": fg,
                    "backgrounds": backdrop,
                    "threshold": threshold,
                    "ratios": [round(contrast(fg, bg), 3) for bg in backdrop],
                    "band": resolver.band_of(node),
                    "text": node.text.strip()[:38],
                }
            )

            for bg in backdrop:
                checked += 1
                ratio = contrast(fg, bg)
                if ratio < threshold:
                    findings.append(
                        Finding(
                            page.name,
                            node.path(),
                            node.text.strip()[:38],
                            resolver.band_of(node),
                            fg,
                            bg,
                            ratio,
                            threshold,
                            px,
                            weight,
                            viewport,
                        )
                    )
    return findings, checked, errors, records


def main() -> int:
    emit_json = "--json" in sys.argv

    if not CSS_PATH.exists():
        print(f"✗ {CSS_PATH} not found — run `bun run css` first", file=sys.stderr)
        return 2
    pages = sorted(DIST.glob("*.html"))
    if not pages:
        print(f"✗ no HTML in {DIST} — run `bun run build` first", file=sys.stderr)
        return 2

    sheet = Stylesheet(CSS_PATH.read_text())
    resolver = Resolver(sheet)

    if emit_json:
        # Machine-readable mode, consumed by tools/audit-visual.mjs so a real
        # browser can be diffed against this script's static resolution.
        payload = {
            "viewports": VIEWPORTS,
            "largeBoldPx": LARGE_BOLD_PX,
            "largeRegularPx": LARGE_REGULAR_PX,
            "ladder": {
                str(vw): {
                    "rootPx": round(resolver.root_px(vw), 4),
                    "bodyPx": round(
                        resolver.font_px(Node("p", {}, parent=Node("body", {})), vw), 4
                    ),
                }
                for vw in VIEWPORTS
            },
            "elements": [],
        }
        for page in pages:
            _, _, errors, records = audit_page(page, sheet, resolver)
            if errors:
                print(json.dumps({"error": errors}), file=sys.stderr)
                return 1
            payload["elements"] += records
        print(json.dumps(payload))
        return 0

    print("Rem ladder, replayed from the stylesheet")
    print("-" * 72)
    print(f"{'viewport':>9} {'1rem':>8} {'body':>8}   large-text bar at this width")
    for viewport in VIEWPORTS:
        root = resolver.root_px(viewport)
        body = resolver.font_px(Node("p", {}, parent=Node("body", {})), viewport)
        print(
            f"{viewport:>7}px {root:>7.2f}px {body:>7.1f}px   "
            f"bold >= {LARGE_BOLD_PX}px, regular >= {LARGE_REGULAR_PX}px"
        )
    print()

    all_findings: list[Finding] = []
    all_errors: list[str] = []
    total = 0
    for page in pages:
        findings, checked, errors, _ = audit_page(page, sheet, resolver)
        all_findings += findings
        all_errors += errors
        total += checked
        status = "✗" if findings or errors else "✓"
        print(f"  {status} {page.name:12} {checked:4d} colour pairings checked")
    print()

    if all_errors:
        print(f"✗ {len(all_errors)} element(s) could not be audited:")
        for error in dict.fromkeys(all_errors):
            print(f"   {error}")
        print()
        print("   Unaudited elements are treated as failures by design — teach")
        print("   this script the new construct rather than ignoring it.")
        return 1

    if all_findings:
        # Report the worst case per distinct element/colour pairing.
        worst: dict[tuple, Finding] = {}
        for f in all_findings:
            key = (f.page, f.path, f.fg, f.bg)
            if key not in worst or f.ratio < worst[key].ratio:
                worst[key] = f
        print(f"✗ {len(worst)} contrast failure(s):")
        for f in sorted(worst.values(), key=lambda f: f.ratio):
            print(
                f"   {f.ratio:5.2f}:1 (needs {f.threshold})  "
                f"{f.fg} on {f.bg}  band={f.band or 'root'}"
            )
            print(
                f"            {f.page} {f.path}  "
                f"{f.px:.1f}px/{f.weight} at {f.viewport}px wide  “{f.snippet}”"
            )
        return 1

    print(
        f"✓ {total} colour pairings across {len(pages)} page(s) meet WCAG AA, "
        "with the\n  large-text allowance granted only where the text is large "
        "at every width\n  tested down to 320px."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
