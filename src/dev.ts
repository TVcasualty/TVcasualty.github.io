import { serveStatic } from 'hono/bun'

import { app } from './app'

/**
 * Local development server.
 *
 * The static middleware is registered here and nowhere else: putting it in
 * app.tsx would pollute the SSG crawl (BRIEF §4). It is mounted after the
 * routes so page routes win, and it serves public/ directly — which means
 * `bun run panda && bun run css` must have run at least once, or
 * /styles/site.css will 404.
 */
app.use('/*', serveStatic({ root: './public' }))

/* Pages sends unmatched URLs to /404.html; mirror that locally so the error
   page can be checked without a production deploy. */
app.notFound(async (c) => {
  const res = await app.request('/404/')
  return c.html(await res.text(), 404)
})

export default {
  port: 4321,
  fetch: app.fetch,
}
