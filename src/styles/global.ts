import { defineGlobalStyles } from '@pandacss/dev'

/**
 * Hand-written global CSS.
 *
 * Everything here is in this file for one of the reasons BRIEF §3.9 gives:
 * it is a long literal declaration that Panda's `css()` would only obscure
 * (the four-layer button shadows, the radial glow), it targets bare elements
 * or stateful sibling selectors (typography defaults, the CSS-only menu), or
 * it overrides Panda's own generated variables (the wide-gamut palette).
 *
 * Component-level layout and spacing lives in `css()` calls instead.
 * Token references such as `color: 'text'` are resolved by Panda, so these
 * rules still recolour per colour band.
 */
export const globalCss = defineGlobalStyles({
  /* ------------------------------------------------------------------ *
   * Self-hosted typeface (BRIEF §2.7)
   *
   * One variable woff2, latin subset only, pulled from the Google Fonts
   * API at build-setup time and committed to public/fonts. The
   * unicode-range is verbatim from that stylesheet's `latin` block, so the
   * browser skips the download entirely for non-latin text. There is no
   * runtime request to Google.
   * ------------------------------------------------------------------ */
  '@font-face': {
    fontFamily: 'Plus Jakarta Sans',
    fontStyle: 'normal',
    fontWeight: '300 800',
    fontDisplay: 'swap',
    src: "url('/fonts/PlusJakartaSans[wght].woff2') format('woff2')",
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },

  /* ------------------------------------------------------------------ *
   * The fluid root-font scaling ladder (BRIEF §3.1)
   *
   * Every length in the design is a rem, and the root font size is driven
   * by viewport width, so the whole layout scales proportionally with
   * almost no per-component media queries. At >= 1100px scaling stops and
   * 1rem === 10px exactly, which is why every rem below reads as
   * "pixels / 10".
   *
   * 0.909090909091vw is 100vw / 110 and is load-bearing: it is what makes
   * a 110rem container exactly fill the viewport at the fluid sizes.
   *
   * Deliberately raw @media strings, not Panda breakpoint conditions —
   * see the note in src/styles/theme/breakpoints.ts.
   * ------------------------------------------------------------------ */
  html: {
    fontSize: '2.4px',
    /* Overscroll at the very top and bottom of the page shows the colour of
       the first and last band rather than white. Once nav.js starts
       mirroring the active band onto <html>, the solid colour below takes
       over — see the html[data-color] rule.

       The two stops are literally the first and last band's pageBg, so they
       have to be kept in step with Layout: darkGray is the gray hero, and the
       bottom stop is black because the footer band is `black` (it was
       darkestGray while that band was darkgray). This only shows with JS off
       or before nav.js boots, but getting it wrong means bottom rubber-band
       overscroll flashes a warm gray against the footer embed's pure black. */
    backgroundColor: 'pageBg',
    backgroundImage:
      'linear-gradient(to bottom, {colors.darkGray} 0 50%, {colors.black} 50% 100%)',
    backgroundAttachment: 'fixed',
  },
  'html[data-color]': {
    backgroundImage: 'none',
  },
  body: {
    fontSize: '4rem',
    fontFamily: 'body',
    fontWeight: 'normal',
    lineHeight: '1.3',
    margin: '0',
    backgroundColor: 'pageBg',
    color: 'text',
    WebkitFontSmoothing: 'antialiased',
    textRendering: 'optimizeLegibility',
  },
  '@media screen and (min-width: 240px)': {
    html: { fontSize: '0.909090909091vw' },
    body: { fontSize: '3.85rem' },
  },
  '@media screen and (min-width: 670px)': {
    body: { fontSize: '2.85rem' },
    /* Desktop navbar clearance for the hero. Declared here rather than in a
       second @media block, since a duplicate key would silently drop one of
       them; see the note on #hero's paddingTop. */
    '#hero': { paddingTop: '14rem' },
    /* Every band is at least one viewport tall from tablet up (owner's call),
       including the hero and the footer — no band is special-cased. This is a
       floor, not a fixed height: Work's cards and Stack's spec sheet can exceed
       one viewport, and `height` would either clip them or nest a scrollbar.

       Gated at 670px because on a phone the same floor stranded short bands in
       a screenful of empty colour. Below this width bands size to content.

       100vh comes first as the fallback for engines without `dvh`, which fail
       to parse the second declaration and keep the first. The nested `&`
       re-emits the selector as a second rule, since Panda's object model
       cannot hold two `min-height` keys and an array value emits invalid CSS. */
    '.colorsection': {
      minHeight: '100vh',
      '&': { minHeight: '100dvh' },
    },
  },
  '@media screen and (min-width: 1100px)': {
    html: { fontSize: '10px' },
  },

  /* Several decorative elements deliberately overflow the viewport
     (BRIEF §3.8), so this is required, not defensive. */
  'html, body': {
    overflowX: 'hidden',
  },

  /* Deep links must clear the fixed navbar. scroll-snap-margin-top is the
     pre-standard spelling, kept for Safari < 14.5 (BRIEF §3.4). */
  ':target': {
    scrollMarginTop: '4em',
    scrollSnapMarginTop: '4em',
  },

  /* ------------------------------------------------------------------ *
   * Typographic scale (BRIEF §3.6)
   *
   * Sizes are in em so they compound off the fluid body size. Note that
   * <em> is rendered bold and upright: this design never italicises.
   * ------------------------------------------------------------------ */
  h1: {
    fontSize: '1.8em',
    fontWeight: 'black',
    lineHeight: '1',
    letterSpacing: '-0.02em',
    margin: '0 0 0.5em 0',
    textWrap: 'balance',
  },
  'section h2': {
    fontSize: '2.4em',
    fontWeight: 'black',
    lineHeight: '1',
    letterSpacing: '-0.02em',
    margin: '6rem auto 3rem auto',
    textWrap: 'balance',
  },
  h3: {
    fontSize: '1.25em',
    fontWeight: 'bold',
    lineHeight: '1.1',
    letterSpacing: '-0.0075em',
    margin: '0 0 0.4em 0',
    textWrap: 'balance',
  },
  h4: {
    fontSize: '1em',
    fontWeight: 'bold',
    lineHeight: '1.2',
    margin: '0 0 0.4em 0',
  },
  'section p': {
    fontSize: '1em',
    lineHeight: '1.3em',
    margin: '0 0 1em 0',
    textWrap: 'pretty',
  },
  a: {
    color: 'inherit',
    textDecoration: 'underline',
    textDecorationThickness: '0.08em',
    textUnderlineOffset: '0.16em',
  },
  'strong, em': {
    fontWeight: 'bold',
    fontStyle: 'normal',
  },
  'strong > em, em > strong': {
    fontWeight: 'black',
  },
  'ul, ol': {
    margin: '0',
    padding: '0',
    listStyle: 'none',
  },

  /* ------------------------------------------------------------------ *
   * Minimum tap target (WCAG 2.2 §2.5.8)
   *
   * The one place px is correct rather than rem. Everything else scales with
   * the fluid ladder, which is the point of the design — but it scales
   * interactive padding too, so at 390px footer links rendered 16px tall and
   * at 320px only 12px. A finger is the same size at every viewport, so the
   * floor has to be an absolute length; in rem it would shrink exactly where
   * it is needed most.
   *
   * 24px is the AA bar. Applied as a floor via min-height with centred
   * content, so it is a no-op wherever the natural height already clears it
   * (at >=1100px these links are 33px) and never shifts the desktop layout.
   *
   * Deliberately not done with an expanded ::after overlay: list items sit
   * ~18px apart on a phone, so 24px overlays would overlap each other and
   * steal one another's taps. The spacing genuinely needs to grow.
   * ------------------------------------------------------------------ */
  'li a, div.button a, .whopper-panel a': {
    minHeight: '24px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  'img, svg': {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
  },
  hr: {
    border: '0',
    borderTop: '0.2rem solid',
    borderColor: 'subtler',
    margin: '4rem 0',
  },

  /* Visible against every band, because `focusRing` is itself a per-band
     semantic token (BRIEF §6). */
  ':focus-visible': {
    outlineWidth: '0.3rem',
    outlineStyle: 'solid',
    outlineColor: 'focusRing',
    outlineOffset: '0.3rem',
    borderRadius: '0.4rem',
  },

  '.visually-hidden': {
    clipPath: 'inset(50%)',
    height: '1px',
    width: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    border: '0',
    padding: '0',
    margin: '-1px',
  },

  /* `nojs` starts on <body> and is removed by nav.js on boot, so anything
     that genuinely needs script is hidden by default (BRIEF §3.8). */
  '.nojs [data-js-only]': {
    display: 'none',
  },

  /* ------------------------------------------------------------------ *
   * Buttons (BRIEF §3.7)
   *
   * The padding is asymmetric on purpose: .25em top against .35em bottom
   * optically centres a cap-height label inside a pill. Do not "tidy" it.
   * ------------------------------------------------------------------ */
  'div.button': {
    display: 'inline-block',
    width: 'fit-content',
    borderRadius: '1em',
    padding: '0.25em 0.7em 0.35em 0.7em',
    margin: '2rem auto',
    backgroundColor: 'buttonBg',
    color: 'buttonText',
    textAlign: 'center',
    lineHeight: '1.15',
  },
  'div.button a': {
    textDecoration: 'none',
    fontWeight: 'bold',
    letterSpacing: '-0.0075em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4em',
  },
  'div.button.big': {
    fontSize: '1.25em',
  },
  'div.button.center': {
    display: 'block',
  },

  /* ------------------------------------------------------------------ *
   * Colour bands
   *
   * The colour itself comes from the `band*` conditions in
   * panda.config.ts, driven by each band's data-color attribute. Only the
   * shared box model lives here.
   * ------------------------------------------------------------------ */
  /* The band floor lives in the 670px block below, not here: at phone widths a
     one-viewport minimum left short bands (Writing, Contact, the footer) with
     large empty gaps, so below 670px bands size to their own content.

     `justify-content: center` is unconditional and does nothing on mobile,
     where the box height equals the content height. It only takes effect once
     the floor applies and the box is taller than what is in it — otherwise
     every short band would stack its copy at the top and dump the slack at the
     bottom. Centring is safe against the usual flexbox trap: min-height means
     the box grows to fit content, so content never overflows its container. */
  '.colorsection': {
    position: 'relative',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '6rem 2rem 8rem 2rem',
    /* Side padding gets a px floor layered under the rem value, the same
       treatment the tap-target minimum and the navbar clearance already get.

       2rem is 20px at >=1100px, which is the gutter this design wants — but it
       is tied to the fluid ladder, so it falls to 12.2px at 670px, 7.1px at
       390px and 5.8px at 320px. Every band's content was running almost to the
       bezel on a phone, which is exactly where a gutter matters most.

       A floor rather than a replacement: `max()` yields 16px wherever the rem
       value is smaller (everything below ~880px) and hands back to 2rem above
       that, so desktop keeps scaling untouched and only the widths that were
       broken change. Longhands follow the shorthand deliberately — they are
       overriding its left/right components, not restating them. */
    paddingLeft: 'max(2rem, 16px)',
    paddingRight: 'max(2rem, 16px)',
    backgroundColor: 'pageBg',
    color: 'text',
  },
  '.colorsection > .band-inner': {
    maxWidth: '110rem',
    margin: '0 auto',
    width: '100%',
  },

  /* The hero is not special-cased: it takes the same band floor as everything
     else (above 670px only), rather than the 80vh it used to carry.

     paddingTop is navbar clearance, and it is asymmetric on purpose. The bar
     is fixed, so it covers the top of this band: centring the content in the
     full box would sit it visually low, since the top of that box is hidden.
     Making paddingTop = paddingBottom + navbar-height centres the content in
     the part of the band you can actually see.

     Measured navbar heights are ~33px below 670px and ~68px above it, and the
     bar scales with the fluid rem ladder while a px value does not — hence the
     px floor for phones (28px bottom padding + 33px bar ≈ 64px) and the rem
     value for desktop (80px + 68px ≈ 148px, which is what 14rem already was). */
  '#hero': {
    paddingTop: '64px',
    isolation: 'isolate',
  },

  /* ------------------------------------------------------------------ *
   * Footer band: the full-bleed embed
   *
   * The footer's entire content is one iframe that has to touch all four edges
   * of its band, so this cancels the band's own gutter and measure. It is scoped
   * to `footer.colorsection` rather than done with a utility class because it is
   * a property of this one band, and because it has to beat the `.colorsection`
   * rule above on specificity — that rule sets side padding with `max()`
   * longhands, so a plain `padding: 0` from a lower-specificity selector would
   * lose to them and leave a visible side gutter.
   *
   * Zeroing the padding also removes the asymmetric 6rem/8rem vertical padding,
   * which is what would otherwise show as a dark strip above and below the frame.
   *
   * The band keeps its `min-height: 100dvh` floor from above; it is not fighting
   * the iframe's `100vh`, since `vh >= dvh` means the content is always at least
   * as tall as the floor. No `justify-content` override is needed for the same
   * reason: with the box exactly as tall as its one child, centring is a no-op.
   * ------------------------------------------------------------------ */
  'footer.colorsection': {
    padding: '0',
    paddingLeft: '0',
    paddingRight: '0',
    /* Reserved space for the transparent navbar, so the embed's light banner logo
       never passes under the bar's white text. See Footer.tsx for the measurement
       (the logo is rgb(190,190,190) and starts ~3px into the framed page, giving
       1.86:1 against white) and for why the frame's height subtracts the same 8rem
       — together they keep the band exactly one viewport tall.

       Declared after the `padding: 0` shorthand above, deliberately: the shorthand
       would otherwise reset it. Panda preserves this order within one rule. */
    paddingTop: '8rem',
  },
  /* `.band-inner`'s 110rem cap is what makes every other band a centred column,
     and it is exactly what must not apply here: capped at 110rem the frame would
     sit as a boxed widget in the middle of a wide screen. Overridden rather than
     omitted from the markup so ColorSection stays one component with one shape
     for every band. */
  'footer.colorsection > .band-inner': {
    maxWidth: 'none',
    width: '100%',
    margin: '0',
  },

  /* ------------------------------------------------------------------ *
   * Footer band: hidden below 720px
   *
   * The framed page is a fixed 720px layout that does not reflow — measured
   * directly off the frame's own `scrollWidth`, which is 720px at every viewport
   * and never smaller. Below that the full-bleed embed simply clips it: 50px lost
   * at 670px, 290px at 430px, 330px at 390px, slicing text mid-word at the right
   * edge. That was previously documented as an accepted artifact; it is now
   * hidden instead, on the owner's call.
   *
   * 720px is the frame's own fit width rather than a device size, and it lands
   * below the narrowest current iPad (744px portrait), so every iPad still gets
   * the embed and no viewport ever sees a clipped one. Spelled as its own key —
   * `max-width` here, not another `min-width: 670px` block — because these are
   * object keys and Panda silently drops a duplicate.
   *
   * `display: none` on the band, not on the iframe: hiding only the frame would
   * leave a full-viewport-tall black band with nothing in it. Removing the band
   * from layout entirely makes Contact the last band on a phone, which has two
   * knock-on effects handled below: `main` has to fill the viewport, or a short
   * page exposes the html background where the footer used to be, and the
   * overscroll gradient's bottom stop has to follow the new last band.
   * ------------------------------------------------------------------ */
  '@media screen and (max-width: 719px)': {
    'footer.colorsection': {
      display: 'none',
    },
    /* Removing the last band leaves a gap on any page whose remaining content is
       shorter than the screen, and that gap is not "nothing" — it exposes the
       <html> background underneath. Measured on 404.html: its single 506px hero
       left 338px of bare html showing at 390x844, which rendered as the gradient's
       bottom stop, a hard colour break below the hero on a page that is supposed
       to be one flat colour.

       Fixed by making the content fill the screen rather than by colouring the
       gap, so there is no second place where a band colour is written down. `main`
       gets the viewport floor and its last band absorbs the slack; `.colorsection`
       is already a centring flex column, so a grown band centres its content
       instead of stranding it at the top.

       Scoped to `main >` deliberately: the footer band is a sibling of main, not
       inside it, so this cannot fight the hide above. dvh layered over vh the same
       way the desktop band floor does it, for the mobile browser chrome. */
    main: {
      minHeight: '100vh',
      '&': { minHeight: '100dvh' },
      display: 'flex',
      flexDirection: 'column',
    },
    'main > .colorsection:last-child': {
      flexGrow: '1',
    },
    /* The gradient hard-codes the first and last band's colours for rubber-band
       overscroll, and it only shows with JS off or before nav.js boots — once it
       runs, `html[data-color]` replaces it with the active band's solid colour.

       With the footer band gone the bottom stop follows the new last band to
       purple. Honest limitation, since one gradient serves both pages: purple is
       correct for index.html, whose last band is Contact, and wrong for 404.html,
       whose last band is the gray hero. It is still strictly better than the black
       it replaced, which was wrong for both, and it is now only reachable by
       overscrolling past the bottom with JavaScript disabled — the fill above
       means no part of the resting page shows it. */
    html: {
      backgroundImage:
        'linear-gradient(to bottom, {colors.darkGray} 0 50%, {colors.purple} 50% 100%)',
    },
  },

  /* ------------------------------------------------------------------ *
   * Navbar (BRIEF §3.4)
   *
   * Fixed and transparent until nav.js adds `.scrolled`, at which point it
   * takes the active band's own background and a hard rule underneath.
   * nav.js also mirrors data-color onto #navbar, so the tokens below
   * rebind to whichever band is under the bar.
   * ------------------------------------------------------------------ */
  '#navbar': {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '101010',
    width: '100%',
    backgroundColor: 'transparent',
    borderBottom: '0.2rem solid transparent',
    color: 'text',
  },
  '#navbar.scrolled': {
    backgroundColor: 'pageBg',
    borderBottomColor: 'text',
  },
  /* The footer band is the exception: over the embed the bar goes fully
     transparent — no background, no rule underneath — so the framed site reads
     as occupying the screen rather than sitting under a chrome bar. Everything
     else about the bar is unchanged; the links keep `text`, which on this band is
     white and measures 21:1 against the embed's pure black.

     Keyed off `data-color` rather than a footer-specific class because nav.js
     already mirrors the active band's colour onto `#navbar`, and `black` is the
     footer band's colour on both pages and nowhere else. It beats the
     `.scrolled` rule above on specificity — one id, two class-level selectors
     against one id and one class — so source order is not what is holding this
     together. */
  '#navbar.scrolled[data-color="black"]': {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  /* A hedge, explicitly NOT the fix. The fix is geometric: the band reserves 8rem
     at its top and the frame subtracts it, so the bar sits over the band's own
     black at every size (see Footer.tsx). This shadow only covers the case where
     the third-party page changes its layout and puts something light back under
     the bar — the embed is not ours and can change without this repo changing.

     Measured honestly, so it is not mistaken for a guarantee: with the frame
     deliberately pushed back under the bar, the shadow moved the worst backdrop
     from 1.88:1 to 2.12:1. That is a real improvement in edge definition and it is
     nowhere near AA's 4.5:1, which is why it could not be the fix on its own.
     WCAG has no mechanism for crediting a text shadow either, and
     check-contrast.py cannot see cross-origin pixels in any case. */
  '#navbar.scrolled[data-color="black"] a': {
    textShadow:
      '0 0 0.25em {colors.black}, 0 0 0.5em {colors.black}, 0 0 1em {colors.black}',
  },
  '#navbar .nav-inner': {
    display: 'flex',
    gap: '0.5em',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '130rem',
    margin: '0 auto',
    padding: '1rem',
    fontSize: '0.77em',
  },
  '#navbar li': {
    fontWeight: 'bold',
    letterSpacing: '-0.0075em',
    borderRadius: '1em',
  },
  '#navbar a': {
    textDecoration: 'none',
    /* See the tap-target note above: 24px floor in px, not rem, so it does
       not shrink on the phones that need it. */
    minHeight: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25em 0.5em 0.35em 0.5em',
    borderRadius: '1em',
    position: 'relative',
  },
  '#navbar .nav-brand a': {
    fontWeight: 'black',
    paddingLeft: '0.25em',
  },
  /* Hover affordance is a pseudo-element underline rather than
     text-decoration, so it can be inset and animated independently. */
  '#navbar a::after': {
    content: '""',
    position: 'absolute',
    left: '0.5em',
    right: '0.5em',
    bottom: '0.2em',
    height: '0.15em',
    borderRadius: '0.1em',
    backgroundColor: 'currentColor',
    transform: 'scaleX(0)',
    transformOrigin: 'left center',
  },
  '#navbar a:hover::after, #navbar a:focus-visible::after': {
    transform: 'scaleX(1)',
  },

  /* The mobile menu is CSS-only: a checkbox drives it, so it works with
     JavaScript disabled (BRIEF §6). The input is laid transparently over
     its own label, which keeps it clickable, focusable and space-toggleable
     without display:none breaking keyboard access. */
  '#navbar .nav-menu': {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  '.whopper-input': {
    position: 'absolute',
    top: '0',
    right: '0',
    /* Must match .whopper-label exactly — this invisible input is the real
       hit area sitting over it. Both carry the 24px floor. */
    width: '3.6em',
    minWidth: '44px',
    height: '2.4em',
    minHeight: '24px',
    margin: '0',
    opacity: '0',
    cursor: 'pointer',
    zIndex: '2',
  },
  '.whopper-label': {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0.45em',
    width: '3.6em',
    minWidth: '44px',
    height: '2.4em',
    minHeight: '24px',
    padding: '0 0.7em',
    borderRadius: '1em',
    boxSizing: 'border-box',
  },
  '.whopper-bar': {
    display: 'block',
    height: '0.2em',
    borderRadius: '0.1em',
    backgroundColor: 'currentColor',
  },
  '.whopper-input:focus-visible + .whopper-label': {
    outlineWidth: '0.3rem',
    outlineStyle: 'solid',
    outlineColor: 'focusRing',
    outlineOffset: '0.3rem',
  },
  '.whopper-panel': {
    position: 'absolute',
    top: 'calc(100% + 1rem)',
    right: '0',
    /* `em`, not `rem`. A 22rem panel is 220px at desktop but only 78px at
       390px, because rem shrinks with the fluid ladder — the panel became a
       narrow strip barely wider than the word "Contact". em tracks the
       navbar's own type size, so the panel stays proportional to its links at
       every width. */
    minWidth: '11em',
    display: 'none',
    padding: '1rem',
    borderRadius: '1.5em',
    border: '0.2rem solid',
    borderColor: 'text',
    backgroundColor: 'pageBg',
    boxShadow: '0 0.4rem 1.2rem rgba(0, 0, 0, 0.25)',
  },
  '.whopper-input:checked ~ .whopper-panel': {
    display: 'block',
  },
  '.whopper-panel ul': {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2em',
  },
  '.whopper-panel a': {
    display: 'block',
  },

  /* From 670px the menu is always open and inline, and the toggle is gone
     for everyone including screen readers.

     Note the media query is spelled `@media (min-width: 670px)` rather than
     `@media screen and (min-width: 670px)`: these are object keys, so
     reusing the exact string used by the scaling ladder above would
     silently overwrite it. Same breakpoint, distinct key. */
  '@media (min-width: 670px)': {
    '.whopper-input, .whopper-label': {
      display: 'none',
    },
    '.whopper-panel': {
      display: 'block',
      position: 'static',
      minWidth: '0',
      padding: '0',
      border: '0',
      borderRadius: '0',
      backgroundColor: 'transparent',
      boxShadow: 'none',
    },
    '.whopper-panel ul': {
      flexDirection: 'row',
      gap: '0.5em',
    },
  },

  /* ------------------------------------------------------------------ *
   * Motion — everything decorative is opt-in (BRIEF §6)
   * ------------------------------------------------------------------ */
  '@media (prefers-reduced-motion: no-preference)': {
    html: {
      scrollBehavior: 'smooth',
    },
    '#navbar': {
      transitionProperty: 'background-color, border-color',
      transitionDuration: '250ms',
      transitionTimingFunction: 'ease-in-out',
    },
    'html, body': {
      transitionProperty: 'background-color',
      transitionDuration: '250ms',
      transitionTimingFunction: 'ease-in-out',
    },
    '#navbar a::after': {
      transitionProperty: 'transform',
      transitionDuration: '150ms',
      transitionTimingFunction: 'ease-out',
    },
    'div.button, div.button a': {
      transitionProperty: 'background-color, box-shadow, transform, padding',
      transitionDuration: '120ms',
      transitionTimingFunction: 'ease-out',
    },
    '.blobble': {
      animationName: 'blobble',
      animationDuration: '5s',
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
      animationTimingFunction: 'ease-in-out',
    },
  },

  /* ------------------------------------------------------------------ *
   * Wide-gamut palette — deliberately NOT here.
   *
   * BRIEF §3.9 suggests declaring the `@supports (color: color(display-p3 …))`
   * overrides as raw CSS in this file. That is silently dead: Panda emits
   * globalCss into `@layer base` but token variables into `@layer tokens`,
   * which comes later in the cascade order and always wins.
   *
   * The wide-gamut values are therefore expressed as the `_p3` condition on
   * the brand colour tokens instead, which lands them inside `@layer tokens`.
   * See src/styles/theme/colors.ts.
   * ------------------------------------------------------------------ */
})
