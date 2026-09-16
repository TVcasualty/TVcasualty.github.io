/**
 * Everything the home page says, in one place.
 *
 * This replaces the old projects.ts + skills.ts pair. That split existed
 * because the page was a portfolio index: a list of deployed demos and a list
 * of named technologies. Both went stale the moment they were written — links
 * rot, and a tool list is a checklist that dates the page and narrows what
 * people think to ask about.
 *
 * So the register here is deliberate: describe how the work goes, not which
 * tools happened to be in the room. Two rules for anything added later —
 *
 *   1. No named technologies, products, companies, clients or metrics. Category
 *      words ("the web", "code", "a stack") are fine; brand names are not.
 *   2. No claim that cannot be met. "Intriguing but not specific" is not a
 *      licence to invent history — it means saying true things sideways.
 */

/**
 * One card in the Work band, rendered by Card.
 *
 * `live`, `source` and `image` are Card's own optional affordances rather than
 * anything this band uses: nothing here links out, by design. They stay on the
 * type so the component keeps working as a general-purpose card.
 */
export type WorkCard = {
  slug: string
  /** The card's <h3>. */
  title: string
  /** Small uppercase line under the title. */
  kicker: string
  body: string
  live?: string
  source?: string
  image?: { src: string; width: number; height: number; alt: string }
}

/** Sits above the cards, framing them. One line — the cards do the rest. */
export const workLede =
  'No screenshots of dashboards here. What you are actually buying is a way of working, so that is what this band describes.'

/** Three cards making one point: what it is like when the work lands on me. */
export const work: WorkCard[] = [
  {
    slug: 'questions-first',
    title: 'Questions first',
    kicker: 'Before any code',
    body: 'Half the job is working out what the thing has to do. I ask the boring questions early, while they are still cheap, so nobody discovers the answer three weeks in.',
  },
  {
    slug: 'unfamiliar-is-fine',
    title: 'Unfamiliar is fine',
    kicker: 'When it gets weird',
    body: 'Every project has a part nobody in the room has done before. That part is the good one. Read, prototype, poke at it until it stops being mysterious — then it is just work like the rest.',
  },
  {
    slug: 'then-it-ships',
    title: 'Then it ships',
    kicker: 'What done means',
    body: 'Done means it holds up on a bad connection, on somebody else\u2019s machine, on a Sunday, with me nowhere near it. Anything short of that is a demo.',
  },
]

/**
 * The Stack band, rendered by SpecGrid as a spec sheet: label right-aligned
 * against a left-aligned column of values.
 *
 * A spec sheet is the joke and the format at once. It reads precise while
 * naming nothing — which is exactly the brief. Two constraints the component
 * imposes: rows pair up on desktop, so keep the count even, and the value
 * column is narrow (~17 characters before it wraps), so values want to be
 * three or four words. Terser is funnier here anyway.
 */
export type Spec = {
  label: string
  items: string[]
}

export const specs: Spec[] = [
  {
    label: 'Compatibility',
    items: ['Any stack', 'Any team', 'Any mess', 'Any hour of it'],
  },
  {
    label: 'Accepted inputs',
    items: [
      'A rough sketch',
      'Half a spec',
      'A screenshot',
      '\u201CIt\u2019s broken\u201D',
    ],
  },
  {
    label: 'Outputs',
    items: ['Working software', 'Plain reasons why', 'Fewer meetings'],
  },
  {
    label: 'Battery',
    items: ['All day', 'No mystery deaths', 'Awake for the dull bit'],
  },
  {
    label: 'Failure modes',
    items: ['Over-tidies', 'Hates crooked edges', 'One question extra'],
  },
  {
    label: 'Learning curve',
    items: ['Steep, briefly', 'Then flat', 'Then bored, ask me again'],
  },
  {
    label: 'Included',
    items: ['Opinions on request', 'Notes you can read', 'No drama'],
  },
  {
    label: 'Warranty',
    items: ['It is written down', 'I still answer'],
  },
]

/**
 * The Writing band.
 *
 * Prose only, on purpose. The old CTA pointed at a named external site, which
 * is the same class of thing as the deleted demo links — a five-year-old page
 * on a free host — so it went with them. Nothing here needs a URL to make
 * sense; anyone who wants to read it can ask, and Contact is one band down.
 */
export const writing =
  'I keep notes so I stop re-learning the same things. Explanations, dead ends, and the reasoning behind decisions that will look ridiculous in a year. Not a publication \u2014 a notebook that happens to be legible.'

/**
 * The Contact band's callout, above the buttons.
 *
 * Deliberately silent about whether I am looking for work: that changes without
 * the site changing, and a stale availability line is worse than none.
 */
export const contact =
  'Email is the fast lane. Bring a plan, a problem, or a vague feeling that something ought to be better \u2014 all three are fine opening moves.'
