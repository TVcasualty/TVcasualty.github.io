/**
 * Visual and computed-style audit of dist/, driven by a real browser.
 *
 *   bun run build && node tools/audit-visual.mjs
 *
 * Dev-only. Deliberately NOT part of `bun run build` and NOT in the deploy
 * workflow: it needs a Chromium binary, which is a machine-level prerequisite
 * rather than a project dependency. Nothing here is imported by the site, and
 * neither playwright nor puppeteer appears in package.json — see the "Local
 * visual audit" section of README.md.
 *
 * Why this exists
 * ---------------
 * tools/check-contrast.py resolves colours and font sizes by parsing the
 * stylesheet itself. That is fast and dependency-free, but it is a
 * reimplementation of the cascade, and a reimplementation can be confidently
 * wrong. This script asks an actual browser the same questions via
 * getComputedStyle and diffs the answers. Where they disagree, one of the two
 * has a bug, and the disagreement is reported rather than smoothed over.
 *
 * It checks four things at 1440x900 and 390x844:
 *
 *   1. the documentElement font size matches the rem ladder,
 *   2. every text element's contrast, using the browser's own resolved colours
 *      and the same large-text rule as the Python,
 *   3. no horizontal overflow,
 *   4. the navbar is fixed and its data-color tracks the band beneath it.
 *
 * Screenshots go to .screenshots/ (gitignored — binaries are not committed).
 * The `-footer` images are the ones to trust for the footer's cross-origin
 * embed; see the note in the screenshots step for why the fullPage shots cannot
 * show it.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, readFile, rm, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SHOTS = join(ROOT, '.screenshots')

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]

const PAGES = ['/', '/404.html']

/** WCAG 2.1 large-text thresholds. Kept identical to check-contrast.py. */
const LARGE_BOLD_PX = 18.66
const LARGE_REGULAR_PX = 24.0
const BOLD_THRESHOLD = 700

/**
 * Tolerance when comparing the browser against the Python, in px.
 *
 * The Python computes the ladder in float64 and rounds for display; the browser
 * resolves to layout units (1/64px) and reports a rounded value. 0.05px is
 * comfortably below anything that could matter visually while still catching a
 * genuine one-step error in the em chain.
 */
const PX_TOLERANCE = 0.05

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
}

const failures = []
const notes = []
const fail = (message) => failures.push(message)

/**
 * Import Playwright without it being a project dependency.
 *
 * A bare `import('playwright')` only works if it sits in this project's
 * node_modules, which is exactly what must not happen. NODE_PATH does not apply
 * to ESM resolution either, so instead the module is loaded by explicit path
 * from a scratch install elsewhere on the machine.
 *
 * PLAYWRIGHT_DIR may point at either the install root or its node_modules.
 */
const importPlaywright = async () => {
  const candidates = []
  const configured = process.env.PLAYWRIGHT_DIR
  if (configured) {
    candidates.push(
      join(configured, 'node_modules/playwright/index.mjs'),
      join(configured, 'playwright/index.mjs'),
    )
  }
  candidates.push(
    '/tmp/opencode/visual/node_modules/playwright/index.mjs',
    join(
      process.env.HOME ?? '',
      '.cache/playwright-audit/node_modules/playwright/index.mjs',
    ),
  )

  for (const candidate of candidates) {
    if (existsSync(candidate)) return import(pathToFileURL(candidate).href)
  }
  // Last resort: a normal resolution, in case it is genuinely installed.
  return import('playwright')
}

/**
 * Scroll the footer's cross-origin iframe into view and wait for it to load.
 *
 * The footer embed is `loading="lazy"`, so a page that is only ever observed at
 * scrollY=0 never triggers the load at all: the frame stays empty and any
 * screenshot of it records a blank box that looks like a broken embed.
 *
 * This polls for real readiness rather than sleeping a fixed number of seconds.
 * `contentFrame()` returns non-null well before the document is usable, and
 * `readyState === 'complete'` can be reached with an empty body, so the poll
 * requires both a complete document and some rendered text before declaring the
 * frame ready. In practice this settles in ~1.5s; the 5s budget is only there so
 * an offline or slow-responding misfitscentral.com cannot hang the audit.
 *
 * Returns a status object; the caller decides whether a timeout is fatal.
 */
const FRAME_BUDGET_MS = 5000

const settleFooterFrame = async (page, budgetMs = FRAME_BUDGET_MS) => {
  const handle = await page.$('iframe')
  if (!handle) return { found: false, ready: false }

  await handle.scrollIntoViewIfNeeded()

  const deadline = Date.now() + budgetMs
  let last = null
  while (Date.now() < deadline) {
    const frame = await handle.contentFrame()
    if (frame) {
      // A cross-origin frame that is mid-navigation throws on evaluate; that is
      // a "not ready yet" signal, not an error worth reporting.
      last = await frame
        .evaluate(() => ({
          state: document.readyState,
          textLength: document.body?.innerText.trim().length ?? 0,
        }))
        .catch(() => null)
      if (last && last.state === 'complete' && last.textLength > 0) {
        return { found: true, ready: true, ...last }
      }
    }
    await page.waitForTimeout(100)
  }
  return { found: true, ready: false, ...(last ?? {}) }
}

