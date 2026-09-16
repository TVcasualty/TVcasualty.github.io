# BRIEF — Rebuild of tvcasualty.github.io

**Owner:** Jorge Casal (GitHub: `TVcasualty`, also `jorgecasal`)
**Repo:** `github.com/TVcasualty/TVcasualty.github.io`
**Live URL:** https://tvcasualty.github.io/
**Stack:** Bun + Hono + TypeScript (Hono JSX, pre-rendered to static HTML via `hono/ssg`)
**Design language:** modelled on https://play.date/ (Panic's Playdate site)
**Date:** 2026-09-16

---

## 1. Situation: what is actually in the repo today

The repository is in an unusual state. Findings from a full audit:

| Branch | Contents |
| --- | --- |
| `master` (default, and what Pages serves) | **Compiled Gatsby build output only.** No source. 100+ hashed webpack chunks, `.js.map` files, `workbox-v4.3.1/`, `page-data/`, `sw.js`. |
| `gh-pages` | **The real source.** A Gatsby v2 site based on the `gatsby-starter-overflow` template (HTML5 UP "Overflow"). |
| `source` | Stale — a committed `.cache/` directory from a Gatsby dev run. Junk. |
| `notmaster` | Another copy of built output. Junk. |
| `light/dark` | An older, unrelated hand-written HTML/CSS/JS portfolio (`index.html`, `style.css`, `blue.css`, `JorgeCasal.pdf`). Has a light/dark theme toggle. |

Other facts:

- Last commit to any branch: **2021-03-12**. The site is 5 years stale.
- `.git` is **237 MB** (`size-pack: 235.8 MiB`) — almost entirely the four project GIFs plus every hashed webpack chunk ever committed.
- The four project GIFs total **~26 MB** on disk (`project02` alone is 9.8 MB).
- The old deploy flow was inverted and manual: `npm run deploy` → `gatsby build && gh-pages -d public -b master`. So source lived on `gh-pages` and build output was pushed to `master`. This is the reverse of every convention and is the root cause of the confusion.
- The Gatsby config carried a **broken `pathPrefix`**: `'/jorgecasal.github.io/jorgecasal.github.io'`. Harmless on a user site served from root, but it polluted the manifest `start_url`.
- The contact form used **EmailJS with the service ID, template ID and public user key hardcoded in client-side source**, therefore present in the public bundle.

### Recovered content inventory (from `gh-pages`)

Preserved here so nothing is lost, even though the rebuild starts with fresh content.

- **Hero:** `Jorge Casal` / `Software Developer` / CTA button "about"
- **Banner:** heading `innovating solutions`; copy: *"With a track record of taking web applications from the mind ➜ to development with my team ➜ to production. (YES! always a team player) Proficient with modern web technologies and highly adaptable to any business requirements."*
- **Skills** (`SKILLS` / `full stack js dev`), 8 items, each with an inline Simple-Icons SVG: JavaScript, CSS, HTML, React, Node.js, Git, TypeScript, MongoDB
- **Projects** (4 cards, alternating left/right, each with a GIF, a "See Live" and a "Source Code" button):
  1. Reminders App — REACT/REDUX — `theremindersapp.herokuapp.com` — **DEAD (404)**
  2. Weather API — Express/api — `geolocationweatherapi.netlify.app` — live (200)
  3. Post to DB — Node/MongoDB — `post-to-database.herokuapp.com` — **DEAD (404)**
  4. Simplest ToDo — HTML/CSS/JS — `simplest-todo.netlify.app` — live (200)
- **Blog Repo** section → `code-repo.netlify.app` (live)
- **Contact** — EmailJS form (name, email, message)
- **Footer** — social icons via FontAwesome 4: GitHub `jorgecasal`, CodePen `jorgecasal`, email `casaldelacruz@gmail.com`, LinkedIn `in/casaljorge`
- **Other pages:** `404` ("NOT FOUND" / "Not a valid URL"), `Element` (an unused template kitchen-sink page — discard)

---

## 2. Decisions taken (confirmed with owner)

