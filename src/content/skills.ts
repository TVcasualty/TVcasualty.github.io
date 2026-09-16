/**
 * The stack table, rendered by SpecGrid as a play.date-style specs list
 * (BRIEF §3.8): a right-aligned label against a left-aligned list of values.
 *
 * TODO(owner): prune anything you would rather not be asked about in an
 * interview, and add whatever is missing.
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
 * TODO(owner): this is placeholder framing built from what the old site said
 * about you. Rewrite it in your own voice before sharing the link.
 */
export const bio: string[] = [
  'I build web applications end to end — from the first sketch of a data model through to something running in production that people actually use.',
  'Most of my work has been in the JavaScript and TypeScript ecosystem: React on the front end, Node on the back, and whichever database fits the problem. I care about the parts users feel, which usually means accessibility, real-device performance and pages that still work when a script fails to load.',
  'Always a team player, and comfortable adapting to whatever the business actually needs rather than the stack I would pick for fun.',
]