/* ------------------------------------------------------------------ *
 * Static server
 *
 * Serving over HTTP is not optional. Opening dist/index.html as a
 * file:// URL makes every root-absolute path (/styles/site.css) resolve
 * against the filesystem root, so no CSS loads at all and the whole
 * audit silently measures unstyled HTML at the default 16px root.
 * ------------------------------------------------------------------ */
const startServer = () =>
  new Promise((resolvePromise, reject) => {
    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url, 'http://127.0.0.1')
        let path = decodeURIComponent(url.pathname)
        if (path.endsWith('/')) path += 'index.html'

        // Contain the path inside dist/ regardless of what is requested.
        const target = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''))
        if (!target.startsWith(DIST)) {
          response.writeHead(403).end('forbidden')
          return
        }

        const info = await stat(target).catch(() => null)
        if (!info?.isFile()) {
          // Mirror GitHub Pages: unmatched URLs get 404.html.
          const notFound = join(DIST, '404.html')
          if (existsSync(notFound)) {
            response.writeHead(404, { 'content-type': MIME['.html'] })
            createReadStream(notFound).pipe(response)
          } else {
            response.writeHead(404).end('not found')
          }
          return
        }

        response.writeHead(200, {
          'content-type': MIME[extname(target)] ?? 'application/octet-stream',
          'content-length': info.size,
        })
        createReadStream(target).pipe(response)
      } catch (error) {
        response.writeHead(500).end(String(error))
      }
    })
    server.on('error', reject)
    // Port 0 asks the OS for any free port, so parallel runs cannot collide.
    server.listen(0, '127.0.0.1', () => resolvePromise(server))
  })

/* ------------------------------------------------------------------ *
 * Colour maths — deliberately a second implementation
 * ------------------------------------------------------------------ */

/**
 * Parse a computed colour into sRGB 0-255 components.
 *
 * Chromium reports wide-gamut colours in their authored space rather than
 * converting them, so `color(display-p3 0.424 0 1)` comes back verbatim from
 * getComputedStyle. That is the @supports path from BRIEF §3.9 actually taking
 * effect. It has to be converted here or those elements silently produce no
 * measurable colour at all.
 *
 * Note this conversion is colorimetric, so the ratio computed from it is the
 * ratio a P3 display would show. It is *not* evidence that the wide-gamut
 * rendering was visually verified — headless composites to sRGB regardless.
 */
const parseColor = (value) => {
  if (!value) return null

  const rgb = value.match(/rgba?\(([^)]+)\)/)
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    const [r, g, b] = parts
    return { r, g, b, alpha: parts.length > 3 ? parts[3] : 1 }
  }

  const p3 = value.match(/color\(display-p3\s+([^)]+)\)/)
  if (p3) {
    const parts = p3[1].split(/[\s/]+/).filter(Boolean).map(Number)
    const [r, g, b] = parts
    const alpha = parts.length > 3 ? parts[3] : 1
    return { ...displayP3ToSrgb(r, g, b), alpha }
  }

  if (value === 'transparent') return { r: 0, g: 0, b: 0, alpha: 0 }
  return null
}

/** display-p3 → linear → XYZ D65 → linear sRGB → gamma-encoded sRGB. */
const displayP3ToSrgb = (r, g, b) => {
  const toLinear = (c) =>
    Math.abs(c) <= 0.04045
      ? c / 12.92
      : Math.sign(c) * Math.pow((Math.abs(c) + 0.055) / 1.055, 2.4)
  const encode = (c) => {
    const v =
      Math.abs(c) <= 0.0031308
        ? c * 12.92
        : Math.sign(c) * (1.055 * Math.pow(Math.abs(c), 1 / 2.4) - 0.055)
    return Math.min(255, Math.max(0, v * 255))
  }

  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]

  // display-p3 primaries → XYZ (D65)
  const x = 0.4865709 * lr + 0.2656677 * lg + 0.1982173 * lb
  const y = 0.2289746 * lr + 0.6917385 * lg + 0.0792869 * lb
  const z = 0.0 * lr + 0.0451134 * lg + 1.0439444 * lb

  // XYZ (D65) → linear sRGB
  const sr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
  const sg = -0.969266 * x + 1.8760108 * y + 0.041556 * z
  const sb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z

  return { r: encode(sr), g: encode(sg), b: encode(sb) }
}

