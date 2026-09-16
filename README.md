# tvcasualty.github.io

Personal portfolio for **Jorge Casal**, live at <https://tvcasualty.github.io/>.

Static site built with **Bun**, **Hono JSX** and **Panda CSS**. Pages are Hono
routes pre-rendered to plain HTML at build time by `toSSG()`; GitHub Pages has
no server runtime, so Hono never handles a production request. No client-side
framework and no third-party runtime dependencies — the only JavaScript that
reaches the browser is ~0.6 KB that tints the navbar as it crosses colour bands.

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
| `src/content/bands.ts` | Every band's copy: the Work cards, the About bio, the Stack spec sheet, the Writing and Contact callouts |

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
- `public/scripts/nav.js` — compiled from `src/client/nav.ts`
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
  `site.email` field. Contact offers GitHub and LinkedIn only, which are also
  the only two entries in the footer's "Elsewhere" column — CodePen and the
  legacy `jorgecasal` GitHub link are gone, so the question of which GitHub
  account to feature is settled.
- **The owner's name appears only in the navbar.** The hero `<h1>` carries a
  sentence rather than the name, and `<meta name="author">` / `og:site_name`
  are not emitted.
- **Bands are at least one viewport tall from 670px up**, centred vertically,
  including the hero and the footer. Below 670px the floor is dropped and bands
  size to their content: on a phone a one-viewport minimum stranded the short
  bands (Writing, Contact, footer) in a screenful of empty colour. The floor is
  `min-height`, never `height` — Work and Stack legitimately exceed it.
- **The hero `<h1>` is sized locally** (`3em`) rather than by the global `1.8em`,
  which was smaller than the `2em` lede beneath it. The global `h1` is
  unchanged, because it also sets the 404's heading.

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
