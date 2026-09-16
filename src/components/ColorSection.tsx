import type { Child } from 'hono/jsx'

import { css } from '../../styled-system/css'

/**
 * The full set of colour bands. Each value must have a matching `band*`
 * condition in panda.config.ts and a matching entry in every semantic colour
 * token, or the band will fall back to the `base` colours.
 */
export type BandColor =
  | 'gray'
  | 'darkgray'
  | 'yellow'
  | 'white'
  | 'black'
  | 'purple'
  | 'aqua'
  | 'aqua-light'

export type ColorSectionProps = {
  color: BandColor
  /** Anchor target. Also what the nav links point at. */
  id?: string
  /** Rendered as the band's <h2>. Omit for the hero, which owns the <h1>. */
  heading?: string
  /** Small label above the heading. */
  eyebrow?: string
  /** Defaults to `section`; the hero passes `header`. */
  as?: 'section' | 'header' | 'footer'
  /** Extra classes, e.g. a `css()` result from the calling page. */
  class?: string
  children?: Child
}

const eyebrowStyles = css({
  display: 'block',
  fontSize: '0.9em',
  fontWeight: 'bold',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'accent',
  marginBottom: '1rem',
})

/**
 * One full-bleed horizontal band — the signature move of this design
 * (BRIEF §3.3).
 *
 * The `data-color` attribute is what does the work. Panda's band conditions
 * turn it into a rebinding of the `--colors-*` variables, so every descendant
 * — including buttons and cards — recolours automatically without any of them
 * knowing which band they are in. It is also the hook the scroll script reads
 * to tint the navbar (BRIEF §3.5), which is why every band needs one.
 */
export const ColorSection = ({
  color,
  id,
  heading,
  eyebrow,
  as = 'section',
  class: className,
  children,
}: ColorSectionProps) => {
  const Tag = as
  const classes = ['colorsection', `section--${color}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag class={classes} data-color={color} id={id}>
      <div class="band-inner">
        {heading ? (
          <h2>
            {eyebrow ? <span class={eyebrowStyles}>{eyebrow}</span> : null}
            {heading}
          </h2>
        ) : null}
        {children}
      </div>
    </Tag>
  )
}
