import { css } from '../../styled-system/css'

/**
 * The embed, sized to the viewer's screen but capped below the framed page's
 * own footer.
 *
 * The height is `min(100vh, 810px)`. The `100vh` part replaced a fixed 900px an
 * earlier round carried: that value existed to show the framed page's full ~948px
 * without clipping, which is no longer the goal — the band is meant to read as
 * the framed site occupying the screen. The `810px` part is the cap, explained
 * at length below.
 *
 * Deliberately `vh` and not `dvh`, which is the opposite of the choice made for
 * `.colorsection`'s band floor, so it is worth saying why. There it is a
 * min-height: `dvh` lets a short band settle to the visible area and costs
 * nothing when the URL bar moves. Here it is a real height on a cross-origin
 * frame, and `dvh` would re-lay-out that frame every time mobile browser chrome
 * hid or revealed itself — visible reflow inside the embed while scrolling past
 * it. `vh` is stable for the frame's whole life.
 *
 * Below 810px of viewport height the frame is shorter than the band by exactly the
 * 8rem reserved at the band's top, so the slack sits above the frame rather than
 * being split — the band is a centring flex column, but with `paddingTop` taking
 * the slack there is none left to distribute. Above 810px the cap binds and the
 * remaining slack is split evenly below and above the reserved strip.
 *
 * (This used to read `min(100vh, 810px)`, where the frame matched the band exactly
 * below 810px of height and no strip existed. The navbar transparency made that
 * unsafe: with no strip, the frame's own light banner passed under the bar's white
 * text. See the note on the height above.)
 *
 * Height only — the width and the edge-to-edge bleed are done in global.ts,
 * because they require overriding the band's own padding and inner measure,
 * which are not this element's to set.
 *
 * THE 810px CAP exists to keep the framed site's own footer — its site menu and
 * two copyright lines — permanently out of view, so the embed does not read as
 * one page's footer stacked on another's.
 *
 * It cannot be done by styling that footer away. misfitscentral.com is a
 * different origin, so its DOM is entirely opaque to us: no selector, no
 * stylesheet and no script here can reach `div.footer`. The only available lever
 * is how much of the framed document is ever visible, which means a height cap
 * plus suppressed inner scrolling (see `scrolling="no"` below). Both are needed;
 * either alone leaves the footer reachable.
 *
 * 810 is measured, not guessed. Read off the live page's computed styles, and
 * identical at 390px, 720px and 1440px because the framed layout is fixed-width
 * and does not reflow:
 *
 *     783   last text outside div.footer ("Fan Club", "Sources")
 *     808   bottom of pumpkin.jpg, centred in td.appendices
 *     818   div.footer's box begins; its 90px top padding holds skulls.jpg
 *     908   p.siteMenu — the first footer TEXT
 *     948   end of body
 *
 * So the usable window is 808..817: below it the cap slices the pumpkin, above
 * it the footer's box starts showing. 810 sits inside that window with a couple
 * of pixels of margin either side, and was confirmed by rendering rather than by
 * arithmetic — 800 was tried first and cut 8px into the pumpkin, which looked
 * like the same kind of clipping bug as the sub-720px slicing.
 *
 * Note this deliberately gives up the skull row at 818..908. It is only visible
 * as div.footer's background, so keeping it would mean admitting that element's
 * box, and any later change to its padding would then walk the footer's text
 * into view. Losing a decorative strip is the cheaper side of that trade.
 *
 * `min()` and not a bare 810px: on a viewport shorter than 810 the frame must
 * still shrink, or the band would be taller than the screen and the page would
 * scroll inside the footer for no reason. `100vh - 8rem` keeps the "fills the
 * screen" intent everywhere it can be honoured, and the cap only takes over above
 * it. Measured frame heights: 792px at 720×844, 694px at 1024×768, 764px at
 * 1280×844, and 810px (capped) from 1440×900 up.
 *
 * KNOWN TRADE-OFF: on a viewport taller than 810px + 8rem the band's own
 * `min-height: 100dvh` floor keeps growing while the frame stops, so a strip of
 * the band's background appears. 8rem of it is the reserved strip at the top; the
 * rest is split evenly above and below by the band's centring — measured at 1440px
 * wide, the frame's top edge sits 85px down at a 900px viewport and 355px down at
 * 1440px. Below that height there is no extra slack, only the 8rem reservation.
 *
 * The alternative is letting the frame grow to fill the band, which is precisely
 * what would expose the framed footer again. On a tall screen one of the two has
 * to happen, so the strip stays — but it is not *visible*: the band is `black`
 * and the framed page's background measures pure #000 at every edge, so band,
 * frame base and embed are one continuous colour and the frame's edges cannot be
 * located by eye. That is the whole reason Layout uses a `black` band here
 * instead of `darkgray`, whose #1d1c18 read as a warm seam against the embed.
 *
 * This is why the strip is a geometry note rather than a defect, and also why
 * changing the footer band's colour would reintroduce a visible seam — and now
 * additionally why it would make the transparent navbar's text illegible, since
 * the bar's only backdrop over this band is the reserved strip.
 *
 * SECOND COST, on the record: the reservation shortens the frame, so less of the
 * framed page is visible than before. At 1024×768 it is 694px of the framed
 * document instead of 768px. Nothing is cut off that was readable — the cap
 * already stopped at 810px and the framed page is 948px tall — but the visible
 * window is smaller on short viewports than it used to be.
 */
