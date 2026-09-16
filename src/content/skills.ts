/**
 * The stack table, rendered by SpecGrid as a play.date-style specs list
 * (BRIEF §3.8): a right-aligned label against a left-aligned list of values.
 *
 * TODO(owner): this list is inferred from your repos plus what this rebuild
 * uses, so some of it is aspirational rather than earned. Two calls to make:
 * prune anything you would not want to be interviewed on (PostgreSQL, Redux
 * and Vite are the likeliest candidates — nothing here demonstrates them), and
 * decide whether to list the tools this very site is built with (Bun, Hono JSX,
 * Panda CSS), which is honest but makes the page partly about itself.
 */
export type SkillGroup = {
  label: string
  items: string[]
}

export const skills: SkillGroup[] = [
  {
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    label: 'Front end',
    items: ['React', 'Redux', 'Hono JSX', 'Panda CSS'],
  },
  {
    label: 'Back end',
    items: ['Node.js', 'Express', 'REST APIs'],
  },
  {
    label: 'Data',
    items: ['MongoDB', 'PostgreSQL'],
  },
  {
    label: 'Tooling',
    items: ['Git', 'Bun', 'GitHub Actions', 'Vite'],
  },
  {
    label: 'Practices',
    items: ['Accessibility', 'Progressive enhancement', 'Core Web Vitals'],
  },
]

/**
 * Short bio for the About band. Kept as an array so each entry renders as its
 * own paragraph.
 *
 * TODO(owner): rewrite this in your own voice before sharing the link. It was
 * assembled from the old site's phrasing, so it is plausible but not sourced —
 * specifically, "running in production that people actually use" and "always a
 * team player" are claims about your history that I cannot verify, and the
 * third paragraph is generic enough to be worth cutting or replacing with
 * something concrete about how you actually work.
 */
export const bio: string[] = [
  'I build web applications end to end — from the first sketch of a data model through to something running in production that people actually use.',
  'Most of my work has been in the JavaScript and TypeScript ecosystem: React on the front end, Node on the back, and whichever database fits the problem. I care about the parts users feel, which usually means accessibility, real-device performance and pages that still work when a script fails to load.',
  'Always a team player, and comfortable adapting to whatever the business actually needs rather than the stack I would pick for fun.',
]
