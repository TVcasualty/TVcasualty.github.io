# tvcasualty.github.io

Personal portfolio for **Jorge Casal**, live at <https://tvcasualty.github.io/>.

Static site built with **Bun**, **Hono JSX** and **Panda CSS**. Pages are Hono
routes pre-rendered to plain HTML at build time by `toSSG()`; GitHub Pages has
no server runtime, so Hono never handles a production request. No client-side
framework and no third-party runtime dependencies — the only JavaScript that
reaches the browser is 2.1 KB (1.0 KB gzipped) that tints the navbar as it crosses
colour bands and settles scrolling onto band boundaries.

## Requirements

[Bun](https://bun.sh) 1.3.11 or newer. That's it.

## Running locally

```sh
bun install
bun run build      # needed once: generates styled-system/, site.css and nav.js
bun run dev        # http://localhost:4321
```

`bun run dev` serves `public/` directly and hot-reloads on save. It does **not**
regenerate CSS, so after editing anything under `src/styles/` or adding new
`css({...})` calls, re-run `bun run css` (or just `bun run build`) and reload.

### Scripts

| Script | Does |
| --- | --- |
| `bun run dev` | Local server on port 4321, with hot reload |
| `bun run build` | Full production build into `dist/` |
| `bun run preview` | Build, then serve `dist/` as Pages would |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run panda` | Panda codegen → `styled-system/` |
| `bun run css` | Panda cssgen → `public/styles/site.css` |
| `bun run clean` | Remove all generated output |

There are also two standalone Python tools (standard library only, no
dependencies):

```sh
python3 tools/check-contrast.py   # WCAG audit of every colour band
python3 tools/make-icons.py       # regenerate the favicon set and OG card
```

`check-contrast.py` reads the built stylesheet, resolves each band's tokens back
to hex, and exits non-zero if any text pairing drops below 4.5:1. Worth running
after touching `src/styles/theme/colors.ts`.

## Local visual audit

`tools/audit-visual.mjs` re-checks the built site in a real browser: it serves
`dist/` over HTTP, then asserts the rem ladder, per-element contrast, horizontal
overflow, the fixed navbar's band mirroring and the CSS-only mobile menu, and
writes full-page screenshots to `.screenshots/` (gitignored).

The footer's cross-origin embed gets an extra `*-footer.png` per page/width, and
those are the images to trust for it. Playwright's full-page capture cannot
composite an out-of-process iframe that sits outside the viewport, so the embed
reads as an empty box in the `index-*.png` / `404-*.png` shots no matter how
long it is given to load. The `-footer.png` element captures are taken with the
frame on-screen and loaded, so they show its real rendered content.

Its value is that it is a *second opinion*. `check-contrast.py` reimplements the
cascade to resolve colours and sizes; this script asks Chromium the same
questions via `getComputedStyle` and diffs the two answers, so a bug in either
one shows up as a disagreement instead of a confident pass.

It needs Chromium, which is a **machine-level prerequisite, not a project
dependency**. Playwright is deliberately absent from `package.json` and
`bun.lock`, so install it once in a scratch directory outside this repo:

```sh
mkdir -p ~/.cache/playwright-audit && cd ~/.cache/playwright-audit
npm init -y && npm i -D playwright@1.63.0
npx playwright install chromium
```

Then, from the repo:

```sh
bun run build
node tools/audit-visual.mjs
```

The script finds that install by path. Set `PLAYWRIGHT_DIR` if you put it
somewhere else. Expect harmless D-Bus noise on stderr
(`org.freedesktop.NetworkManager … ServiceUnknown`) on machines without
NetworkManager; append `2>/dev/null` to silence it.

**CI does not run this, on purpose.** The deploy workflow would have to download
a ~150 MB browser on every push to re-verify something that only changes when the
design changes, and a headless container cannot check the two things most worth a
human eye anyway: display-P3 wide-gamut colour (headless composites it down to
sRGB) and font smoothing (differs from a real desktop compositor). Run it locally
after touching `src/styles/`.

## Editing content

**All copy lives in `src/content/`.** Components contain no prose, so text
changes never require touching markup.

| File | Holds |
| --- | --- |
| `src/content/site.ts` | Name, role, tagline, URL, social links, nav items, OG defaults |
| `src/content/bands.ts` | Every band's copy: the Work cards, the Stack spec sheet, the Contact callout |

Two rules apply to anything added to `bands.ts`, and they are why the page no
longer lists projects or technologies:

1. **No named technologies, products, companies, clients or metrics.** Category
   words are fine; brand names date the page and turn it back into a checklist.
2. **No claim that cannot be met.** Writing sideways about real things is the
   goal; inventing specifics is not an improvement on stating stale ones.

`Card` and `SpecGrid` are general-purpose: `Card` still supports an optional
image and `live`/`source` buttons, and renders none of them when the content
omits them, which is how the Work band uses it.

To add a page: create it in `src/pages/`, register it in `src/app.tsx` **with a
trailing slash** (`/about/`) so it emits `dist/about/index.html`, and add its
path to `routes` in `src/content/site.ts` so it lands in the sitemap.

## Generated files — do not edit or commit

These are rebuilt from source on every build and are gitignored:

- `styled-system/` — Panda's `css()` function and token helpers
- `public/styles/site.css` — the compiled stylesheet
- `public/scripts/nav.js` — bundled from `src/client/nav.ts` (which imports
  `src/client/snap.ts`)
- `dist/` — the deployable site

The raster icons in `public/` are the exception: they're committed, but
regenerated by `python3 tools/make-icons.py` if the mark in `public/favicon.svg`
changes.

## Design notes

The design system is modelled on the mechanisms behind <https://play.date/> —
layout architecture, colour strategy and scaling technique only. No Panic
assets, fonts, images or copy are used. `BRIEF.md` documents the whole system.

Two things are load-bearing and worth understanding before changing CSS:

**Fluid rem scaling.** The root font size is driven by viewport width
(`0.909090909091vw`, i.e. `100vw / 110`), pinned to `10px` at ≥1100px. Every
length in the site is in `rem`, so the entire layout scales proportionally with
almost no per-component media queries. At desktop widths a `rem` reads as
"pixels ÷ 10". The design has exactly three breakpoints: 240, 670 and 1100px.

Two consequences of that, both of which have caused real bugs:

- A length that must **not** scale with the ladder has to be in `px` — tap
  targets and fixed-navbar clearance, for example. A `rem` value tuned at
  1440px silently shrinks to a third of itself on a phone.
- Inside `globalCss`, Panda's breakpoint conditions (`md:`) and array fallback
  values do **not** resolve — `md:` is dropped and `['100vh', '100dvh']` emits
  `0: 100vh; 1: 100dvh`. Use the raw `@media screen and (min-width: 670px)`
  block that already exists there, and express a cascade fallback as a nested
  `'&'`. Both work normally in `css()` calls in components.

**Colour bands.** The page is a stack of full-bleed bands, each carrying
`data-color`. Panda conditions turn that attribute into a rebinding of the
`--colors-*` variables, so buttons, cards and text recolour automatically from
context — two elements with identical classes render different colours in
different bands. `src/client/nav.ts` mirrors the active band's `data-color` onto
`<html>` and `#navbar`, which is how the navbar stays legible while scrolling.

Typography deliberately never italicises: `<em>` renders bold and upright.

Colour choices are constrained by contrast, not taste: every band clears 4.5:1
for text. Notably the gray band uses `darkGray` rather than the lighter
`psdDarkGray` the brief specified, because the latter only reached 4.00:1
against white and failed the hero's own lede.

### Deviations from BRIEF.md

`BRIEF.md` is the original design document and is deliberately not rewritten as
the site evolves. Where the two disagree, this file is current:

- **No hero radial glow** (BRIEF §3.8 / §3.9). The `#hero::before`
  `radial-gradient` was removed; the gray band renders as a flat fill.
- **No email anywhere** (BRIEF §2). There is no `mailto:` link and no
  `site.email` field. Contact offers GitHub and LinkedIn only.
- **The owner's name appears only in the navbar.** `<meta name="author">` and
  `og:site_name` are not emitted.
- **No `<h1>` on the home page, and no About or Writing band.** All three are the
  owner's explicit choices. The hero is now an eyebrow plus the tagline, with no
  heading above it, so `index.html` ships zero `<h1>` elements — a deliberate
  departure from §6's "one `<h1>` per page", flagged rather than discovered:
  screen-reader users who navigate by heading level lose the page's entry point,
  and search engines lose the strongest on-page signal. `404.html` still has its
  `<h1>`. The About and Writing bands, and the `bio` and `writing` copy behind
  them, were deleted outright, following the precedent set when `projects.ts` was
  removed. Their nav entries went with them, so no anchor points at a missing
  band.
- **The footer is a live third-party embed, full-bleed and capped below the framed
  page's own footer.** The band is a single `<iframe>` of `misfitscentral.com` at
  `min(100vh, 810px)`, spanning edge to edge with no border, radius, gutter or
  caption — the band's own padding and its `.band-inner` 110rem measure are both
  cancelled for this one band, so it reads as if the framed site were coded
  natively into the page rather than boxed as a widget. The wordmark, blurb,
  Sections nav, Elsewhere social list and copyright line are all gone, site-wide
  (the home page and the 404 share one footer). Verified in Chromium rather than by
  header inspection alone — clean `X-Frame-Options` does not rule out in-page
  frame-busting.

  **The 810px cap hides the framed site's own footer,** so the band does not read
  as one page's footer stacked on another's. It cannot be done by styling: a
  different origin's DOM is opaque, so no selector or script here can reach
  `div.footer`, and the only lever is how much of the framed document is ever
  visible. That means the cap *plus* `scrolling="no"` on the iframe — a deprecated
  HTML4 attribute, kept because its modern replacement (`overflow: hidden` on the
  framed root) is exactly what the cross-origin boundary forbids. Either one alone
  leaves the footer reachable.

  810 is measured off the live page's computed styles and identical at 390/720/1440
  (the framed layout is fixed-width): the pumpkin ends at 808, `div.footer`'s box
  begins at 818, and its first text sits at 908. The usable window is 808–817 —
  below it the cap slices the pumpkin, above it the footer's box shows. This gives
  up the decorative skull row at 818–908, which is only visible as `div.footer`'s
  background: keeping it would mean admitting that element's box, so any later
  change to its padding would walk the footer's text into view.

  **There is deliberately no fallback link, and it has a known cost.** A visible
  link to the same URL used to ship beside the frame, precisely because an embed
  of a site this repo does not control can go blank or start refusing to be framed
  at any time. It was removed on the owner's explicit instruction, native-embed
  look over safety net. If the embed breaks, the band renders as an empty dark
  screen and nothing on the page says what was meant to be there.

  **Known artifact, accepted:** the framed page is a fixed-width ~720px layout
  that does not reflow, so below a 720px viewport the bleed cuts it off mid-column
  — text is sliced mid-word at the right edge (measured: 330px lost at 390px,
  400px at 320px). This is inherent to full-bleed at a viewport narrower than the
  framed document, not a CSS bug, and it is the reason the previous contained
  version kept a gutter. The height cap neither causes nor cures it; it is purely
  a width effect.

  **The footer band is `black`, not `darkgray`, so the embed has no visible
  edge.** The framed page's background measures pure `#000000` at every edge of
  the frame (read off rendered pixels, not inferred from its CSS), so putting the
  band on the `black` token makes the band background, the iframe's own base
  colour and the framed document one continuous colour — the strip described
  below still exists geometrically but cannot be located by eye. On `darkgray` it
  showed as a warm `#1d1c18` seam framing the embed. Two things follow from the
  same measurement and are easy to miss: the iframe's own `backgroundColor` is
  `pageBg` rather than `cardBg`, because `cardBg` on a black band resolves to
  `#1d1c18` and would flash that warm gray on every load before the lazy frame
  paints; and the bottom stop of `<html>`'s overscroll gradient in `global.ts` is
  `black` rather than `darkestGray`, since that gradient hard-codes the first and
  last band's colours for rubber-band overscroll before `nav.js` boots.

  **Second known artifact, now invisible rather than merely accepted:** above an
  810px viewport height the band's `min-height: 100dvh` floor keeps growing while
  the frame stops, and because the band centres its content the slack is split
  evenly above and below the embed (at 1440px wide: 45px each side at a 900px
  viewport, 315px each at 1440px). Below 810px there is no strip at all. The only
  alternative is letting the frame grow to fill the band, which is what would
  expose the framed footer again — so the strip stays, but since the band is
  `black` it is the same colour as the embed and reads as nothing. Verified by
  sampling rendered pixel rows across the frame's edges at four page/width/height
  combinations: every strip row is pure `#000`, with a control that forces the
  band back to `darkgray` and does report `rgb(29,28,24)`, so the check is not
  vacuous. Recolouring this band reintroduces the seam.
- **Work is an `aqua-light` band, not `yellow`.** Band order is now hero (gray) →
  Work (aqua-light) → Stack (yellow) → Contact (purple) → footer (black);
  still no two adjacent bands sharing a colour (§3.3). The `white` and `aqua`
  bands remain defined-but-unused in `colors.ts`, which is deliberate — the
  tokens are complete for all eight bands so a band can be recoloured by changing
  one prop, which is exactly what moving the footer to `black` did.
- **Bands are at least one viewport tall from 670px up**, centred vertically,
  including the hero and the footer. Below 670px the floor is dropped and bands
  size to their content: on a phone a one-viewport minimum stranded the short
  bands (Contact, footer) in a screenful of empty colour. The floor is
  `min-height`, never `height` — Work and Stack legitimately exceed it.
- **Band side padding has a px floor.** `.colorsection` keeps `2rem` horizontal
  padding for the ladder to scale, with `max(2rem, 16px)` layered under it. In
  rem alone the gutter fell to 7.1px at 390px and 5.8px at 320px, running the
  copy nearly to the bezel; the floor only engages below ~880px, so desktop is
  untouched.

### Band-to-band magnetic scrolling

`src/client/snap.ts` makes the page settle onto band boundaries: when scrolling
stops, if a nearby position would line a band up with the screen, it glides the
rest of the way. Bundled into `nav.js` alongside the navbar tinting.

**It is script rather than three lines of CSS because the CSS does not work
here.** `scroll-snap-type: y mandatory` on `html` with `scroll-snap-align: start`
on `.colorsection` was implemented first. It resolves each gesture to the
*nearest* snap position, so a gesture proposing less than half a viewport is
returned to where it started — and with viewport-tall bands that midpoint is
450px at 1440×900 against a ~120px wheel notch. The page reads as frozen: eight
consecutive notches leave `scrollY` at 0, while the same gestures with
`scroll-snap-type: none` move 120px each. It reproduces on a bare page of five
`100vh` sections, and it is Chrome's documented "hidden scroll-snap threshold",
not a quirk of this stylesheet. `proximity` is not a fix; it fights small scrolls
near an edge for the same reason. Keyboard paging and anchor links worked fine
under `mandatory` — the defect is specific to small, deliberate wheel increments,
which is most scrolling.

The script never calls `preventDefault` and never consumes an event. It acts only
after the scroll has come to rest, which is what makes it structurally incapable
of the trap above. Five rules, each of which exists because dropping it broke
something measurable:

1. **Stops come from content, not band boxes.** A band's box can exceed the
   viewport purely through its own `8rem` bottom padding — Work measures 980px
   against a 900px viewport, 80px of it padding — and a stop at a padding edge
   reveals nothing. Using box edges put a stop 13px from a band top at 800×700,
   where one wheel notch moved the page 13px.
2. **A band whose content overflows gets a second, bottom-aligned stop.** At
   1440×900 Stack's copy ends 87px below what its top-aligned stop can show;
   without a stop at `contentBottom − innerHeight` those 87px are unreachable,
   because the magnet keeps pulling the reader back to the band top. This mirrors
   CSS scroll snap, where a snap area larger than the snapport may rest at either
   edge.
3. **A pull never lands behind where the gesture began.** It may move backwards
   *within* a gesture, which is what tidies an overshoot, but never behind its own
   start — so progress is monotonic by construction.
4. **Forward pulls commit only past the midpoint** between the two stops the
   reader is between, measured per gap so it scales with band height. Half a gap
   (420px at 1440×900) is the furthest the page can move forwards on its own, and
   a deliberate one- or two-notch nudge is left alone.
5. **Backward pulls are capped separately, at 0.15 of a viewport.** Forward is
   the magnet; backward only tidies a small overshoot. Sharing rule 4 made it
   misbehave wherever two stops sit close together — a band's top and end-aligned
   stops are 87px apart at 1440×900 — so an ordinary 4-notch run from the band top
   landed between the near stop and the distant next one and was dragged 393px
   *backwards*. The separate cap takes the worst backward movement to 33px while
   still tidying every overshoot, costing three flush landings out of thirty.

Gated off below 670px, matching the breakpoint where `.colorsection` loses its
one-viewport floor: on a phone bands size to their own content, so their edges
have no relationship to the screen and there is nothing to snap to. Also off
under `prefers-reduced-motion: reduce`, read live so it responds mid-session.
Suppressed for 400ms after `focusin` or `hashchange`, extended by each scroll
event that arrives while it is already active — the nav's smooth anchor scrolls
measured 541/784/987ms at 1440×900, so a fixed window would expire mid-animation
and let the tail of the browser's own scroll read as a new gesture. Measured
consequence: the first wheel gesture immediately after a Tab does not snap, and
it recovers on the next one, or after a ~400ms pause.

**Rejected, measured:** always advancing to the next stop. It lands flush every
single time and gives the "one gesture, one band" pager feel, but it moves the
page 780px for a 120px notch and makes every `ArrowDown` jump a whole band, which
for anyone reading slowly or zoomed in is worse than no effect at all.

Verified against the built bundle rather than an injected prototype: no stop can
be entered without a way out, every band's last line of copy stays reachable at
1440×900/700/500, 1280×800, 1024×768 and 800×700, anchors land exactly where
`:target { scroll-margin-top: 4em }` puts them (114px of clearance at 1440px,
identical with the script stubbed out), `End`/`Home` reach the true extremes, the
skip link is not stolen, no focused element is pulled off screen across 12 tab
stops, and wheeling over the cross-origin footer embed still snaps the parent.

**A related trap, still present and deliberately unfixed.** `overflow-x: hidden` is
set on `html, body` in `global.ts`. On `body` that computes `overflow-y` to `auto`,
making body a scroll container — so a `scroll-snap-type` on `html` silently applies
to nothing at all, with every computed style still looking correct. That rule is
marked "required, not defensive" and is left alone, because the script reads
`window.scrollY` and is unaffected. Anyone reaching for CSS snapping again will hit
this first, and must move the clip to `html` alone before the CSS does anything.

## Deployment

Push to `master` and `.github/workflows/deploy.yml` does the rest: install →
`panda codegen` → `tsc --noEmit` → `bun run build` → upload `dist/` → deploy.
Codegen has to precede the typecheck, because `styled-system/` doesn't exist in
a fresh checkout until it runs. A failing typecheck fails the deploy.

`dist/` is never committed — the workflow builds it from source.

### One-time manual setup

**In Settings → Pages, set _Source_ to "GitHub Actions"** (not "Deploy from a
branch"). Until that's switched, pushes will build successfully but the live
site won't update. Using a custom Actions workflow also exempts the site from
the 10-builds-per-hour soft limit.

## History

`master` previously held only compiled Gatsby build output, with source on
`gh-pages` — an inverted layout that this rebuild corrects. All 148 pre-rebuild
commits across all five branches are preserved in annotated `archive/*` tags
plus an offline bundle; see `ARCHIVE.md`. Don't delete those tags.