1. **Bun + Hono SSG → static HTML.** GitHub Pages free tier serves static files only; there is no server runtime. Hono is still the framework: pages are Hono JSX routes, and `toSSG()` pre-renders them to HTML at build time. Verified working locally on Bun 1.3.11 + Hono 4.13.8.
2. **Repo layout flipped to convention.** Source on `master`; a GitHub Actions workflow runs the Bun build and publishes `dist/` to Pages. No build artifacts in source history ever again.
3. **Dead projects removed completely.** Not preserved, not stubbed.
4. **All four GIFs thrown away.** No conversion, no lazy-loading fallback.
5. **Content is fresh.** The old copy is *not* to be reproduced. Ship with a small, honest set of real content plus clearly-marked placeholders driven by a data file, so the owner can fill it in later without touching markup.
6. **No contact form.** Static hosting can't send mail, and a third-party key in the bundle is what the old site did wrong. Use a `mailto:` link plus social links.
7. **Typeface:** self-hosted **Plus Jakarta Sans** (SIL OFL 1.1), single variable woff2, weight axis 300–800. It is a geometric grotesk and is the closest freely-redistributable stand-in for Playdate's proprietary Roobert, which has the same weight ladder (300/400/500/700/800). Self-hosted so there is no Google Fonts request and no maintenance burden.
8. **Styling: Panda CSS** (`@pandacss/dev`), chosen by the owner. Panda emits a plain `.css` file at build time via static extraction and ships **no runtime JS**, which suits a fully static site: the atomic class names are baked into the HTML and nothing needs to hydrate. Its `semanticTokens` + `conditions` model also maps cleanly onto the per-band colour rebinding this design depends on. See §3.9 for the integration, including two verified gotchas.

---

## 3. Design system extracted from play.date

Taken from `colors.css`, `playdate.css`, `frontpage.css`, `navbar.css`, `frontpage.js`, `init.js`. Reimplement these mechanisms — do **not** copy Panic's stylesheets, images, SVG logos, fonts, or product copy.

> **Legal note.** Playdate, the Playdate logotype, Roobert, Panic's photography and Panic's copy are all proprietary. Take the *layout system, colour architecture, scaling technique and interaction patterns*. Write the CSS yourself. Ship zero Panic assets.

### 3.1 The fluid root-font scaling trick

This is the single most important thing to replicate. Every length in the design is expressed in `rem`, and the root font size is driven by viewport width:

```css
html { font-size: 2.4px; }                 /* floor, below 240px */
body { font-size: 4rem; }

@media screen and (min-width: 240px) {
  html { font-size: 0.909090909091vw; }    /* = 100vw / 110 — fluid */
  body { font-size: 3.85rem; }
}
@media screen and (min-width: 670px) {
  body { font-size: 2.85rem; }
}
@media screen and (min-width: 1100px) {
  html { font-size: 10px; }                /* ceiling — scaling stops */
}
```

Consequence: at ≥1100px viewport, `1rem === 10px`, so every `rem` value in the stylesheet reads as "pixels ÷ 10". Below 1100px the entire layout scales proportionally with the viewport with almost no per-component media queries. Breakpoints in the design are only **240px**, **670px** and **1100px**.

### 3.2 Colour tokens

Two layers. Layer 1 is a fixed palette; layer 2 is semantic aliases that get **re-bound per section**.

```css
:root {
  --darkest-gray:      #1d1c18;
  --psd-darkest-gray:  #212223;
  --screen-black:      #312f28;
  --dark-gray:         #57554e;
  --mid-gray:          #7e7b75;
  --psd-dark-gray:     #7a8085;
  --psd-mid-gray:      #64676c;
  --screen-white:      #b1afa8;
  --psd-light-gray:    #bbbbbb;
  --lightest-gray:     #f5f5f5;
  --psd-lightest-gray: #efefef;
  --white:             #ffffff;
  --black:             #000000;

  --brand-yellow: #ffc833;
  --red:          #ef5023;
  --readable-red: #ff6c42;
  --tomato-red:   #ff004e;
  --orange:       #ef5023;
  --purple:       #6c00ff;
  --muted-purple: #9d70db;
  --light-blue:   #a0d1ff;
  --light-green:  #90f8b7;
  --aqua:         #00a88a;
  --aqua-dark:    #127866;
  --aqua-light:   #21c6a9;
}
```

Wrap wide-gamut variants in `@supports (color: color(display-p3 1 1 1 / 1))` and re-declare the key tokens in `color(display-p3 …)` — this is what makes the yellow and purple pop on modern displays. At minimum do `--brand-yellow: color(display-p3 1 0.784 0.2)` and `--purple: color(display-p3 0.424 0 1)`.

Semantic layer:

```css
:root {
  --page-bg: …; --text: …; --link: …; --accent: …;
  --subtle: …; --subtler: …; --card-bg: …;
  --button-bg: var(--text); --button-text: var(--card-bg);
}
```

### 3.3 Colour sections (the signature move)

