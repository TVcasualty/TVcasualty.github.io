/**
 * Band-to-band magnetic scrolling.
 *
 * When scrolling stops, if a nearby position would line a colour band up with
 * the screen, glide the rest of the way to it. The page is never prevented from
 * scrolling and no wheel, touch or key event is ever consumed — this only acts
 * once the scroll has already come to rest, which is what makes it impossible
 * for it to trap the page.
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
 * 4. A forward pull only commits past the midpoint between the two stops the
 *    reader is between. Half a gap is therefore the furthest the page can ever
 *    move forwards on its own (420px at 1440x900), and a deliberate one- or
 *    two-notch nudge is left exactly where the reader put it.
 *
 * 5. A backward pull is capped much tighter, at 0.15 of a viewport, because the
 *    two rules serve different purposes: forward is the magnet, backward only
 *    tidies a small overshoot of a stop just crossed. Without its own cap it
 *    inherited the midpoint rule and misbehaved badly wherever two stops sit
 *    close together — a band's top and end-aligned stops are 87px apart at
 *    1440x900 and 100px at 1280x800, so a reader making an ordinary 4-notch run
 *    from the band top landed between the near stop and the distant next one, and
 *    got dragged 393px backwards. Measured across every stop and six run lengths,
 *    the cap takes the worst backward movement from 393px to 33px while still
 *    tidying every overshoot, at a cost of three flush landings out of thirty.
 *
 * Rejected, measured: always advancing to the next stop, which lands flush every
 * single time and is the "one gesture, one band" pager feel. It moves the page
 * 780px for a 120px notch, and it denies fine-grained scrolling entirely — every
 * ArrowDown press jumps a whole band, which for anyone reading slowly or zoomed
 * in is worse than not having the effect.
 */

const MIN_WIDTH = 670
/* Below this width there is nothing to snap to: `.colorsection`'s one-viewport
   floor is gated at the same breakpoint in global.ts, so on a phone bands size to
   their own content and their edges have no relationship to the screen. */

const SETTLE_MS = 140
/* Long enough that a wheel spin or a smooth-scroll animation is treated as one
   gesture, short enough that the pull still feels like part of it. */

const NEAR = 2
/* Positions this close to a stop count as already on it. Absorbs sub-pixel
   layout and the rounding in the target list. */

const MAX_BACKWARD = 0.15
/* Ceiling on a backward pull, as a fraction of the viewport — see rule 5. */

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
   * Every scroll position at which a band lines up with the viewport: each band's
   * top, plus the bottom-aligned position of any band whose content genuinely
   * overflows. Recomputed per settle because band heights move with the fluid
   * rem ladder, font loading and the footer embed.
   */
  const stops = (): number[] => {
    const y = window.scrollY
    const vh = window.innerHeight
    const max = Math.round(root.scrollHeight - vh)
    const out: number[] = []

    for (const band of bands) {
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
      window.innerWidth < MIN_WIDTH ||
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

    /* Nearest stop in either direction, but a backward one only while it is
       still forward of where this gesture began (rule 3) and within the tight
       backward cap (rule 5). */
    let best: number | null = null
    let bestDistance = Infinity
    let bestIsBackward = false
    for (const stop of list) {
      const distance = Math.abs(stop - y)
      const backward = (stop - y) * direction < 0
      if (backward) {
        if ((stop - gestureStart) * direction <= 0) continue
        if (distance > window.innerHeight * MAX_BACKWARD) continue
      }
      if (distance < bestDistance) {
        bestDistance = distance
        best = stop
        bestIsBackward = backward
      }
    }
    if (best === null) {
      gestureStart = y
      return
    }

    /* Forward pulls commit past the midpoint of the gap the reader is resting in
       (rule 4). The gap is measured between the stops either side of the current
       position, so the rule scales with band height instead of assuming one.
       Backward pulls skip this: their own cap above is the whole rule. */
    if (!bestIsBackward) {
      let below: number | null = null
      let above: number | null = null
      for (const stop of list) {
        if (stop <= y && (below === null || stop > below)) below = stop
        if (stop >= y && (above === null || stop < above)) above = stop
      }
      const gap =
        below === null || above === null ? window.innerHeight : above - below
      if (bestDistance > gap / 2 + 1) {
        gestureStart = y
        return
      }
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
