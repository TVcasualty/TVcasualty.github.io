/**
 * The site's only client-side bundle. Two jobs, both decorative.
 *
 * The first is here: keep the navbar legible as it crosses colour bands
 * (BRIEF §3.5). Find the last `[data-color]` band whose top has passed under
 * the bar, then mirror its colour onto `#navbar` and `<html>`. Panda's band
 * conditions do the rest — the navbar has no colour rules of its own.
 *
 * The second is band-to-band magnetic scrolling, in ./snap.ts, called at the
 * bottom of this file. It lives in its own module because it shares nothing with
 * the navbar tinting but ships in the same bundle, since a second request for a
 * few hundred bytes of decoration is not worth it.
 *
 * Everything here is decorative. With JS disabled the navbar simply stays
 * transparent over the hero, scrolling is ordinary, and every link and the
 * mobile menu still work.
 */

import { initSnap } from './snap'

const navbar = document.getElementById('navbar')

/* Removing `nojs` is safe to do unconditionally and is the one thing worth
   doing even if the rest bails out. */
document.body.classList.remove('nojs')

if (navbar) {
  const bands = Array.from(
    document.querySelectorAll<HTMLElement>('[data-color]'),
  )
  const root = document.documentElement

  let queued = false

  const update = (): void => {
    queued = false

    /* Solid background only once the page has actually scrolled, so the bar
       stays transparent over the hero. */
    navbar.classList.toggle('scrolled', window.scrollY > 0)

    const height = navbar.offsetHeight
    let active: HTMLElement | undefined

    /* Last band whose top edge is at or above the bottom of the navbar. Walked
       forwards, keeping the final match, which is the same result as the
       original's filter().reverse()[0] without allocating two arrays on every
       frame. */
    for (const band of bands) {
      if (band.getBoundingClientRect().top - height <= 0) active = band
      else break
    }

    const color = active?.dataset.color
    if (!color) return

    /* Guarded because scroll fires far more often than the colour changes, and
       writing an unchanged attribute still invalidates style. */
    if (navbar.dataset.color !== color) navbar.dataset.color = color
    if (root.dataset.color !== color) root.dataset.color = color
  }

  /* Coalesce bursts of scroll events into one update per frame. */
  const schedule = (): void => {
    if (queued) return
    queued = true
    requestAnimationFrame(update)
  }

  addEventListener('scroll', schedule, { passive: true })
  addEventListener('resize', schedule, { passive: true })

  update()
}

/* Independent of the navbar, and of whether `#navbar` was found at all. */
initSnap()
