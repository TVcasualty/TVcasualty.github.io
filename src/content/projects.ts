/**
 * Projects — the only place project entries are edited.
 *
 * `live` and `source` are both optional so a link that dies simply stops
 * rendering its button instead of shipping a 404 (BRIEF §5). The two old
 * Heroku projects were removed for exactly this reason, and should not come
 * back: both have been dead since the free-dyno shutdown.
 *
 * Every URL below was verified 200 OK at the time of the rebuild.
 */
export type Project = {
  slug: string
  title: string
  stack: string
  summary: string
  /** Omit → no "See Live" button is rendered. */
  live?: string
  source?: string
  image?: { src: string; width: number; height: number; alt: string }
}

export const projects: Project[] = [
  {
    slug: 'weather-api',
    title: 'Weather API',
    stack: 'Express · REST · Geolocation',
    /* TODO(owner): replace with a sentence on what you actually built and what
       was interesting about it — the trade-off, the constraint, the bug. */
    summary:
      'A small REST service that turns a browser geolocation fix into a current-conditions forecast, with a thin front end over the top.',
    live: 'https://geolocationweatherapi.netlify.app',
  },
  {
    slug: 'simplest-todo',
    title: 'Simplest ToDo',
    stack: 'HTML · CSS · Vanilla JS',
    /* TODO(owner): replace with your own description. */
    summary:
      'A deliberately dependency-free task list: no framework, no build step, state persisted straight to local storage.',
    live: 'https://simplest-todo.netlify.app',
  },
  {
    slug: 'code-repo',
    title: 'Code Repo',
    stack: 'Notes · Snippets · Writing',
    /* TODO(owner): replace with your own description. */
    summary:
      'A running notebook of snippets and short write-ups I keep as I learn things worth remembering.',
    live: 'https://code-repo.netlify.app',
  },
]
