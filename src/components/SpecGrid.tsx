import { css } from '../../styled-system/css'
import type { Spec } from '../content/bands'

export type SpecGridProps = {
  groups: Spec[]
}

/**
 * Two columns above 670px, one below — the design's real breakpoint, not one
 * of Panda's defaults (BRIEF §3.8).
 */
const grid = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '3rem 4rem',
  maxWidth: '90rem',
  margin: '0 auto',
  md: { gridTemplateColumns: '1fr 1fr' },
})

/**
 * Each spec is a 2fr/3fr pair: label right-aligned against the gutter, values
 * left-aligned after it, so the whole grid reads as a spec sheet. Collapses to
 * a stacked, left-aligned pair on narrow screens where the mirrored alignment
 * would just look broken.
 */
const spec = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '0.4rem 2rem',
  alignItems: 'baseline',
  md: { gridTemplateColumns: '2fr 3fr' },
})

const label = css({
  fontSize: '0.95em',
  fontWeight: 'black',
  letterSpacing: '-0.0075em',
  color: 'accent',
  textAlign: 'left',
  md: { textAlign: 'right' },
})

const values = css({
  fontSize: '0.95em',
  lineHeight: '1.4',
  display: 'flex',
  flexDirection: 'column',
})

export const SpecGrid = ({ groups }: SpecGridProps) => (
  <dl class={grid}>
    {groups.map((group) => (
      <div class={spec} key={group.label}>
        <dt class={label}>{group.label}</dt>
        <dd class={values}>
          {group.items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </dd>
      </div>
    ))}
  </dl>
)