The page is a vertical stack of full-bleed bands. Each band carries `class="colorsection section--<name>"` and `data-color="<name>"`, and **rebinds the semantic variables**, so all descendants (including buttons) recolour automatically:

```css
.section--yellow, html[data-color="yellow"], #navbar.scrolled[data-color="yellow"] {
  --page-bg: var(--brand-yellow);
  --text: var(--screen-black);
  --button-bg: var(--purple);
  --button-text: var(--white);
}
.section--purple, html[data-color="purple"], #navbar.scrolled[data-color="purple"] {
  --page-bg: var(--purple);
  --text: var(--white);
  --button-bg: var(--brand-yellow);
  --button-text: var(--black);
}
/* likewise: white, black, gray, darkgray, aqua, aqua-light */
```

Bands used on play.date, in order: `gray` (hero) → `yellow` → `white` → `yellow` → `aqua-light` → `purple` → `darkgray`. Pick a comparable rhythm; never place two identical bands adjacent.

`html#frontpage` also carries a hard 50/50 `linear-gradient` background so overscroll at top and bottom shows the right colour.

### 3.4 Navbar

- `position: fixed`, `z-index: 101010`, full width, `background-color: transparent` by default.
- `transition-property: background-color; transition-duration: 250ms; ease-in-out`.
- On scroll, JS adds `.scrolled`, which gives it `--page-bg` and `border-bottom: 0.2rem solid var(--text)`.
- Inner `ul`: `display:flex`, `gap:.5em`, `max-width:130rem`, `margin: 0 auto`, `padding: 1rem`, `font-size: 0.77em`, `justify-content: space-between`.
- `li`: `font-weight: 700`, `letter-spacing: -0.0075em`, `border-radius: 1em`.
- `a { text-decoration: none }` with an `::after` pseudo-element for the hover affordance.
- Mobile menu is **CSS-only**: a `<label class="whopper" for="whopper">` + `<input type="checkbox" id="whopper">` + a `<div class="whopper">` holding the links. No JS. Copy this pattern.
- Guard deep links: `:target { scroll-margin-top: 4em; scroll-snap-margin-top: 4em; }` (the non-standard property is for Safari < 14.5).

### 3.5 Scroll-driven navbar colour (the only required JS)

```js
function updateNavColor() {
  const section = Array.from(document.querySelectorAll('[data-color]'))
    .filter(s => s.getBoundingClientRect().top - navbar.offsetHeight <= 0)
    .reverse()[0]
  if (section) {
    navbar.dataset.color = section.dataset.color
    document.documentElement.dataset.color = section.dataset.color
  }
}
addEventListener('scroll', updateNavColor, { passive: true })
addEventListener('resize', updateNavColor)
```

Find the last `[data-color]` band whose top has passed under the navbar, and mirror its colour onto both `#navbar` and `<html>`. Rewrite in TypeScript, add `{ passive: true }`, and rAF-throttle it.

### 3.6 Typography

```css
body    { font-family: 'Plus Jakarta Sans', Helvetica, sans-serif; }
h1      { font-size: 1.8em; font-weight: 800; margin: 0 0 .5em 0; }
section h2 { font-size: 2.4em; font-weight: 800; line-height: 1; margin: 6rem auto 3rem auto; }
section p  { font-size: 1em; line-height: 1.3em; }
a       { color: inherit; text-decoration: underline; }
strong, em { font-weight: 700; font-style: normal; }   /* em is NOT italic */
strong > em, em > strong { font-weight: 800; }
```

Hero lede: `font-size: 2em; font-weight: 700; line-height: 1.1em; max-width: 110rem; text-align: center`.

Playdate never italicises. `<em>` is rendered as bold. Keep that.

### 3.7 Buttons

Standard pill:

```css
div.button {
  display: inline-block; width: fit-content;
  border-radius: 1em;
  padding: .25em .7em .35em .7em;   /* note: asymmetric, optically centred */
  margin: 2rem auto;
  background-color: var(--button-bg);
  color: var(--button-text);
  text-align: center;
}
div.button a { text-decoration: none; font-weight: 700; }
div.button.big { font-size: 1.25em; }
div.button.center { display: block; }
```

Optional leading glyph via `div.button a::before` with `-webkit-mask-image` + `background-color: currentColor` — that's how they tint monochrome SVG icons to match the section. Use this for the social icons.

Hero "chunky plastic" CTA — worth replicating for the single primary action:

