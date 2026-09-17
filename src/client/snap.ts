/**
 * Band-to-band magnetic scrolling.
 *
 * When scrolling stops, glide to the nearest position that lines a colour band up
 * with the screen. The page is never prevented from scrolling and no wheel, touch
 * or key event is ever consumed — this only acts once the scroll has already come
 * to rest, which is what makes it impossible for it to trap the page.
 *
 * That distinction is the whole reason this is script rather than CSS.
 * `scroll-snap-type: y mandatory` on `html` is three lines and looks obviously
 * correct, and it does not work on viewport-tall bands: it resolves each gesture
 * to the *nearest* snap position, so any gesture proposing less than half a
 * viewport is returned to where it started. At 1440x900 that midpoint is 450px
 * against a ~120px wheel notch, so the page reads as frozen — eight consecutive
 * notches leave `scrollY` at 0, while the same gestures with snapping off move
 * 120px each. It reproduces on a bare five-`100vh`-section page, and it is
 * Chrome's documented "hidden scroll-snap threshold", not a quirk of this
 * stylesheet. `proximity` is not a fix; it fights small scrolls near an edge for
 * the same reason. README records this at length.
 *
 * THE RULES, each of which exists because dropping it broke something measurable:
 *
 * 1. Targets come from CONTENT, not from band boxes. A band's box can be taller
 *    than the viewport purely because of its own 8rem of bottom padding — Work
 *    measures 980px against a 900px viewport, of which 80px is padding — and
 *    snapping to a padding edge produces stops that show nothing new. So a band
 *    contributes a second, bottom-aligned stop only when its `.band-inner` really
 *    does overflow the viewport. Using box edges instead added a stop 13px from
 *    the band top at 800x700, where one wheel notch moved the page 13px.
 *
 * 2. A band whose content overflows gets that bottom-aligned stop. At 1440x900
 *    Stack's copy ends 87px below what its top-aligned stop can show. Without a
 *    stop at `contentBottom - innerHeight` those 87px are unreachable, because
 *    the magnet keeps pulling the reader back to the band top. This mirrors CSS
 *    scroll snap, where a snap area larger than the snapport may rest at either
 *    of its edges.
 *
 * 3. A pull never lands behind where the current gesture began. It may move
 *    backwards *within* a gesture — that is what tidies a 60px overshoot of a
 *    band edge — but never behind its own starting point, so progress is
 *    monotonic by construction and no sequence of gestures can fail to advance.
 *    This is precisely what mandatory snapping gets wrong.
 *
 * 4. The pull always goes to the NEAREST stop, at any distance. There is no
 *    threshold: wherever a scroll comes to rest, it is resolved onto a band
 *    boundary, so the page cannot settle part-way between two sections. This is
 *    the owner's explicit call and it makes the effect a pager — see the
 *    trade-off note below, which is real and was measured, not theoretical.
 *
 *    Rule 3 is what keeps this from becoming the mandatory-snap trap. Nearest-
 *    always with no progress guard is exactly that failure: one 120px notch from
 *    a band top has that same band top as its nearest stop, so it would be
 *    returned there, forever. Because a backward pull must still be forward of
 *    where the gesture began, the notch resolves onward to the next stop instead.
 *    The two rules are therefore load-bearing together and neither can be removed
 *    on its own.
 *
 *    Rule 3 also bounds the backward movement that dropping the threshold would
 *    otherwise let in: a pull can never land behind the gesture's own starting
 *    point, so unrequested backward movement is bounded by the length of the
 *    gesture that caused it. An earlier version capped backward pulls separately
 *    at 0.15 of a viewport for this reason; that cap is gone with the threshold,
 *    because with nearest-always a backward pull is no longer a special case —
 *    it is how an overshoot resolves.
 *
 * THE TRADE-OFF, stated plainly because it is a real cost and not a detail:
 * every gesture now moves at least one band. One wheel notch, or one ArrowDown,
 * travels a whole section — measured at 980px for a 120px notch. Fine-grained
 * scrolling within a band is gone above 670px. For a reader going slowly, or
 * zoomed in, that is worse than no effect at all, and it is the reason this
 * behaviour was rejected the first time round. It ships because "never rest
 * between two sections" was asked for directly, and the two cannot both be had.
 * What is preserved: the bottom-aligned stops of rule 2 mean an oversized band's
 * last lines are still reachable, so no copy becomes unreadable — verified, not
 * assumed. `prefers-reduced-motion` and widths below 670px are unaffected, and
 * both remain ordinary scrolling.
 */

