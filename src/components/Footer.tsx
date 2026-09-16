import { css } from '../../styled-system/css'

/**
 * The embed's height is a single fixed px value at every viewport width, on
 * purpose. It is deliberately *not* `vh` (the band already has its own
 * one-viewport floor above 670px, so a vh height would compound with it) and
 * deliberately not responsive-scaled: the framed site is a fixed-width 2012-era
 * layout, so scaling the frame down just shows less of it rather than fitting it
 * better.
 *
 * px rather than rem for the same reason the tap-target floor is px: a rem
 * height would shrink with the fluid ladder to roughly a fifth of itself on a
 * phone, which is where the embed can least afford to lose room.
 *
 * 900px was chosen by looking at both widths rather than guessing. The framed
 * document is ~948px tall and does not reflow (it is a fixed-width 2012-era
 * layout), so this shows all of it — masthead, all five discography blocks, the
 * pumpkin, down to the closing row of skulls — at 1440px and at 390px alike.
 * 700px and 820px were also rendered and both cut the last block mid-way, which
 * looked like a clipping bug rather than a framed page.
 */
const frame = css({
  display: 'block',
  width: '100%',
  height: '900px',
  border: '0.2rem solid',
  borderColor: 'subtler',
  borderRadius: '1rem',
  /* An opaque base under the frame, so a slow or failed load reads as an empty
     surface rather than as the band showing through.

     `cardBg` rather than a literal: it is a token, so it tracks the band if the
     footer is ever recoloured, and in this darkgray band it resolves to a
     near-black that matches the framed page's own black background — a white
     base flashed visibly on every load before the lazy frame painted. */
  backgroundColor: 'cardBg',
})

/**
 * Always rendered, never conditional on the embed working.
 *
 * The iframe is a live third-party page: it can go blank, move, or start sending
 * framing headers at any time without this repo changing. This link is the part
 * that still functions in all of those cases, so it ships alongside the frame
 * from the start rather than being added after the first failure.
 */
const fallback = css({
  fontSize: '0.9em',
  marginTop: '2rem',
  marginBottom: '0',
})

/* The 24px tap-target floor, in px for the reason given in global.ts: the
   global rule only covers `li a`, `div.button a` and `.whopper-panel a`, and
   this link is a lone anchor in a <p>. Without it the link renders ~15px tall at
   390px and fails WCAG 2.2 §2.5.8 — it is not exempt as inline-in-a-sentence,
   because its paragraph holds no other text. */
const fallbackLink = css({
  minHeight: '24px',
  display: 'inline-flex',
  alignItems: 'center',
})

/**
 * The footer band. Rendered inside a `darkgray` ColorSection by Layout, so it
 * inherits that band's tokens like any other content.
 *
 * Its entire content is a live embed of misfitscentral.com plus a link to it.
 * The wordmark, section nav, social list and copyright line that used to live
 * here are gone — the owner's explicit call, not an accident of refactoring.
 *
 * The frame stays inside `.band-inner`'s 110rem measure rather than going
 * full-bleed. Both were rendered and compared: the framed page is a centred
 * fixed-width layout on a near-black background, so full-bleed only added black
 * margin at 1440px while losing any edge that says "this is an embed", and at
 * 390px it exposed a sliver of a second column at the viewport edge that read as
 * a bug. The gutter and border are what make it legible as a deliberate embed.
 */
export const Footer = () => (
  <div>
    <iframe
      class={frame}
      src="https://www.misfitscentral.com/"
      title="misfitscentral.com"
      loading="lazy"
    />

    <p class={fallback}>
      <a
        class={fallbackLink}
        href="https://www.misfitscentral.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        misfitscentral.com ↗
      </a>
    </p>
  </div>
)
