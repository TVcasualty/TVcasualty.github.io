import fs from 'node:fs/promises'
import path from 'node:path'
import { toSSG } from 'hono/ssg'

import { app } from './app'
import { site, routes } from './content/site'

const DIST = './dist'
const PUBLIC = './public'

/**
 * Pre-render the Hono app to static HTML and assemble dist/.
 *
 * GitHub Pages serves files and nothing else, so this is where Hono actually
 * runs: at build time, once, producing the artifact the deploy workflow
 * uploads.
 */

/* The client bundle is built here rather than as a separate package.json
   script so that `bun run build` stays the single entry point, and so it is
   guaranteed to exist before public/ is copied into dist/ below. */
const bundle = await Bun.build({
  entrypoints: ['./src/client/nav.ts'],
  outdir: `${PUBLIC}/scripts`,
  target: 'browser',
  minify: true,
})

if (!bundle.success) {
  console.error('✗ client bundle failed:')
  for (const log of bundle.logs) console.error(log)
  process.exit(1)
}

console.log('✓ bundled src/client/nav.ts → public/scripts/nav.js')

/* node:fs/promises satisfies toSSG's FileSystemModule interface directly, so no
   adapter is needed (BRIEF §4). */
const result = await toSSG(app, fs, { dir: DIST })

if (!result.success) {
  console.error('✗ toSSG failed:', result.error)
  process.exit(1)
}

console.log(`✓ pre-rendered ${result.files?.length ?? 0} route(s)`)

/**
 * GitHub Pages serves /404.html — and only that path — for unmatched URLs.
 * toSSG gives us dist/404/index.html from the `/404/` route, so promote it and
 * drop the directory (BRIEF §4).
 */
const nested404 = path.join(DIST, '404', 'index.html')
try {
  await fs.rename(nested404, path.join(DIST, '404.html'))
  await fs.rm(path.join(DIST, '404'), { recursive: true, force: true })
  console.log('✓ 404 page promoted to dist/404.html')
} catch (error) {
  console.error('✗ could not place dist/404.html:', error)
  process.exit(1)
}

/* public/ → dist/. Everything in it is either committed (fonts, icons) or
   generated ahead of this script (site.css, nav.js). */
await fs.cp(PUBLIC, DIST, { recursive: true })
console.log('✓ copied public/ into dist/')

/* Without this, Pages runs the output through Jekyll, which silently drops any
   path beginning with an underscore. */
await fs.writeFile(path.join(DIST, '.nojekyll'), '')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>\n    <loc>${site.url}${route}</loc>\n  </url>`).join('\n')}
</urlset>
`
await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap)

const robots = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`
await fs.writeFile(path.join(DIST, 'robots.txt'), robots)

const manifest = {
  name: site.title,
  short_name: site.title,
  description: site.tagline,
  start_url: '/',
  display: 'standalone',
  background_color: site.themeColor,
  theme_color: site.themeColor,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
}
await fs.writeFile(
  path.join(DIST, 'site.webmanifest'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)

console.log('✓ wrote .nojekyll, sitemap.xml, robots.txt, site.webmanifest')
console.log('✓ build complete → dist/')
