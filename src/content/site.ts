/**
 * Site-wide identity, metadata and social links.
 *
 * This and the sibling files in src/content/ are the only place copy is
 * edited. Components read from here and contain no prose of their own.
 */

export type SocialLink = {
  /** Visible label, also used as the accessible name. */
  label: string
  href: string
  /** Shown in the footer's contact column when true. */
  primary?: boolean
}

export type NavLink = {
  label: string
  /** In-page anchor, matching a band id in src/pages/Home.tsx. */
  href: string
}

export const site = {
  name: 'Jorge Casal',
  role: 'Software Developer',

  /** Used in <title> and the OG title. */
  title: 'Jorge Casal — Software Developer',

  /* This is the single most visible piece of copy on the site: it is the hero
     lede, the meta description and the social card text.

     TODO(owner): this describes what the repos and the old site show you doing,
     not necessarily how you want to be introduced. Two things only you can
     decide: whether "Full-stack" is the framing you want (the evidence is
     stronger on the front end), and whether to name TypeScript/React/Node at
     all — naming them reads as concrete but dates the page and narrows what
     people think to approach you about. */
  tagline:
    'Full-stack developer building fast, accessible web applications with TypeScript, React and Node.',

  /** Canonical origin. No trailing slash. */
  url: 'https://tvcasualty.github.io',

  locale: 'en',
  themeColor: '#ffc833',

  email: 'casaldelacruz@gmail.com',

  /* Both GitHub accounts are real. TVcasualty owns this repo, so it is the one
     featured in the nav and contact band, with jorgecasal listed in the footer
     as "GitHub (legacy)".

     TODO(owner): decide whether you want two GitHub links on the page at all.
     Featuring TVcasualty is a mechanical consequence of it owning this repo,
     not a judgement about which account better represents you — jorgecasal is
     the one that carries your name. If you would rather lead with jorgecasal,
     swap the two here and in `socials`; if the older account is not worth
     showing, drop the "GitHub (legacy)" entry entirely. */
  github: 'https://github.com/TVcasualty',

  /** This site's own repository, linked from the footer. */
  repo: 'https://github.com/TVcasualty/TVcasualty.github.io',

  socials: [
    { label: 'GitHub', href: 'https://github.com/TVcasualty', primary: true },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/casaljorge', primary: true },
    { label: 'CodePen', href: 'https://codepen.io/jorgecasal' },
    { label: 'GitHub (legacy)', href: 'https://github.com/jorgecasal' },
  ] satisfies SocialLink[],

  nav: [
    { label: 'Work', href: '#work' },
    { label: 'About', href: '#about' },
    { label: 'Stack', href: '#stack' },
    { label: 'Writing', href: '#writing' },
    { label: 'Contact', href: '#contact' },
  ] satisfies NavLink[],

  /** Social card. Regenerate with tools/make-icons.py after editing the mark. */
  ogImage: {
    src: '/img/og-default.png',
    width: 1200,
    height: 630,
    alt: 'Jorge Casal — Software Developer',
  },
} as const

/** Every page that should appear in sitemap.xml. Paths are root-absolute. */
export const routes = ['/'] as const
