import { css } from '../../styled-system/css'

/**
 * The embed, sized to the viewer's screen rather than to the framed document.
 *
 * `100vh` replaces the fixed 900px this used to carry. The old value was picked
 * to show the framed page's full ~948px height without clipping; that goal is
 * gone, and the band is now meant to read as the framed site occupying the
 * screen, so the height follows the viewport instead of the content.
 *
 * Deliberately `vh` and not `dvh`, which is the opposite of the choice made for
 * `.colorsection`'s band floor, so it is worth saying why. There it is a
 * min-height: `dvh` lets a short band settle to the visible area and costs
 * nothing when the URL bar moves. Here it is a real height on a cross-origin
 * frame, and `dvh` would re-lay-out that frame every time mobile browser chrome
 * hid or revealed itself — visible reflow inside the embed while scrolling past
 * it. `vh` is stable for the frame's whole life.
 *
 * No gap can open between this and the band even though the band's floor is
 * `100dvh` and this is `100vh`: `vh` is always >= `dvh`, and the floor is a
 * minimum, so the band grows to fit this element rather than the reverse.
 *
 * Height only — the width and the edge-to-edge bleed are done in global.ts,
 * because they require overriding the band's own padding and inner measure,
 * which are not this element's to set.
 */
const frame = css({
  display: 'block',
  width: '100%',
  height: '100vh',
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
  />
)