```css
#button-order a {
  font-size: 1.78em; font-weight: 700;
  padding: .1em .5em .3em .5em;
  border-radius: 3em;
  color: var(--white);
  background-image: linear-gradient(#9400ff, #5c00ff);
  text-shadow: 0 .02em .04em rgba(0,0,0,.4);
  box-shadow:
    inset 0  .05em .05em rgba(255,255,255,.6),  /* top highlight     */
    inset 0 -.05em .08em rgba(0,0,0,.5),        /* bottom inner shade */
    inset 0 -.01em .5em  rgba(255,255,255,.3),  /* bottom underlight  */
    0 .05em .1em rgba(0,0,0,.4);                /* cast shadow        */
  user-select: none;
}
#button-order a:active {
  padding: .15em .5em .25em .5em;               /* physically depresses */
  background-image: linear-gradient(#4a00d1, #7800ff);
  box-shadow:
    inset 0  .05em .15em rgba(0,0,0,.5),
    inset 0 -.03em .03em rgba(255,255,255,.6),
    0 .05em .2em rgba(0,0,0,.2);
}
```

The `:active` state shifts padding by `.05em` top/bottom so the label physically moves down. That detail is most of the charm.

### 3.8 Other patterns worth lifting

- **Radial glow behind the hero**: `header::before` with `background-image: radial-gradient(rgba(255,255,255,.5) 0, rgba(255,255,255,0) 50%, transparent 100%)`, sized `110rem × 110rem`, `top: -10rem`, `left: 50%`, `transform: translateX(-50%)`, `z-index: -1`.
- **Specs grid**: `#specs { display: grid; grid-template-columns: 1fr 1fr; max-width: 90rem; text-shadow: .1em .1em 0 var(--psd-darkest-gray) }`; each `.spec` is `display: inline-grid; grid-template-columns: 2fr 3fr` — right-aligned label, left-aligned `<ul>` of values. Collapses to `1fr` under 670px. Reuse for a skills / stack table.
- **Card grid**: `grid-template-columns: 1fr 1fr 1fr; grid-gap: 1rem; max-width: 107rem`, collapsing to `1fr` under 670px. Reuse for project cards.
- **Blob cluster** (`#clouds`): a `blockquote` with `border-radius: 50%` over ~10 absolutely-positioned `.cloudbit` circles sharing an `animation: blobble 5s infinite alternate ease-in-out` with staggered `animation-delay`. Gate the whole thing behind `@media (prefers-reduced-motion: no-preference)`. Nice-to-have.
- **Lazy images**: `class="lazy"` + `data-src`, swapped by an `IntersectionObserver` that removes the class on intersect, with a scroll-listener fallback. Modern replacement: native `loading="lazy" decoding="async"` plus explicit `width`/`height`. Use the native version.
- **Accessibility helper**: `.visually-hidden { clip-path: inset(50%); height: 1px; width: 1px; overflow: hidden; position: absolute; white-space: nowrap }`.
- **`body` classes** as feature flags: `nojs` (removed by JS on boot), `reduce-motion`, `no-ar`. Adopt `nojs` — it lets you hide JS-only affordances by default and reveal them progressively.
- `html, body { overflow-x: hidden }` — required, because several decorative elements deliberately overflow.

### 3.9 Panda CSS integration

Verified locally against **Panda 1.12.1 + Hono 4.13.8 + Bun 1.3.11**. Everything below was tested end to end, including a real `toSSG` render.

#### Why it fits

Panda does **static extraction**: it scans your source, emits one plain `.css` file, and ships **zero runtime JavaScript**. Atomic class names are baked into the JSX output at build time and survive SSG untouched. Confirmed rendered output:

```html
<div data-color="yellow" class="bg_pageBg c_text py_2rem">yellow band</div>
```

#### The band system in Panda — use `conditions` + `semanticTokens`

This is the important part. The play.date design rebinds semantic variables per colour band (§3.3). The naive approach — hand-writing `--page-bg` overrides in `globalCss` and pointing semantic tokens at them — **silently breaks**, because Panda hoists all semantic tokens into a single `:where(:root, :host)` block. The variable resolves once at root and never re-resolves per section.

The correct approach is Panda's own `conditions`, which generates exactly the play.date architecture:

