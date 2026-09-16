import { css } from '../../styled-system/css'
import { Button } from './Button'
import type { WorkCard } from '../content/bands'

export type CardProps = {
  card: WorkCard
}

const cardStyles = css({
  display: 'flex',
  flexDirection: 'column',
  bg: 'cardBg',
  color: 'cardText',
  borderRadius: '1.5rem',
  padding: '2.5rem',
  height: '100%',
})

const kicker = css({
  fontSize: '0.8em',
  fontWeight: 'bold',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  opacity: '0.75',
  marginBottom: '1.5rem',
})

const body = css({
  fontSize: '0.95em',
  lineHeight: '1.35',
  /* Pushes the button row to the bottom so cards of unequal copy length still
     line their actions up. */
  flexGrow: 1,
  margin: '0 0 1rem 0',
})

const actions = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  alignItems: 'center',
  /* The .button margin is 2rem auto by default, which is wrong inside a card. */
  '& div.button': { margin: '0' },
})

const thumb = css({
  borderRadius: '1rem',
  marginBottom: '2rem',
  width: '100%',
})

/**
 * A single card in a card grid (BRIEF §3.8).
 *
 * Both action buttons are conditional: an absent `live` or `source` renders
 * nothing rather than a dead link. The Work band passes neither, so the cards
 * are pure copy — the affordance stays because the component is general.
 */
export const Card = ({ card }: CardProps) => (
  <li class={cardStyles}>
    {card.image ? (
      <img
        class={thumb}
        src={card.image.src}
        width={card.image.width}
        height={card.image.height}
        alt={card.image.alt}
        loading="lazy"
        decoding="async"
      />
    ) : null}

    <h3>{card.title}</h3>
    <p class={kicker}>{card.kicker}</p>
    <p class={body}>{card.body}</p>

    {card.live || card.source ? (
      <div class={actions}>
        {card.live ? (
          <Button href={card.live} external ariaLabel={`See ${card.title} live`}>
            See live
          </Button>
        ) : null}
        {card.source ? (
          <Button
            href={card.source}
            external
            ariaLabel={`${card.title} source code`}
          >
            Source
          </Button>
        ) : null}
      </div>
    ) : null}
  </li>
)