const MIN_WIDTH_QUERY = 'screen and (min-width: 670px)'
/* Below this width there is nothing to snap to: `.colorsection`'s one-viewport
   floor is gated at the same breakpoint in global.ts, so on a phone bands size to
   their own content and their edges have no relationship to the screen.

   Asked as a media query rather than compared against `window.innerWidth`, and
   spelled with the same `screen and` prefix global.ts uses, so the script and the
   stylesheet cannot disagree. They would otherwise: `innerWidth` counts a classic
   scrollbar, while a `min-width` query resolves against the viewport without it,
   so on a desktop with non-overlay scrollbars there is a ~15px band of widths
   where the magnet would be enabled while the bands have no one-viewport floor to
   align to. Headless Chromium uses overlay scrollbars and measured the two as
   identical at every width from 660 to 760, which is precisely why this could not
   have been caught by measurement here. */

const SETTLE_MS = 140
/* Long enough that a wheel spin or a smooth-scroll animation is treated as one
   gesture, short enough that the pull still feels like part of it. */

const NEAR = 2
/* Positions this close to a stop count as already on it. Absorbs sub-pixel
   layout and the rounding in the target list. */

const AFTER_INPUT_MS = 400
/* Suppression window after focus or hash navigation moves the page. The browser
   scrolls to reveal a focused element or an anchor target, and pulling away from
   what it just revealed would defeat the purpose of revealing it.

   Refreshed by each scroll event that arrives while it is already active, rather
   than being a fixed window from the triggering event, because these scrolls are
   smooth: the nav anchors measured 541ms, 784ms and 987ms to settle at 1440x900,
   so a fixed 400ms from the `hashchange` would expire mid-animation and let the
   settle treat the tail of the browser's own scroll as a fresh gesture. Extending
   it per scroll event means the window always outlives the animation, whatever
   its length. */

