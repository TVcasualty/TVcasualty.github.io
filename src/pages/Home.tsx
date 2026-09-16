import { css } from '../../styled-system/css'
import { Layout } from '../components/Layout'
import { ColorSection } from '../components/ColorSection'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SpecGrid } from '../components/SpecGrid'
import { site } from '../content/site'
import { projects } from '../content/projects'
import { skills, bio } from '../content/skills'

const heroInner = css({
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
})

const heroRole = css({
  fontSize: '1em',
  fontWeight: 'bold',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'accent',
  margin: '0 0 2rem 0',
})

/* The hero lede: 2em / 700 / 1.1 over a 110rem measure, per BRIEF §3.6. That
   110rem is the same number as the fluid root-size divisor, so below 1100px it
   tracks the viewport exactly. */
const heroLede = css({
  fontSize: '2em',
  fontWeight: 'bold',
  lineHeight: '1.1em',
  maxWidth: '110rem',
  textAlign: 'center',
  margin: '0 auto 2rem auto',
  textWrap: 'balance',
})

/** Three up, collapsing to one below 670px (BRIEF §3.8). */
const cardGrid = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '2rem',
  maxWidth: '107rem',
  margin: '0 auto',
  md: { gridTemplateColumns: '1fr 1fr 1fr' },
})

/* Text measures are capped in `ch`, not `rem`.
   A rem cap looks right at one width only: body font-size steps from 3.85rem
   to 2.85rem at 670px, so a 70rem cap is ~25em of text on desktop but ~18em
   on a phone, where the paragraph collapses to a narrow column inside a much
   wider band. `ch` is relative to this element's own font, so the measure
   stays at a constant number of characters at every width. */
const prose = css({
  maxWidth: '66ch',
  fontSize: '1.05em',
})

const callout = css({
  maxWidth: '46ch',
  fontSize: '1.2em',
  lineHeight: '1.3',
})

const contactGrid = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1.5rem',
  alignItems: 'center',
  marginTop: '3rem',
  '& div.button': { margin: '0' },
})

const emailLine = css({
  fontSize: '1.4em',
  fontWeight: 'bold',
  maxWidth: '90rem',
})

/**
 * The single-page home route.
 *
 * The band rhythm follows BRIEF §5: gray → yellow → white → yellow →
 * aqua-light → purple, with the darkgray footer supplied by Layout. No two
 * adjacent bands share a colour, which is the one hard rule of §3.3.
 */
export const Home = () => (
  <Layout path="/">
    {/* Hero. Carries the page's only <h1> and the single chunky CTA. */}
    <ColorSection color="gray" as="header" id="hero" class={heroInner}>
      <p class={heroRole}>{site.role}</p>
      <h1>{site.name}</h1>
      <p class={heroLede}>{site.tagline}</p>
      <Button href="#work" variant="chunky">
        See my work
      </Button>
    </ColorSection>

    <ColorSection color="yellow" id="work" eyebrow="Selected" heading="Work">
      <ul class={cardGrid}>
        {projects.map((project) => (
          <Card project={project} key={project.slug} />
        ))}
      </ul>
    </ColorSection>

    <ColorSection color="white" id="about" eyebrow="Who" heading="About">
      <div class={prose}>
        {bio.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </ColorSection>

    <ColorSection color="yellow" id="stack" eyebrow="Tools" heading="Stack">
      <SpecGrid groups={skills} />
    </ColorSection>

    <ColorSection
      color="aqua-light"
      id="writing"
      eyebrow="Notes"
      heading="Writing"
    >
      <p class={callout}>
        {/* TODO(owner): replace with a line about what you actually write
            about, once there is more than snippets in there. */}
        I keep a running notebook of snippets, fixes and short write-ups —
        mostly the things I did not want to look up twice.
      </p>
      <Button href="https://code-repo.netlify.app" variant="big" external>
        Read the notebook
      </Button>
    </ColorSection>

    <ColorSection color="purple" id="contact" eyebrow="Say hello" heading="Contact">
      <p class={callout}>
        {/* TODO(owner): adjust to reflect whether you are actually looking. */}
        Open to interesting work and good problems. The fastest way to reach me
        is email.
      </p>
      <p class={emailLine}>
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
      <div class={contactGrid}>
        {site.socials
          .filter((social) => social.primary)
          .map((social) => (
            <Button href={social.href} external key={social.href}>
              {social.label}
            </Button>
          ))}
      </div>
    </ColorSection>
  </Layout>
)