const composite = (fg, bg) => ({
  r: fg.r * fg.alpha + bg.r * (1 - fg.alpha),
  g: fg.g * fg.alpha + bg.g * (1 - fg.alpha),
  b: fg.b * fg.alpha + bg.b * (1 - fg.alpha),
  alpha: 1,
})

const luminance = ({ r, g, b }) => {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrast = (a, b) => {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const toHex = ({ r, g, b }) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')

const qualifiesAsLarge = (px, weight) =>
  px >= (weight >= BOLD_THRESHOLD ? LARGE_BOLD_PX : LARGE_REGULAR_PX)

/**
 * Map of sRGB fallback hex → its display-p3 equivalent, also as sRGB hex.
 *
 * Built by reading the stylesheet's own @supports block, so it stays correct if
 * the palette changes. Populated in main().
 */
const p3Equivalent = new Map()

const buildP3Map = (css) => {
  // Primitive sRGB values live in the plain token block.
  const fallbacks = new Map()
  for (const match of css.matchAll(
    /--colors-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g,
  )) {
    fallbacks.set(match[1], match[2].toLowerCase())
  }
  // The @supports block re-declares a subset in display-p3.
  for (const match of css.matchAll(
    /--colors-([a-z0-9-]+):\s*(color\(display-p3[^)]*\))/g,
  )) {
    const fallback = fallbacks.get(match[1])
    const parsed = parseColor(match[2])
    if (fallback && parsed) p3Equivalent.set(fallback, toHex(parsed))
  }
}

/**
 * True if a browser colour matches the Python's expectation on either path.
 *
 * Chromium applies the display-p3 @supports override, so its computed value is
 * the wide-gamut colour converted to sRGB, which differs from the hex fallback
 * the Python reads. Both describe a correct rendering, so either is agreement.
 */
const colourMatches = (pythonHex, browserHex) => {
  const expected = pythonHex.toLowerCase()
  const actual = browserHex.toLowerCase()
  if (expected === actual) return true
  return p3Equivalent.get(expected) === actual
}

/* ------------------------------------------------------------------ *
 * In-page collection
 *
 * Runs inside the browser. Returns plain data only — no DOM handles can
 * cross the boundary.
 * ------------------------------------------------------------------ */
const collectStyles = () => {
  const cssPath = (element) => {
    const parts = []
    let node = element
    while (node && node.parentElement) {
      const siblings = Array.from(node.parentElement.children)
      const index = siblings.indexOf(node) + 1
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`)
      node = node.parentElement
    }
    // The Python's paths start at <html>, which has no parentElement.
    parts.unshift('html:nth-child(1)')
    return parts.join(' > ')
  }

  /** Nearest ancestor that actually paints an opaque background. */
  const backdropOf = (element) => {
    // Matches rgb()/rgba() and CSS Color 4 forms such as
    // color(display-p3 ...), which Chromium reports without converting.
    const COLOR = /(?:rgba?|color|lab|lch|oklab|oklch|hwb)\([^)]+\)/g
    const isTransparent = (value) =>
      !value ||
      value === 'transparent' ||
      /rgba\([^)]*,\s*0(?:\.0+)?\s*\)/.test(value) ||
      /\/\s*0(?:\.0+)?\s*\)/.test(value)

    let node = element
    while (node) {
      const style = getComputedStyle(node)
      const image = style.backgroundImage
      if (image && image !== 'none') {
        const stops = image.match(COLOR)
        if (stops && stops.length > 0) {
          return { colors: stops, from: cssPath(node), gradient: true }
        }
      }
      const color = style.backgroundColor
      if (!isTransparent(color)) {
        return { colors: [color], from: cssPath(node), gradient: false }
      }
      node = node.parentElement
    }
    return null
  }

  const bandOf = (element) => {
    const band = element.closest('[data-color]')
    return band ? band.dataset.color : null
  }

  const results = []
  const hasOwnText = (element) =>
    Array.from(element.childNodes).some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
    )

  for (const element of document.body.querySelectorAll('*')) {
    if (!hasOwnText(element)) continue
    if (element.closest('.visually-hidden')) continue
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const backdrop = backdropOf(element)
    results.push({
      selector: cssPath(element),
      tag: element.tagName.toLowerCase(),
      classes: element.className || '',
      text: element.textContent.trim().slice(0, 38),
      fontSizePx: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
      color: style.color,
      backdrop,
      band: bandOf(element),
    })
  }

  const navbar = document.getElementById('navbar')

  /*
   * Overflow detection has to look at real geometry, not just scrollWidth.
   *
   * `html, body { overflow-x: hidden }` is deliberate (BRIEF §3.8) so that
   * decorative elements can bleed past the viewport. But it also clamps
   * documentElement.scrollWidth to the viewport width, which means the obvious
   * `scrollWidth > innerWidth` test can never fail — content that overflows is
   * merely clipped, and a genuinely broken layout would look fine to the
   * assertion. So measure the boxes themselves as well, and ignore the elements
   * that are supposed to bleed.
   */
  const viewportWidth = document.documentElement.clientWidth
  const overflowing = []
  for (const element of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    // Decorative bleed: elements positioned out of flow on purpose, and the
    // off-canvas mobile menu panel when closed.
    if (style.position === 'fixed' || style.position === 'absolute') continue
    if (element.closest('.whopper-panel')) continue
    if (element.getAttribute('aria-hidden') === 'true') continue

    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    // 1px of tolerance for subpixel layout rounding.
    const right = box.right
    const left = box.left
    if (right > viewportWidth + 1 || left < -1) {
      overflowing.push({
        selector: cssPath(element),
        tag: element.tagName.toLowerCase(),
        classes: (element.className || '').toString().slice(0, 60),
        left: Math.round(left * 100) / 100,
        right: Math.round(right * 100) / 100,
        width: Math.round(box.width * 100) / 100,
      })
    }
  }

  /*
   * Tap targets (WCAG 2.2 §2.5.8).
   *
   * This is the assertion that catches the class of bug where a control's
   * padding is expressed in rem: it looks fine at 1440px and collapses on a
   * phone, because rem shrinks with the fluid ladder. Only flagged below
   * 670px, since that is where a finger is the input device.
   *
   * §2.5.8 exempts targets inline within a sentence, so links whose parent
   * holds surrounding text are skipped, as is the visually-hidden skip link
   * (it is full size once focused).
   */
  const smallTargets = []
  for (const element of document.querySelectorAll('a, button, label, input')) {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const box = element.getBoundingClientRect()
    if (box.height === 0 || box.width === 0) continue
    if (element.closest('.visually-hidden, .skip-link')) continue

    // Inline-in-a-sentence exemption: the parent carries its own text
    // alongside this link.
    const parent = element.parentElement
    const inSentence =
      parent &&
      Array.from(parent.childNodes).some(
        (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
      )
    if (inSentence) continue

    if (box.height < 24 || box.width < 24) {
      smallTargets.push({
        selector: cssPath(element),
        text: (element.textContent || element.className || '').trim().slice(0, 30),
        width: Math.round(box.width),
        height: Math.round(box.height),
      })
    }
  }

  /*
   * Text measures that have collapsed.
   *
   * A paragraph capped in rem holds a constant pixel width while its column
   * grows and shrinks, so on a phone it can end up far narrower than the band
   * containing it. Flag any text block using well under the width available to
   * it, which is what that bug looks like from the outside.
   */
  const narrowText = []
  for (const element of document.querySelectorAll('p, li, dd, dt, blockquote, div')) {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (style.maxWidth === 'none') continue
    if (!element.textContent.trim()) continue
    // Only measure blocks whose width the cap actually governs.
    if (!/^(block|flow-root)$/.test(style.display)) continue
    // Centred blocks (auto margins) are meant to sit inside their column.
    if (style.marginLeft === style.marginRight && style.marginLeft !== '0px') {
      continue
    }

    const box = element.getBoundingClientRect()
    const available = element.parentElement?.getBoundingClientRect().width ?? 0
    if (box.width === 0 || available === 0) continue

    const ratio = box.width / available
    /*
     * 0.8 rather than something stricter: a grid cell or a deliberately
     * short measure can legitimately sit inside its container, and this
     * should not fire on those. But below 80% of an already-narrow phone
     * column, a paragraph reads as a mistake rather than a choice — the
     * original 80rem callout landed at exactly 75% here.
     */
    if (ratio < 0.8) {
      narrowText.push({
        selector: cssPath(element),
        maxWidth: style.maxWidth,
        width: Math.round(box.width),
        available: Math.round(available),
        ratio: Math.round(ratio * 100),
      })
    }
  }

  return {
    rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
    bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    clientWidth: viewportWidth,
    overflowing,
    smallTargets,
    narrowText,
    navbarPosition: navbar ? getComputedStyle(navbar).position : null,
    elements: results,
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const pythonReport = async () => {
  const child = spawn('python3', [join(ROOT, 'tools/check-contrast.py'), '--json'], {
    cwd: ROOT,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => (stdout += chunk))
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const code = await new Promise((r) => child.on('close', r))
  if (code !== 0) {
    throw new Error(`check-contrast.py --json failed (${code}): ${stderr.slice(0, 400)}`)
  }
  return JSON.parse(stdout)
}

const main = async () => {
  if (!existsSync(DIST)) {
    console.error('✗ dist/ not found — run `bun run build` first')
    process.exit(2)
  }

  let chromium
  try {
    ;({ chromium } = await importPlaywright())
  } catch {
    console.error(
      '✗ playwright not resolvable, and it must not be added to this project.\n' +
        '  Install it once in a scratch directory outside the repo:\n' +
        '    mkdir -p ~/.cache/playwright-audit && cd ~/.cache/playwright-audit\n' +
        '    npm init -y && npm i -D playwright@1.63.0\n' +
        '    npx playwright install chromium\n' +
        '  Then re-run. Set PLAYWRIGHT_DIR to point elsewhere if you used a\n' +
        '  different location. See "Local visual audit" in README.md.',
    )
    process.exit(2)
  }

  buildP3Map(await readFile(join(ROOT, 'public/styles/site.css'), 'utf8'))

  const python = await pythonReport()
  const pythonBySelector = new Map()
  for (const record of python.elements) {
    pythonBySelector.set(`${record.page}|${record.viewport}|${record.selector}`, record)
  }

  await rm(SHOTS, { recursive: true, force: true })
  await mkdir(SHOTS, { recursive: true })

  const server = await startServer()
  const { port } = server.address()
  const origin = `http://127.0.0.1:${port}`
  console.log(`serving dist/ on ${origin}`)

  // --no-sandbox: this is a headless box with no user-namespace setup, so the
  // sandbox cannot initialise. Safe here because we only load our own output.
  const browser = await chromium.launch({ args: ['--no-sandbox'] })

  let comparisons = 0
  let agreements = 0
  const disagreements = []

  try {
    for (const viewport of VIEWPORTS) {
      for (const pagePath of PAGES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
        })
        const page = await context.newPage()
        const consoleErrors = []
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text())
        })
        page.on('pageerror', (error) => consoleErrors.push(String(error)))

        const response = await page.goto(`${origin}${pagePath}`, {
          waitUntil: 'load',
        })
        const status = response?.status()
        const expected = pagePath === '/404.html' ? 404 : 200
        if (status !== expected && !(pagePath === '/404.html' && status === 200)) {
          fail(`${pagePath} returned HTTP ${status}, expected ${expected}`)
        }

        // Fonts must be settled before any size or screenshot is trusted.
        await page.evaluate(() => document.fonts.ready)

        const pageName = pagePath === '/' ? 'index.html' : pagePath.slice(1)
        const label = `${pageName} @ ${viewport.width}px`

        const data = await page.evaluate(collectStyles)

        /* -- 1. the rem ladder, confirmed by the browser -------------- */
        const expectedLadder = python.ladder[String(viewport.width)]
        if (!expectedLadder) {
          notes.push(
            `no Python ladder entry for ${viewport.width}px; add it to VIEWPORTS ` +
              'in check-contrast.py to cross-check this width',
          )
        } else {
          const rootDelta = Math.abs(data.rootFontSize - expectedLadder.rootPx)
          const bodyDelta = Math.abs(data.bodyFontSize - expectedLadder.bodyPx)
          if (rootDelta > PX_TOLERANCE) {
            fail(
              `${label}: html font-size is ${data.rootFontSize}px, ` +
                `the ladder predicts ${expectedLadder.rootPx}px`,
            )
          }
          if (bodyDelta > PX_TOLERANCE) {
            fail(
              `${label}: body font-size is ${data.bodyFontSize}px, ` +
                `the ladder predicts ${expectedLadder.bodyPx}px`,
            )
          }
          console.log(
            `  ${label}  html ${data.rootFontSize}px ` +
              `(python ${expectedLadder.rootPx}px), body ${data.bodyFontSize}px ` +
              `(python ${expectedLadder.bodyPx}px)`,
          )
        }

        /* -- 2. horizontal overflow ---------------------------------- */
        if (data.scrollWidth > data.innerWidth) {
          fail(
            `${label}: horizontal overflow — scrollWidth ${data.scrollWidth} > ` +
              `innerWidth ${data.innerWidth}`,
          )
        }
        // The real test, since overflow-x: hidden hides the above.
        if (data.bodyScrollWidth > data.clientWidth + 1) {
          fail(
            `${label}: body content is ${data.bodyScrollWidth}px wide in a ` +
              `${data.clientWidth}px viewport (clipped by overflow-x: hidden, ` +
              'but still overflowing)',
          )
        }
        if (data.overflowing.length > 0) {
          const worst = data.overflowing
            .sort((a, b) => b.right - a.right)
            .slice(0, 5)
          for (const box of worst) {
            fail(
              `${label}: <${box.tag}> extends to ${box.right}px in a ` +
                `${data.clientWidth}px viewport ` +
                `(left=${box.left}, width=${box.width})\n` +
                `      class="${box.classes}"\n      ${box.selector}`,
            )
          }
          if (data.overflowing.length > worst.length) {
            fail(
              `${label}: …and ${data.overflowing.length - worst.length} more ` +
                'overflowing element(s)',
            )
          }
        }

        /* -- 3. navbar is fixed -------------------------------------- */
        if (data.navbarPosition !== 'fixed') {
          fail(`${label}: #navbar position is ${data.navbarPosition}, expected fixed`)
        }

        /* -- 3b. tap targets, phones only ---------------------------- */
        if (viewport.width < 670 && data.smallTargets.length > 0) {
          for (const target of data.smallTargets) {
            fail(
              `${label}: tap target ${target.width}x${target.height}px is under ` +
                `24x24 (WCAG 2.2 §2.5.8) — “${target.text}”\n` +
                `      ${target.selector}`,
            )
          }
        }

        /* -- 3c. text measures must not collapse --------------------- *
         * A max-width in rem shrinks with the fluid ladder, so a measure
         * tuned at 1440px can leave a paragraph occupying a third of its
         * band on a phone. That is invisible to a contrast or overflow
         * check but obvious to a reader, so assert it directly.
         */
        if (viewport.width < 670) {
          for (const box of data.narrowText) {
            fail(
              `${label}: text block is ${box.width}px inside a ${box.available}px ` +
                `column (${box.ratio}% — max-width “${box.maxWidth}” is likely ` +
                'in rem and collapsing on small viewports)\n' +
                `      ${box.selector}`,
            )
          }
        }

        /* -- 4. contrast, from the browser's own resolved colours ---- */
        for (const element of data.elements) {
          const fg = parseColor(element.color)
          if (!fg) {
            fail(`${label}: could not parse color ${element.color} on ${element.selector}`)
            continue
          }
          if (!element.backdrop) {
            fail(`${label}: no painted background found behind ${element.selector}`)
            continue
          }

          /*
           * Two thresholds, deliberately.
           *
           * `thresholdHere` is what WCAG requires of this element at *this*
           * viewport, which is what the assertion below enforces.
           *
           * `thresholdStrict` is the project-wide rule check-contrast.py
           * applies: an element only gets the large-text allowance if it is
           * large at every width, so a label that shrinks on a phone is held to
           * 4.5:1 everywhere. Comparing against that is the only way to diff
           * the two tools on a like-for-like basis — otherwise every large
           * desktop heading looks like a disagreement when the tools actually
           * agree about the underlying pixels.
           */
          const thresholdHere = qualifiesAsLarge(
            element.fontSizePx,
            element.fontWeight,
          )
            ? 3.0
            : 4.5

          const counterpart = pythonBySelector.get(
            `${pageName}|${viewport.width}|${element.selector}`,
          )
          const thresholdStrict = counterpart?.threshold ?? thresholdHere

          for (const raw of element.backdrop.colors) {
            const bg = parseColor(raw)
            if (!bg) {
              fail(`${label}: could not parse background ${raw} on ${element.selector}`)
              continue
            }
            const resolved = fg.alpha < 1 ? composite(fg, bg) : fg
            const ratio = contrast(resolved, bg)
            if (ratio < thresholdHere) {
              fail(
                `${label}: contrast ${ratio.toFixed(2)}:1 ` +
                  `(needs ${thresholdHere}) — ` +
                  `${toHex(resolved)} on ${toHex(bg)}, ` +
                  `${element.fontSizePx}px/${element.fontWeight}, ` +
                  `band=${element.band ?? 'root'}\n` +
                  `      ${element.selector}\n      “${element.text}”`,
              )
            }
          }

          /* -- 5. browser vs. Python ------------------------------- */
          if (!counterpart) continue

          comparisons += 1
          const issues = []
          if (Math.abs(counterpart.fontSizePx - element.fontSizePx) > PX_TOLERANCE) {
            issues.push(
              `font-size python=${counterpart.fontSizePx}px browser=${element.fontSizePx}px`,
            )
          }
          if (counterpart.fontWeight !== element.fontWeight) {
            issues.push(
              `font-weight python=${counterpart.fontWeight} browser=${element.fontWeight}`,
            )
          }
          if (counterpart.threshold !== thresholdStrict) {
            issues.push(
              `threshold python=${counterpart.threshold} browser=${thresholdStrict}`,
            )
          }

          /*
           * Colour is compared against both render paths.
           *
           * Chromium honours the display-p3 @supports override from BRIEF §3.9,
           * so its computed colours are the wide-gamut values converted to
           * sRGB — numerically different from the plain hex fallback the Python
           * reads. Both are correct for their own path, so a match against
           * either is agreement. A value matching neither is a real bug.
           */
          const browserFg = toHex(fg)
          if (!colourMatches(counterpart.color, browserFg)) {
            issues.push(
              `color python=${counterpart.color} browser=${browserFg} ` +
                '(matches neither the sRGB fallback nor its P3 equivalent)',
            )
          }

          const browserBgs = element.backdrop.colors.map((c) => toHex(parseColor(c)))
          if (browserBgs.length !== counterpart.backgrounds.length) {
            issues.push(
              `background stop count python=${counterpart.backgrounds.length} ` +
                `browser=${browserBgs.length}`,
            )
          } else {
            for (const [index, browserBg] of browserBgs.entries()) {
              if (!colourMatches(counterpart.backgrounds[index], browserBg)) {
                issues.push(
                  `background[${index}] python=${counterpart.backgrounds[index]} ` +
                    `browser=${browserBg} (matches neither path)`,
                )
              }
            }
          }

          if (issues.length === 0) agreements += 1
          else
            disagreements.push(
              `${label} ${element.selector}\n      ${issues.join('\n      ')}`,
            )
        }

        /* -- 6. navbar tracks the band beneath it -------------------- */
        const bands = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[data-color]')).map((element) => ({
            color: element.dataset.color,
            top: element.getBoundingClientRect().top + window.scrollY,
            id: element.id || null,
          })),
        )

        for (const band of bands) {
          // Land inside the band, clear of its top edge and the navbar.
          await page.evaluate((y) => window.scrollTo(0, y), band.top + 40)
          await page.waitForTimeout(80) // let the rAF-throttled handler settle

          const state = await page.evaluate(() => {
            const navbar = document.getElementById('navbar')
            const height = navbar.offsetHeight
            let active = null
            for (const element of document.querySelectorAll('[data-color]')) {
              if (element.getBoundingClientRect().top - height <= 0) active = element
              else break
            }
            return {
              navColor: navbar.dataset.color ?? null,
              htmlColor: document.documentElement.dataset.color ?? null,
              expected: active?.dataset.color ?? null,
              scrolled: navbar.classList.contains('scrolled'),
              scrollY: window.scrollY,
            }
          })

          if (state.expected && state.navColor !== state.expected) {
            fail(
              `${label}: at scrollY=${state.scrollY} the band under the navbar is ` +
                `“${state.expected}” but #navbar[data-color] is ` +
                `“${state.navColor}”`,
            )
          }
          if (state.expected && state.htmlColor !== state.expected) {
            fail(
              `${label}: at scrollY=${state.scrollY} <html>[data-color] is ` +
                `“${state.htmlColor}”, expected “${state.expected}”`,
            )
          }
          if (state.scrollY > 0 && !state.scrolled) {
            fail(`${label}: navbar lacks .scrolled at scrollY=${state.scrollY}`)
          }
        }

        /* -- 7. screenshots ----------------------------------------- */

        /*
         * The footer embed needs its own capture, and the reason is not obvious.
         *
         * Loading the frame first is necessary but NOT sufficient for the
         * fullPage shot below. A cross-origin iframe is site-isolated (an
         * OOPIF, composited by a separate process), and Playwright's fullPage
         * capture uses captureBeyondViewport, which does not composite OOPIF
         * content lying outside the real viewport. Verified directly: with the
         * frame fully loaded (readyState complete, 1445 chars of text), the
         * fullPage shot still renders it as an empty box. Launching with
         * --disable-features=IsolateOrigins,site-per-process does not help
         * either, so this is a capture-path limitation, not just process
         * placement.
         *
         * Rejected alternatives, each tried and rendered:
         *   - resize the viewport to the document height, so nothing is "beyond
         *     viewport": composites the frame, but inflates the vh-sized hero
         *     and pushes the footer out of the image entirely.
         *   - take the fullPage shot while scrolled to the footer: composites
         *     the frame, but the position:fixed navbar bakes in at its scrolled
         *     offset — a duplicate bar above the footer and none at the top.
         *
         * So the fullPage shots keep their honest full-page geometry, and the
         * footer band gets an element screenshot taken with the frame on-screen.
         * That is the image to look at when checking the embed.
         */
        const frameStatus = await settleFooterFrame(page)
        if (!frameStatus.found) {
          fail(`${label}: no <iframe> found — the footer embed is missing`)
        } else if (!frameStatus.ready) {
          // Not a failure of the site: most likely no network access to the
          // embedded origin. Flagged so a blank footer shot is never mistaken
          // for a real defect.
          notes.push(
            `${label}: footer iframe did not finish loading within ` +
              `${FRAME_BUDGET_MS}ms (readyState=${frameStatus.state ?? 'unknown'} ` +
              `text=${frameStatus.textLength ?? 0} chars). The footer screenshot ` +
              'will look empty; check network access to the embedded origin.',
          )
        }

        const base = pageName.replace(/\.html$/, '')

        if (frameStatus.found) {
          const band = await page.$('iframe')
          const footer = await band.evaluateHandle((el) =>
            el.closest('.colorsection'),
          )
          const footerEl = footer.asElement()
          if (footerEl) {
            await footerEl.screenshot({
              path: join(SHOTS, `${base}-${viewport.width}-footer.png`),
            })
          }
        }

        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(120)
        await page.screenshot({
          path: join(SHOTS, `${base}-${viewport.width}.png`),
          fullPage: true,
        })

        // The mobile menu is CSS-only, so it can be opened without JS by
        // toggling the checkbox that drives it. Capture both states.
        if (viewport.width < 670 && pagePath === '/') {
          const toggle = await page.$('#whopper')
          if (!toggle) {
            fail(`${label}: #whopper checkbox not found — the CSS-only menu is missing`)
          } else {
            await page.screenshot({
              path: join(SHOTS, `${base}-${viewport.width}-menu-closed.png`),
            })
            await toggle.check({ force: true })
            await page.waitForTimeout(250)

            const menu = await page.evaluate(() => {
              const panel = document.querySelector('.whopper-panel')
              const style = getComputedStyle(panel)
              const box = panel.getBoundingClientRect()
              const link = panel.querySelector('a')
              const linkBox = link?.getBoundingClientRect()
              return {
                display: style.display,
                visibility: style.visibility,
                opacity: Number(style.opacity),
                height: box.height,
                width: box.width,
                linkVisible: linkBox ? linkBox.height > 0 && linkBox.width > 0 : false,
              }
            })

            if (
              menu.display === 'none' ||
              menu.visibility === 'hidden' ||
              menu.opacity === 0 ||
              menu.height < 1
            ) {
              fail(
                `${label}: mobile menu did not open when #whopper was checked ` +
                  `(display=${menu.display} visibility=${menu.visibility} ` +
                  `opacity=${menu.opacity} height=${menu.height})`,
              )
            }
            if (!menu.linkVisible) {
              fail(`${label}: mobile menu is open but its links have zero size`)
            }

            /*
             * The panel must be comfortably wider than its widest link.
             *
             * This catches the rem-vs-em bug specifically: `min-width: 22rem`
             * is 220px at desktop but 78px at 390px, which left "Contact"
             * filling 76% of the panel — a narrow strip, with everything
             * technically fitting so no overflow check could see it. Requiring
             * 2em of slack ties the panel's breathing room to its own type
             * size, which is the property that was wrong.
             */
            const roomy = await page.evaluate(() => {
              const panel = document.querySelector('.whopper-panel')
              const fontSize = parseFloat(getComputedStyle(panel).fontSize)
              const widest = Math.max(
                ...Array.from(panel.querySelectorAll('a')).map(
                  (a) => a.getBoundingClientRect().width,
                ),
              )
              return {
                clientWidth: panel.clientWidth,
                widest: Math.round(widest),
                needed: Math.round(widest + 2 * fontSize),
                fontSize: Math.round(fontSize * 10) / 10,
              }
            })

            if (roomy.clientWidth < roomy.needed) {
              fail(
                `${label}: mobile menu panel is only ${roomy.clientWidth}px wide ` +
                  `for a ${roomy.widest}px widest link at ${roomy.fontSize}px type ` +
                  `(wants >=${roomy.needed}px). A min-width in rem shrinks with ` +
                  'the fluid ladder; use em so it tracks the type size.',
              )
            }

            await page.screenshot({
              path: join(SHOTS, `${base}-${viewport.width}-menu-open.png`),
            })
            await toggle.uncheck({ force: true })
          }
        }

        if (consoleErrors.length > 0) {
          fail(`${label}: console errors — ${consoleErrors.join('; ').slice(0, 300)}`)
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
    server.close()
  }

  /* -- report ----------------------------------------------------- */
  console.log()
  console.log(`cross-checked ${comparisons} element/viewport pairings against`)
  console.log(`check-contrast.py — ${agreements} agreed, ${disagreements.length} differed`)

  if (disagreements.length > 0) {
    console.log()
    console.log('✗ the browser and check-contrast.py disagree:')
    console.log('  (one of the two is wrong; this is a bug, not a formatting issue)')
    for (const entry of disagreements.slice(0, 25)) console.log(`   ${entry}`)
    if (disagreements.length > 25) {
      console.log(`   … and ${disagreements.length - 25} more`)
    }
  }

  if (notes.length > 0) {
    console.log()
    for (const note of new Set(notes)) console.log(`note: ${note}`)
  }

  console.log()
  if (failures.length > 0 || disagreements.length > 0) {
    console.log(`✗ ${failures.length} assertion failure(s):`)
    for (const failure of failures) console.log(`   ${failure}`)
    console.log()
    console.log(`screenshots: ${SHOTS}`)
    process.exit(1)
  }

  console.log('✓ all assertions passed, and the browser agrees with')
  console.log('  check-contrast.py on every comparable pairing.')
  console.log()
  console.log('Not verified here, and not claimed:')
  console.log('  · display-p3 — headless composites wide-gamut colour down to')
  console.log('    sRGB, so the @supports path executes but the actual gamut')
  console.log('    difference is invisible in these screenshots.')
  console.log('  · font smoothing/hinting differs from a real desktop compositor.')
  console.log()
  console.log(`screenshots: ${SHOTS}`)
}

await main()