```ts
// panda.config.ts
conditions: {
  extend: {
    bandYellow:    '[data-color=yellow] &, &[data-color=yellow]',
    bandPurple:    '[data-color=purple] &, &[data-color=purple]',
    bandGray:      '[data-color=gray] &, &[data-color=gray]',
    bandDarkgray:  '[data-color=darkgray] &, &[data-color=darkgray]',
    bandWhite:     '[data-color=white] &, &[data-color=white]',
    bandBlack:     '[data-color=black] &, &[data-color=black]',
    bandAqua:      '[data-color=aqua] &, &[data-color=aqua]',
    bandAquaLight: '[data-color="aqua-light"] &, &[data-color="aqua-light"]',
  },
},
theme: {
  extend: {
    semanticTokens: {
      colors: {
        pageBg: { value: {
          base: '{colors.psdDarkGray}',
          _bandYellow: '{colors.brandYellow}',
          _bandPurple: '{colors.purple}',
        }},
        text: { value: {
          base: '{colors.white}',
          _bandYellow: '{colors.screenBlack}',
          _bandPurple: '{colors.white}',
        }},
        buttonBg:   { value: { base: '{colors.text}',   _bandYellow: '{colors.purple}', _bandPurple: '{colors.brandYellow}' }},
        buttonText: { value: { base: '{colors.pageBg}', _bandYellow: '{colors.white}',  _bandPurple: '{colors.black}' }},
      },
    },
  },
},
```

The `&[data-color=x]` half of each selector matters — it makes the band element style *itself*, not only its descendants.

Verified generated CSS — this is precisely the mechanism from §3.3:

```css
:where(:root, :host) { --colors-page-bg: var(--colors-white); --colors-text: var(--colors-screen-black); }
[data-color=yellow]  { --colors-page-bg: var(--colors-brand-yellow); --colors-text: var(--colors-screen-black); }
[data-color=purple]  { --colors-page-bg: var(--colors-purple);       --colors-text: var(--colors-white); }
.bg_pageBg { background: var(--colors-page-bg); }
```

Confirmed behaviour: two elements with the **identical** class list recolour correctly based on their band's `data-color`. This also means §3.5's JS — which mirrors `data-color` onto `<html>` — keeps working unchanged, since the navbar inherits from the root attribute.

#### Gotcha: `preflight` vs the rem-scaling ladder

Panda's `preflight: true` emits `html, :host { line-height: 1.5; -webkit-text-size-adjust: 100%; … }`. Verified it does **not** set `font-size`, so it doesn't fight §3.1 directly. But it does set `line-height`, which the design overrides.

Keep `preflight: true` (the reset is useful), and declare the scaling ladder in `globalCss` so Panda controls the cascade order:

```ts
globalCss: {
  html: { fontSize: '2.4px' },
  body: { fontSize: '4rem', fontFamily: 'body' },
  '@media screen and (min-width: 240px)':  { html: { fontSize: '0.909090909091vw' }, body: { fontSize: '3.85rem' } },
  '@media screen and (min-width: 670px)':  { body: { fontSize: '2.85rem' } },
  '@media screen and (min-width: 1100px)': { html: { fontSize: '10px' } },
}
```

Do **not** express these as Panda breakpoint conditions — Panda's defaults are 640/768/1024/1280/1536px, which are not this design's 240/670/1100px. Either override `theme.breakpoints` to the three real values, or use raw `@media` strings as above. Do not mix the two.

#### Gotcha: token naming

Panda camelCases token keys into kebab-case CSS variables: `brandYellow` → `--colors-brand-yellow`. Name tokens in camelCase and let Panda do the conversion. Don't hand-write `--brand-yellow` and expect Panda to find it.

#### Setup

```sh
bun add -d @pandacss/dev
bunx panda init            # creates panda.config.ts
```

`package.json`:

```json
{
  "scripts": {
    "panda":     "panda codegen",
    "css":       "panda cssgen --outfile public/styles/site.css",
    "dev":       "bun run --hot src/dev.ts",
    "build":     "bun run panda && bun run css && bun run src/build.ts",
    "typecheck": "bunx tsc --noEmit"
  }
}
```

- `panda codegen` generates `styled-system/` (the `css()` function and token helpers). **Gitignore `styled-system/`** and regenerate it in CI — it's build output.
- `panda cssgen --outfile public/styles/site.css` emits the stylesheet; `build.ts` then copies `public/` into `dist/` as normal.
- `panda.config.ts` needs `include: ['./src/**/*.{ts,tsx}']` and `exclude: ['./node_modules/**', './dist/**', './styled-system/**']`.
- Leave `jsxFramework` unset. Hono JSX is not a supported Panda JSX runtime, so use the `css()` function and pass the result to `class=`. Do **not** use Panda's `styled` / JSX pattern components.
- Authoring style: `import { css } from '../../styled-system/css'`, then `<div class={css({ bg: 'pageBg', color: 'text' })}>`. Note Hono JSX uses `class`, not `className`.
- Use `defineTokens` / `defineSemanticTokens` for type-safe token definitions, split them into a `src/styles/theme/` directory rather than inlining everything in `panda.config.ts`, and set `strictPropertyValues: true` so typos in token names fail the typecheck.

