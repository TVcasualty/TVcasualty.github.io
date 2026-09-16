import { css } from '../../styled-system/css'
import { site } from '../content/site'

const inner = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '3rem',
  md: { gridTemplateColumns: '2fr 1fr 1fr' },
})

const colHeading = css({
  fontSize: '0.8em',
  fontWeight: 'black',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'accent',
  margin: '0 0 1.2rem 0',
})

const list = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  fontSize: '0.9em',
})

const wordmark = css({
  fontSize: '1.4em',
  fontWeight: 'black',
  letterSpacing: '-0.02em',
  margin: '0 0 0.5rem 0',
})

/* See the note on text measures in Home.tsx: a rem cap would collapse this to
   ~135px on a phone, wrapping the tagline over six lines inside a 376px
   column. `ch` keeps the measure constant in characters. */
const blurb = css({
  fontSize: '0.9em',
  lineHeight: '1.4',
  color: 'subtle',
  maxWidth: '42ch',
  margin: '0',
})

const legal = css({
  fontSize: '0.8em',
  color: 'subtle',
  marginTop: '5rem',
  paddingTop: '2rem',
  borderTop: '0.2rem solid',
  borderColor: 'subtler',
})

/**
 * The footer band. Rendered inside a `darkgray` ColorSection by Layout, so it
 * inherits that band's tokens like any other content.
 */
export const Footer = () => (
  <div>
    <div class={inner}>
      <div>
        <p class={wordmark}>{site.name}</p>
        <p class={blurb}>{site.tagline}</p>
      </div>

      <div>
        <h2 class={colHeading}>Sections</h2>
        <ul class={list}>
          {site.nav.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 class={colHeading}>Elsewhere</h2>
        <ul class={list}>
          {site.socials.map((social) => (
            <li key={social.href}>
              <a href={social.href} target="_blank" rel="noopener noreferrer">
                {social.label}
              </a>
            </li>
          ))}
          <li>
            <a href={`mailto:${site.email}`}>Email</a>
          </li>
        </ul>
      </div>
    </div>

    <p class={legal}>
      © {new Date().getFullYear()} {site.name}. Built with Bun, Hono and Panda
      CSS.{' '}
      <a href={site.repo} target="_blank" rel="noopener noreferrer">
        Source on GitHub
      </a>{' '}
      — no trackers, no cookies.
    </p>
  </div>
)
