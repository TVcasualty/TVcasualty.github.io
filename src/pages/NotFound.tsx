import { css } from '../../styled-system/css'
import { Layout } from '../components/Layout'
import { ColorSection } from '../components/ColorSection'
import { Button } from '../components/Button'

/* The full-viewport band floor now comes from `.colorsection` in global.ts,
   but only at 670px and up, so this keeps a mobile-only floor of its own.

   Without it this page has just two short bands and stops ~200px short of a
   phone viewport, leaving bare page background under the footer. Scoped to
   `mdDown` so it never competes with the global 100dvh floor above 670px —
   the two rules have equal specificity, and this one would win on source
   order and hold the band at 60vh on desktop. */
const inner = css({
  mdDown: { minHeight: '60vh' },
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  paddingTop: '10rem',
})

const code = css({
  fontSize: '4em',
  fontWeight: 'black',
  lineHeight: '1',
  letterSpacing: '-0.03em',
  color: 'accent',
  margin: '0 0 1rem 0',
})

/* `ch`, not `rem` — see the note on text measures in Home.tsx. */
const lede = css({
  fontSize: '1.3em',
  fontWeight: 'bold',
  maxWidth: '44ch',
})

/**
 * Rendered to dist/404.html, which is the only path GitHub Pages serves for an
 * unmatched URL (BRIEF §4). build.ts special-cases it for that reason.
 */
export const NotFound = () => (
  <Layout title="Page not found" path="/404.html" noindex>
    <ColorSection color="gray" as="header" class={inner}>
      <p class={code}>404</p>
      <h1>Nothing here</h1>
      <p class={lede}>
        That URL does not exist. It may have been part of the old version of
        this site.
      </p>
      <Button href="/" variant="big">
        Back to the homepage
      </Button>
    </ColorSection>
  </Layout>
)