Measured output for a trivial page with `preflight: true`: **~20 KB unminified**. Well inside the §6 budget of 300 KB total, and it only grows with utilities actually used.

#### What stays hand-written CSS

Panda is good at utilities and tokens, poor at long literal declarations. Put these in `globalCss` rather than contorting them into `css()`:

- The rem-scaling ladder (above).
- The chunky CTA's four-layer `box-shadow` and its `:active` variant (§3.7).
- The hero radial-glow `::before` (§3.8).
- `.visually-hidden`, `:target { scroll-margin-top: 4em }`, `html, body { overflow-x: hidden }`.
- The `@supports (color: color(display-p3 …))` wide-gamut palette overrides (§3.2) — Panda has no wide-gamut token primitive, so declare these as raw CSS overriding the generated `--colors-*` variables.

---

## 4. Target architecture

```
TVcasualty.github.io/                 (branch: master — SOURCE)
├─ .github/workflows/deploy.yml       Bun build → upload artifact → deploy-pages
├─ .gitignore                         node_modules, dist, .DS_Store
├─ .nojekyll                          → copied into dist; stops Jekyll eating _paths
├─ bun.lock
├─ package.json                       type: module
├─ tsconfig.json                      jsx: react-jsx, jsxImportSource: hono/jsx, strict
├─ panda.config.ts                    tokens, band conditions, globalCss — see §3.9
├─ styled-system/                     GENERATED by `panda codegen` — gitignored
├─ README.md                          how to run, how it deploys, where content lives
├─ BRIEF.md                           this file
├─ public/                            copied verbatim into dist/
│  ├─ fonts/PlusJakartaSans[wght].woff2
│  ├─ styles/site.css                 GENERATED by `panda cssgen` — gitignored
│  ├─ scripts/nav.js                  compiled from src/client/
│  ├─ img/…
│  ├─ favicon.svg  favicon-32.png  apple-touch-icon.png
│  ├─ site.webmanifest
│  └─ robots.txt
└─ src/
   ├─ app.tsx                         the Hono app + routes — single source of truth
   ├─ build.ts                        toSSG(app, …) → ./dist, then copy public/
   ├─ dev.ts                          Bun.serve + serveStatic, live local server
   ├─ client/nav.ts                   navbar colour + .scrolled + nojs removal
   ├─ components/
   │  ├─ Layout.tsx                   <!doctype>, <head>, meta/OG, navbar, footer
   │  ├─ Navbar.tsx
   │  ├─ Footer.tsx
   │  ├─ ColorSection.tsx             <div class="colorsection section--{c}" data-color="{c}">
   │  ├─ Button.tsx                   variants: default | big | center | chunky
   │  ├─ Card.tsx
   │  └─ SpecGrid.tsx
   ├─ content/
   │  ├─ site.ts                      name, title, tagline, URLs, socials, OG defaults
   │  ├─ projects.ts                  Project[] — the ONLY place projects are edited
   │  └─ skills.ts
   ├─ pages/
   │  ├─ Home.tsx
   │  └─ NotFound.tsx
   └─ styles/
      ├─ theme/                       defineTokens / defineSemanticTokens modules
      │  ├─ colors.ts                 primitives + per-band semantic tokens
      │  ├─ fonts.ts
      │  └─ breakpoints.ts            240 / 670 / 1100 only
      └─ global.ts                    globalCss: rem ladder, CTA shadow, p3 overrides
```

### Key implementation notes (all verified locally)

- `toSSG(app, fsModule, { dir: './dist' })` — `node:fs/promises` satisfies the `FileSystemModule` interface directly: `const { default: fs } = await import('node:fs/promises'); await toSSG(app, fs, { dir: './dist' })`. Confirmed working.
- Routes ending in `/` emit `dist/<path>/index.html`; `app.get('/')` emits `dist/index.html`. So **always define routes with a trailing slash** (`/about/`) to get clean directory-style URLs on Pages.
- **`toSSG` does not emit a doctype.** Hono JSX serialises only your element tree. Wrap the document:
  ```tsx
  import { html } from 'hono/html'
  const Doc = ({ children }: { children?: any }) => html`<!DOCTYPE html>${children}`
  ```
  Confirmed: output becomes `<!DOCTYPE html><html lang="en">…`.
