import { html } from 'hono/html'
import type { Child } from 'hono/jsx'

import { site } from '../content/site'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { ColorSection } from './ColorSection'

export type LayoutProps = {
  /** Page title, composed into the full <title>. Omit on the home page. */
  title?: string
  description?: string
  /** Root-absolute path of this page, used for the canonical URL. */
  path?: string
  /** Keeps error pages out of search results. */
  noindex?: boolean
  children?: Child
}

/**
 * toSSG does not emit a doctype — Hono JSX serialises only the element tree,
 * so without this the output would start at `<html>` and browsers would fall
 * into quirks mode (BRIEF §4).
 *
 * `hono/html` passes its template through raw, which is what lets a non-element
 * string sit ahead of the tree. `children` is typed loosely here because the
 * tagged template accepts arbitrary interpolations; this is the one deliberate
 * escape hatch in the codebase, and everything else stays strictly typed.
 */
const Doc = ({ children }: { children?: any }) => html`<!DOCTYPE html>${children}`

export const Layout = ({
  title,
  description = site.tagline,
  path = '/',
  noindex,
  children,
}: LayoutProps) => {
  const fullTitle = title ? `${title} — ${site.title}` : site.title
  const canonical = `${site.url}${path}`
  const ogImage = `${site.url}${site.ogImage.src}`

  return (
    <Doc>
      <html lang={site.locale}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <title>{fullTitle}</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={canonical} />
          {noindex ? <meta name="robots" content="noindex, follow" /> : null}
          <meta name="theme-color" content={site.themeColor} />

          {/* Open Graph */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={fullTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={canonical} />
          <meta property="og:locale" content="en_GB" />
          <meta property="og:image" content={ogImage} />
          <meta
            property="og:image:width"
            content={String(site.ogImage.width)}
          />
          <meta
            property="og:image:height"
            content={String(site.ogImage.height)}
          />
          <meta property="og:image:alt" content={site.ogImage.alt} />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={fullTitle} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={ogImage} />
          <meta name="twitter:image:alt" content={site.ogImage.alt} />

          {/* The font is self-hosted and render-blocking-adjacent, so preload
              it. crossorigin is required even same-origin: fonts are always
              fetched in CORS mode, and omitting it causes a second download. */}
          <link
            rel="preload"
            as="font"
            type="font/woff2"
            href="/fonts/PlusJakartaSans[wght].woff2"
            crossorigin=""
          />
          <link rel="stylesheet" href="/styles/site.css" />

          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="icon" href="/favicon-32.png" sizes="32x32" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/site.webmanifest" />
        </head>

        {/* `nojs` is removed by nav.js on boot, so JS-only affordances can be
            hidden by default rather than appearing and then breaking. */}
        <body class="nojs">
          <a href="#main" class="visually-hidden">
            Skip to content
          </a>

          <Navbar />

          <main id="main">{children}</main>

          {/* `black` and not `darkgray`, so the band disappears behind the
              embed. The framed page's background is pure #000 (measured off
              rendered pixels at every edge of the frame, not inferred from its
              CSS), and the 810px height cap means a strip of this band is
              visible above and below the frame on any viewport taller than that.
              On darkgray that strip read as a warm #1d1c18 seam against the
              embed's black; on black it is the same colour as the frame, so the
              band edges vanish. See Footer.tsx for the cap itself. */}
          <ColorSection color="black" as="footer">
            <Footer />
          </ColorSection>

          {/* Deferred: it only tints the navbar, so it must never block
              rendering, and it needs the bands in the DOM before it runs. */}
          <script src="/scripts/nav.js" defer></script>
        </body>
      </html>
    </Doc>
  )
}
