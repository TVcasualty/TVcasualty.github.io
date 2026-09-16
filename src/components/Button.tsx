import type { Child } from 'hono/jsx'

export type ButtonVariant = 'default' | 'big' | 'center' | 'chunky'

export type ButtonProps = {
  href: string
  variant?: ButtonVariant
  /** Set for outbound links; adds rel="noopener noreferrer". */
  external?: boolean
  /** Overrides the accessible name when the label alone is ambiguous. */
  ariaLabel?: string
  class?: string
  children?: Child
}

/**
 * A pill button (BRIEF §3.7).
 *
 * Deliberately a `div` wrapping an `a`, matching the source design: the
 * wrapper carries the pill (background, radius, the asymmetric padding that
 * optically centres the label) while the anchor stays a plain inline hit
 * target. `chunky` inverts that — see the globalCss rules — handing the
 * gradient and the four-layer shadow to the anchor so its `:active` padding
 * shift can physically depress the label.
 *
 * Colours come from the `buttonBg` / `buttonText` tokens, so a button
 * automatically matches whichever band contains it.
 */
export const Button = ({
  href,
  variant = 'default',
  external,
  ariaLabel,
  class: className,
  children,
}: ButtonProps) => {
  const classes = ['button', variant !== 'default' ? variant : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div class={classes}>
      <a
        href={href}
        aria-label={ariaLabel}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    </div>
  )
}
