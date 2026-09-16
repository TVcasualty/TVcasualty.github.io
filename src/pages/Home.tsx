import { css } from '../../styled-system/css'
import { Layout } from '../components/Layout'
import { ColorSection } from '../components/ColorSection'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SpecGrid } from '../components/SpecGrid'
import { site } from '../content/site'
import { work, workLede, specs, contact } from '../content/bands'

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

/**
 * The single-page home route.
 *
 * The band rhythm follows BRIEF §5, minus the deleted About and Writing bands
 * and with Work recoloured: gray → aqua-light → yellow → purple, with the
 * darkgray footer supplied by Layout. No two adjacent bands share a colour,
 * which is the one hard rule of §3.3.
 */
export const Home = () => (
  <Layout path="/">
    {/* Hero. Deliberately headingless — see the note in README.md's deviations:
        the tagline carries the band on its own, so this page ships zero <h1>
        elements. That is the owner's explicit choice, not an oversight. */}
    <ColorSection color="gray" as="header" id="hero" class={heroInner}>
      <p class={heroRole}>{site.role}</p>
      <p class={heroLede}>{site.tagline}</p>
    </ColorSection>

    <ColorSection color="aqua-light" id="work" eyebrow="How it goes" heading="Work">
      <p class={callout}>{workLede}</p>
      <ul class={cardGrid}>
        {work.map((card) => (
          <Card card={card} key={card.slug} />
        ))}
      </ul>
    </ColorSection>

    <ColorSection color="yellow" id="stack" eyebrow="Spec sheet" heading="Stack">
      <SpecGrid groups={specs} />
    </ColorSection>

    <ColorSection color="purple" id="contact" eyebrow="Say something" heading="Contact">
      <p class={callout}>{contact}</p>
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
