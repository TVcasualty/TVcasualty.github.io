import { Hono } from 'hono'

import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

/**
 * The Hono app — the single source of truth for routing.
 *
 * This runs at build time only. GitHub Pages has no server runtime, so
 * src/build.ts pre-renders every route below to static HTML with toSSG and
 * the app itself never sees a production request.
 *
 * Two rules matter here:
 *
 * 1. No static-file middleware. Registering serveStatic would pollute the SSG
 *    crawl, so it lives in src/dev.ts alone (BRIEF §4).
 * 2. Any future non-root route must end in a trailing slash — `/about/`, not
 *    `/about` — so toSSG emits `dist/about/index.html` and Pages serves it as
 *    a clean directory URL.
 */
export const app = new Hono()

app.get('/', (c) => c.html(<Home />))

/* Rendered by toSSG as dist/404/index.html, then moved to dist/404.html by
   build.ts — the only path Pages serves for unmatched URLs. */
app.get('/404/', (c) => c.html(<NotFound />))

export default app