- Dev server: `import { serveStatic } from 'hono/bun'`, `app.use('/*', serveStatic({ root: './public' }))`, then `export default { port: 4321, fetch: app.fetch }`. Confirmed serving both routes and static files.
- **Guard the static middleware out of the SSG build** — otherwise `toSSG` may try to crawl it. Register `serveStatic` only in `dev.ts`, never in `app.tsx`.
- GitHub Pages has **no server-side 404 routing**, but it *does* serve a root `/404.html` for unmatched paths. Render `NotFound` to exactly `dist/404.html` (not `dist/404/index.html`) — special-case it in `build.ts`.
- User sites (`<user>.github.io`) are served from `/`, so **no `basePath` / `pathPrefix`**. Use root-absolute asset URLs (`/styles/site.css`).
- Copy `public/` → `dist/` after `toSSG` completes. Bun: ``await Bun.$`cp -R public/. dist/` ``, or `fs.cp(…, { recursive: true })`.

### `package.json` scripts

```json
{
  "scripts": {
    "dev":        "bun run --hot src/dev.ts",
    "panda":      "panda codegen",
    "css":        "panda cssgen --outfile public/styles/site.css",
    "build":      "bun run panda && bun run css && bun run src/build.ts",
    "preview":    "bun run build && bunx serve dist",
    "typecheck":  "bunx tsc --noEmit",
    "clean":      "rm -rf dist styled-system"
  }
}
```

`styled-system/` and `public/styles/site.css` are both generated, so both are gitignored and regenerated in CI. `bun run panda` must therefore run before `typecheck` in the workflow — `tsc` cannot resolve `styled-system/css` until codegen has run.

### Deploy workflow

`.github/workflows/deploy.yml`, triggered on push to `master` plus `workflow_dispatch`:

1. `actions/checkout@v4`
2. `oven-sh/setup-bun@v2` (pin `bun-version: 1.3.11`)
3. `bun install --frozen-lockfile`
4. `bun run panda` — codegen must precede typecheck, or `tsc` cannot resolve `styled-system/css`
5. `bunx tsc --noEmit`
6. `bun run build`
7. `actions/configure-pages@v5`
8. `actions/upload-pages-artifact@v3` with `path: dist`
9. `actions/deploy-pages@v4`

Permissions: `contents: read`, `pages: write`, `id-token: write`. Concurrency group `pages`, `cancel-in-progress: false`.

Then in **Settings → Pages**, switch *Source* from "Deploy from a branch" to **"GitHub Actions"**. Using a custom Actions workflow also exempts the site from the 10-builds-per-hour soft limit.

---

## 5. Content plan

Real, verified facts to ship. Everything else is a clearly-marked placeholder living in `src/content/`.

**Identity**
- Name: Jorge Casal
- Role: Software Developer
- GitHub: `github.com/TVcasualty` (primary), `github.com/jorgecasal` (legacy — verify which to feature)
- LinkedIn: `linkedin.com/in/casaljorge`
- CodePen: `codepen.io/jorgecasal`
- Email: `casaldelacruz@gmail.com`

**Live and verified (200 OK)**
- Blog — `code-repo.netlify.app`
- Weather API — `geolocationweatherapi.netlify.app`
- Simplest ToDo — `simplest-todo.netlify.app`

**Removed**
- Reminders App and Post to DB (both Heroku, both 404 since the free-dyno shutdown)
- All four project GIFs
- The `Element` kitchen-sink page
- The EmailJS contact form and its embedded keys