const frame = css({
  display: 'block',
  width: '100%',
  /* `100vh - 8rem`, not `100vh`, and the subtraction is a legibility fix rather
     than a cosmetic one. The navbar goes fully transparent over this band
     (global.ts), which removed the backdrop its white text used to sit on. The
     framed page's own banner logo is light gray — measured rgb(190,190,190) — and
     it begins about 3px into the framed document, spanning a centred 684px. So
     wherever the frame's top edge rides under the bar, the wordmark or the nav
     links land on that logo at 1.86:1, well under AA's 4.5:1.

     8rem of reserved space at the band's top (the matching `paddingTop` in
     global.ts) keeps the frame's top edge below the bar at every size, so the bar
     is always over the band's own black. It is expressed in `rem` because the
     navbar's height is font-driven too: measured at 44px at a 720px viewport,
     47px at 768, 62px at 1024 and 68px at 1100 and up, which is a steady ~6.7rem,
     so 8rem clears it by 8-12px at every width rather than at one.

     Subtracting from the frame instead of just padding the band is what keeps the
     band exactly one viewport tall: content becomes 8rem + (100vh - 8rem) = 100vh,
     so no scrollbar appears inside the footer and the snap stops are unchanged.
     The `810px` cap is untouched and still binds on tall viewports — the frame can
     only ever get shorter here, which is the safe direction for the cap's purpose
     of keeping the framed site's own footer out of view. */
  height: 'min(calc(100vh - 8rem), 810px)',
  border: '0',
  /* An opaque base under the frame, so a slow or failed load reads as an empty
     dark surface rather than as a white flash or as the band showing through.

     This is the one piece of the old box styling that survives, and it is on the
     iframe itself rather than on a wrapper: there is no wrapping box any more.

     `pageBg` rather than a literal `#000`: it is a token, so it tracks the band
     if the footer is ever recoloured. On the `black` band this one sits in, it
     resolves to pure black, which is exactly the framed page's own background —
     so the base, the band and the embed are one continuous colour, and neither a
     slow load nor the strip above and below the capped frame shows a seam.

     It was `cardBg` while this sat on the darkgray band, where that token gave a
     near-black #212223. On black, `cardBg` resolves to #1d1c18 — a warm dark
     gray that would flash visibly against the frame on every load. */
  backgroundColor: 'pageBg',
})

/**
 * The footer band. Rendered inside a `black` ColorSection by Layout, so it
 * inherits that band's tokens like any other content. The band is black rather
 * than darkgray specifically so its background matches the framed page's own
 * #000 and the strip above and below the capped frame becomes invisible; the
 * reasoning lives at the ColorSection in Layout.tsx.
 *
 * Its entire content is one full-bleed, full-height embed of misfitscentral.com,
 * with no chrome of any kind: no border, no radius, no gutter, no caption. The
 * intent is that it reads as if the framed site were coded natively into the
 * page rather than boxed as a widget, so everything that would have marked it as
 * a component is gone. The bleed itself lives in global.ts under
 * `footer.colorsection`, since it works by cancelling that band's padding and
 * its `.band-inner` measure.
 *
 * The wordmark, section nav, social list and copyright line that used to live
 * here are gone — the owner's explicit call, not an accident of refactoring.
 *
 * DELIBERATE TRADE-OFF, so nobody has to guess whether it was forgotten: there
 * is no fallback link. A visible "misfitscentral.com ↗" anchor used to ship
 * alongside the frame precisely because the embed is a live third-party page
 * that can go blank, move, or begin sending framing headers at any time without
 * this repo changing. That link was removed on explicit instruction, because the
 * native-embed look wins over the safety net. The consequence is accepted and
 * real: if the embed ever breaks or refuses to be framed, this band will render
 * as an empty dark screen and nothing on the page will tell a visitor what was
 * supposed to be there, or offer them a way to reach it. Restoring a fallback
 * means re-adding both the anchor and a tap-target floor for it — the global
 * 24px rule only covers `li a`, `div.button a` and `.whopper-panel a`, so a lone
 * anchor here needs its own.
 */
export const Footer = () => (
  <iframe
    class={frame}
    src="https://www.misfitscentral.com/"
    title="misfitscentral.com"
    loading="lazy"
    /* Suppresses the frame's own scrollbar and its ability to scroll, which the
       height cap above needs to mean anything: a capped frame that still scrolls
       internally just moves the framed footer one gesture away instead of
       hiding it.

       `scrolling` is a deprecated HTML4 attribute, used here deliberately. The
       modern replacement would be `overflow: hidden` on the framed document's
       own root element, and that is exactly what a cross-origin boundary
       forbids us from touching. Engines still honour this attribute for
       precisely this case, and it was verified in Chromium rather than assumed:
       with the page scrolled to its true bottom at 390px and 1440px, the
       frame's own scrollY stayed 0 under wheel, under End/PageDown with focus
       inside the frame, and under a tap — and `div.footer` measured zero visible
       pixels in every state.

       Not verified: a touch DRAG. Chromium's touch-gesture synthesis does not
       deliver touchmove in this headless environment — it fails to scroll even
       with snapping disabled — so the drag case rests on the attribute's
       specified behaviour rather than on a measurement here. Worth re-checking
       on a real phone if the framed footer ever shows up in the wild.

       An a11y consequence worth naming: this also denies keyboard users any way
       to scroll the framed content. It is the intended outcome here, since the
       whole point is that the visible region is fixed, but it would be a bug in
       any embed meant to be read in full. */
    scrolling="no"
  />
)
