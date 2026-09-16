import { css } from '../../styled-system/css'
import { Button } from './Button'
import type { Project } from '../content/projects'

export type CardProps = {
  project: Project
}

const card = css({
  display: 'flex',
  flexDirection: 'column',
  bg: 'cardBg',
  color: 'cardText',
  borderRadius: '1.5rem',
  padding: '2.5rem',
  height: '100%',
})

const stack = css({
  fontSize: '0.8em',
  fontWeight: 'bold',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  opacity: '0.75',
  marginBottom: '1.5rem',
})

const summary = css({
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
 * A single project card (BRIEF §3.8 card grid).
 *
 * Both action buttons are conditional: an absent `live` or `source` renders
 * nothing rather than a dead link, which is the whole point of those fields
 * being optional in the `Project` type.
 */
export const Card = ({ project }: CardProps) => (
  <li class={card}>
    {project.image ? (
      <img
        class={thumb}
        src={project.image.src}
        width={project.image.width}
        height={project.image.height}
        alt={project.image.alt}
        loading="lazy"
        decoding="async"
      />
    ) : null}

    <h3>{project.title}</h3>
    <p class={stack}>{project.stack}</p>
    <p class={summary}>{project.summary}</p>

    {project.live || project.source ? (
      <div class={actions}>
        {project.live ? (
          <Button
            href={project.live}
            external
            ariaLabel={`See ${project.title} live`}
          >
            See live
          </Button>
        ) : null}
        {project.source ? (
          <Button
            href={project.source}
            external
            ariaLabel={`${project.title} source code`}
          >
            Source
          </Button>
        ) : null}
      </div>
    ) : null}
  </li>
)
