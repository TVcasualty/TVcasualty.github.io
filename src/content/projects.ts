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
    /* Describes what the deployed app does, observed from the outside: it ships
       as "JC Weather", with a location search box and a current-conditions
       readout in °C.
       TODO(owner): worth one more sentence on what was actually interesting to
       build — the trade-off, the constraint, or the bug that took longest. That
       is the part a reader remembers, and only you know it. */
    summary:
      'A weather front end over a REST service: search a location, or let the browser supply one, and get current conditions back.',
    live: 'https://geolocationweatherapi.netlify.app',
  },
  {
    slug: 'simplest-todo',
    title: 'Simplest ToDo',
    stack: 'HTML · CSS · Vanilla JS',
    /* Verified against the deployed app ("toDo Bud"): add items, clear the
       list, no framework and no build step. */
    summary:
      'A deliberately dependency-free task list: no framework, no build step, state persisted straight to local storage.',
    live: 'https://simplest-todo.netlify.app',
  },
  {
    slug: 'code-repo',
    title: 'Code Repo',
    stack: 'Notes · Snippets · Writing',
    /* Verified against the deployed site: short JS posts on higher-order
       functions, classes, objects, Express and React. */
    summary:
      'A notebook of short JavaScript write-ups — higher-order functions, classes, objects, a little Express and React — kept as I work things out.',
    live: 'https://code-repo.netlify.app',
  },
]