export const initSnap = (): void => {
  const root = document.documentElement

  const bands = Array.from(
    document.querySelectorAll<HTMLElement>('.colorsection'),
  )
  if (bands.length < 2) return

  /* Never animate for readers who asked not to be. The effect is decorative
     motion in the sense of BRIEF §6, so it is opt-in like everything else —
     rather than being downgraded to an instant jump, which would still relocate
     the page under them. Read live, since the setting can change mid-session. */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  /* Matched live too, so a window dragged across the breakpoint or a device
     rotated is handled without a resize listener. */
  const wideEnough = matchMedia(MIN_WIDTH_QUERY)

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastY = window.scrollY
  let direction = 0
  let gestureStart = window.scrollY
  let idle = true
  /* Where a pull is heading, so the scroll events it generates are not mistaken
     for a new gesture and immediately re-snapped. */
  let pending: number | null = null
  let suppressUntil = 0

  /**
   * Every scroll position at which a band lines up with the viewport: the
   * document's own two extremes, each band's top, and the bottom-aligned position
   * of any band whose content overflows. Recomputed per settle because band
   * heights move with the fluid rem ladder, font loading and the footer embed.
   */
  const stops = (): number[] => {
    const y = window.scrollY
    const vh = window.innerHeight
    const max = Math.round(root.scrollHeight - vh)

    /* 0 and max are genuine aligned positions — the first band top-aligned and
       the last band bottom-aligned — so they belong in the list. Omitting them
       left an upward gesture inside the first band with no stop ahead of it at
       all, which made it rest mid-band: exactly the "stops between two sections"
       complaint, in the one direction the earlier probes never drove. This is
       separate from the guard in `settle` that declines to pull while the page is
       already sitting at an extreme. */
    const out: number[] = [0, max]

    for (const band of bands) {
      /* A `display: none` band — the footer below 720px — returns an all-zero
         rect, so `rect.top + scrollY` would evaluate to the CURRENT scroll
         position and inject a phantom stop wherever the reader happens to be.
         The "already aligned" test then matched it at every position and the
         magnet silently did nothing between 670 and 719px. `offsetParent` is null
         for a hidden element and non-null for a rendered one, which is the cheap
         and exact test; a zero-height check would also catch a legitimately
         empty band. */
      if (band.offsetParent === null) continue

      const box = band.getBoundingClientRect()
      const top = Math.round(box.top + y)
      if (top > 0 && top < max) out.push(top)

      /* Direct child only, matching global.ts's own
         `.colorsection > .band-inner` selector — a descendant match could pick up
         a nested measure and read the wrong content edge. */
      const inner = band.querySelector<HTMLElement>(':scope > .band-inner')
      if (!inner) continue

      /* The last pixel of actual content, ignoring the band's bottom padding. */
      const contentBottom = Math.round(
        inner.getBoundingClientRect().bottom + y,
      )
      const end = contentBottom - vh
      if (end > top + NEAR && end > 0 && end < max) out.push(end)
    }

    return out.sort((a, b) => a - b)
  }

  const settle = (): void => {
    idle = true

    const y = window.scrollY

    /* Arrival of our own pull: adopt it as the new resting point and stop. */
    if (pending !== null) {
      const arrived = Math.abs(y - pending) <= NEAR
      pending = null
      if (arrived) {
        gestureStart = y
        return
      }
    }

    if (
      !wideEnough.matches ||
      reduce.matches ||
      direction === 0 ||
      Date.now() < suppressUntil
    ) {
      gestureStart = y
      return
    }

    /* Leave the extremes alone: at the very top and bottom the page is already
       aligned, and pulling there fights rubber-band overscroll. */
    const max = root.scrollHeight - window.innerHeight
    if (y <= 1 || y >= max - 1) {
      gestureStart = y
      return
    }

    const list = stops()
    if (list.length === 0) {
      gestureStart = y
      return
    }

    /* Already aligned. */
    for (const stop of list) {
      if (Math.abs(stop - y) <= NEAR) {
        gestureStart = y
        return
      }
    }

    /* Nearest stop in either direction (rule 4), except that a backward one must
       still be forward of where this gesture began (rule 3) — which is the only
       thing standing between nearest-always and the mandatory-snap trap. */
    let best: number | null = null
    let bestDistance = Infinity
    for (const stop of list) {
      if ((stop - y) * direction < 0 && (stop - gestureStart) * direction <= 0)
        continue
      const distance = Math.abs(stop - y)
      if (distance < bestDistance) {
        bestDistance = distance
        best = stop
      }
    }
    if (best === null) {
      gestureStart = y
      return
    }

    pending = best
    window.scrollTo({ top: best, behavior: 'smooth' })
  }

  addEventListener(
    'scroll',
    () => {
      const y = window.scrollY

      /* First scroll event of a new gesture: remember where it started, taking
         the previous resting position rather than the current one, which has
         already moved. */
      if (idle) {
        gestureStart = lastY
        idle = false
      }

      if (y !== lastY) direction = y > lastY ? 1 : -1
      lastY = y

      /* Keep a live suppression alive for as long as the browser's own scroll
         keeps producing events — see AFTER_INPUT_MS. */
      if (suppressUntil > 0 && Date.now() < suppressUntil)
        suppressUntil = Date.now() + AFTER_INPUT_MS

      clearTimeout(timer)
      timer = setTimeout(settle, SETTLE_MS)
    },
    { passive: true },
  )

  /* Focus and anchor navigation both scroll the page to put something specific
     on screen — a Tab stop, or a deep-linked band under `:target`'s
     navbar clearance. Both are honoured rather than corrected. */
  const suppress = (): void => {
    suppressUntil = Date.now() + AFTER_INPUT_MS
  }
  addEventListener('focusin', suppress, { passive: true })
  addEventListener('hashchange', suppress, { passive: true })
}
