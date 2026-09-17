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
 * Below 810px of viewport height the frame matches the band exactly: it resolves
 * to 100vh, the band's floor is 100dvh, and `vh >= dvh` means the band grows to
 * fit the frame rather than the reverse, so no gap opens at the edges. Above
 * 810px they diverge on purpose — see the tall-viewport note at the end.
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
 * scroll inside the footer for no reason. 100vh keeps the "fills the screen"
 * intent everywhere it can be honoured, and the cap only takes over above it.
 *
 * KNOWN TRADE-OFF, accepted rather than hidden: on a viewport taller than 810px
 * the band's own `min-height: 100dvh` floor keeps growing while the frame stops,
 * so a strip of the band's background appears. The band centres its content, so
 * the slack is split evenly above and below the frame rather than pooling at the
 * bottom — measured at 1440px wide: 45px each side at a 900px viewport, 95px at
 * 1000px, 195px at 1200px, 315px at 1440px. Below an 810px viewport there is no
 * strip at all, since the frame resolves to 100vh and matches the band exactly.
 *
 * The alternative is letting the frame grow to fill the band, which is precisely
 * what would expose the framed footer again. On a tall screen one of the two has
 * to happen, and a plain dark strip is the more defensible artifact. It is
 * `cardBg`-toned, matching the frame's own base and the framed page's black, so
 * it reads as part of the same surface.
 */
const frame = css({
  display: 'block',
  width: '100%',
  height: 'min(100vh, 810px)',
  border: '0',
  /* An opaque base under the frame, so a slow or failed load reads as an empty
     dark surface rather than as a white flash or as the band showing through.

     This is the one piece of the old box styling that survives, and it is on the
     iframe itself rather than on a wrapper: there is no wrapping box any more.

     `cardBg` rather than a literal: it is a token, so it tracks the band if the
     footer is ever recoloured, and in this darkgray band it resolves to a
     near-black that matches the framed page's own black background — a white
     base flashed visibly on every load before the lazy frame painted. */
  backgroundColor: 'cardBg',
})

/**
 * The footer band. Rendered inside a `darkgray` ColorSection by Layout, so it
 * inherits that band's tokens like any other content.
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