**Page structure** (single page, anchor-navigated, matching play.date's band rhythm):

| Band | `data-color` | Content |
| --- | --- | --- |
| Hero | `gray` | Name as the wordmark, one-line lede, chunky primary CTA |
| Work | `yellow` | Project cards from `projects.ts`, 3-up grid |
| About | `white` | Short bio |
| Stack | `yellow` | Skills as a `#specs`-style two-column grid |
| Writing | `aqua-light` | Blog callout → `code-repo.netlify.app` |
| Contact | `purple` | `mailto:` + social pills |
| Footer | `darkgray` | Copyright, sitemap columns |

Plus `404.html` reusing `Layout`.

`Project` shape — keep `live` optional so a dead link simply stops rendering a button rather than shipping a 404:

```ts
export type Project = {
  slug: string
  title: string
  stack: string
  summary: string
  live?: string        // omit → no "See Live" button rendered
  source?: string
  image?: { src: string; width: number; height: number; alt: string }
}
```

---

## 6. Non-negotiable quality bar

- **No Panic assets.** No Playdate logo, no Roobert, no product photography, no Panic copy. Design language only.
- **Works with JavaScript disabled.** JS adds only the navbar colour transition. Mobile menu is CSS-only.
- **Accessibility:** one `<h1>` per page, ordered headings, visible `:focus-visible` rings, `alt` on every image, ≥4.5:1 contrast in every band (**check yellow — `--screen-black` on `--brand-yellow` passes; white on yellow does not**), `prefers-reduced-motion` respected, keyboard-reachable nav.
- **Performance:** total page weight target **< 300 KB**; one CSS file, one small JS file, one woff2 (`preload`ed, `font-display: swap`). Explicit `width`/`height` on all images to hold CLS at 0. Target Lighthouse ≥ 95 across the board.
- **SEO / social:** `<title>`, `<meta name="description">`, canonical, full OG + Twitter card tags, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `theme-color`.
- **TypeScript `strict: true`**, `bunx tsc --noEmit` clean, zero `any` in `src/content` or component props.
- **No build artifacts committed.** `dist/` in `.gitignore`, forever.

---

## 7. Migration and cleanup steps

Ordered, and deliberately conservative about history.

1. **History is already archived.** Done on 2026-09-16: five annotated `archive/*` tags covering all 148 commits across all 5 branches, pushed to GitHub, plus a verified offline `git bundle` at `~/backups/tvcasualty/`. See `ARCHIVE.md`. Nothing further is required, and the stale branches below are now safe to delete.
2. Build the new site on a fresh branch (`rebuild`), verify locally with `bun run preview`.
3. Add the Actions workflow; flip **Settings → Pages → Source** to *GitHub Actions*.
4. Merge `rebuild` into `master` — as an orphan/squashed commit, since none of the old `master` history is source code worth keeping.
5. Delete the stale remotes once the tags are pushed: `gh-pages`, `source`, `notmaster`, `light/dark`.
6. Optional: the 237 MB `.git` is dominated by GIF blobs and dead webpack chunks. Be aware that the `archive/*` tags deliberately pin those objects, so a history rewrite will **not** shrink clone size unless the tags are also dropped — at which point the `git bundle` in `~/backups/tvcasualty/` becomes your only copy. Given that, leaving the history as-is is the recommended choice.
7. Verify live: `/`, a deliberate 404, `/robots.txt`, `/sitemap.xml`, favicon, OG card via a debugger, Lighthouse on mobile.

---

## 8. GitHub Pages constraints (confirmed against current docs)

- Static files only — **no server-side runtime**, which is why Hono runs at build time and not at request time.
- Repo recommended limit **1 GB**; published site limit **1 GB**.
- Deployments time out at **10 minutes** (a Bun build of this size takes seconds).
- Soft bandwidth limit **100 GB/month**.
- Soft limit of **10 builds/hour** — *does not apply* when using a custom Actions workflow.
- One user/org site per account. HTTPS is automatic.
- `.nojekyll` is required if any path begins with an underscore, and is cheap insurance regardless.
- Not for commercial/e-commerce use or sensitive transactions — irrelevant for a portfolio.
- Since this site is design-inspired by play.date, keep it clearly a personal portfolio in your own words. Don't reproduce Playdate's content or present it as affiliated with Panic.

---

## 9. Environment note

**Working directory: `/opt/TVcasualty.github.io`** — the existing checkout, now writable.

It was previously `root:root` and read-only for user `nuc`. Resolved on 2026-09-16 with `sudo chown -R nuc:nuc /opt/TVcasualty.github.io`; verified recursively, including `.git/`. The `safe.directory` workaround has been removed from `~/.gitconfig` and git operates normally without it.

The rebuild happens **in place on `master`**. The tracked Gatsby build artifacts get removed and the new Bun/Hono source tree replaces them. Existing history, branches and remote are retained.

Auth is confirmed working: `gh` is logged in as `TVcasualty` with `repo` + `workflow` scopes (the `workflow` scope is required to push `.github/workflows/deploy.yml`), git's credential helper delegates to `gh auth git-credential`, and `git push --dry-run` succeeds.

**Archive tags: created and pushed 2026-09-16.** All pre-rebuild history is preserved by five annotated `archive/*` tags plus an offline `git bundle`. See `ARCHIVE.md` for the full inventory, verification log and recovery commands. Brief §7 step 1 is therefore **complete** — and step 5 (deleting stale branches) is now safe, though unnecessary.

Do not delete or move the `archive/*` tags. Note that because they pin the old objects, any future history rewrite to shrink the 237 MB `.git` will not actually reduce clone size while the tags remain.

Verified toolchain on this machine: **Bun 1.3.11**, Node 22.23.2, Hono 4.13.8.
