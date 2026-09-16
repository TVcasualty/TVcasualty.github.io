import { defineTokens, defineSemanticTokens } from '@pandacss/dev'

/**
 * Layer 1a — the fixed palette (BRIEF §3.2), for the colours that have no
 * wide-gamut variant. The saturated brand colours live in `wideGamutColors`
 * below instead; between the two, every colour is still declared exactly once.
 *
 * Keys are camelCase; Panda kebab-cases them into CSS variables, so
 * `psdDarkGray` is emitted as `--colors-psd-dark-gray`.
 */
export const colors = defineTokens.colors({
  darkestGray: { value: '#1d1c18' },
  psdDarkestGray: { value: '#212223' },
  screenBlack: { value: '#312f28' },
  darkGray: { value: '#57554e' },
  midGray: { value: '#7e7b75' },
  psdDarkGray: { value: '#7a8085' },
  psdMidGray: { value: '#64676c' },
  screenWhite: { value: '#b1afa8' },
  psdLightGray: { value: '#bbbbbb' },
  lightestGray: { value: '#f5f5f5' },
  psdLightestGray: { value: '#efefef' },
  white: { value: '#ffffff' },
  black: { value: '#000000' },

  readableRed: { value: '#ff6c42' },
  orange: { value: '#ef5023' },
  mutedPurple: { value: '#9d70db' },
  aquaDark: { value: '#127866' },
})

/**
 * Layer 1b — the saturated brand colours, each with a wide-gamut variant
 * (BRIEF §3.2). On a P3 display the yellow and the purple are noticeably
 * richer than their sRGB hex fallbacks.
 *
 * These are semantic rather than plain tokens on purpose, and this deviates
 * from BRIEF §3.9's suggestion to declare the `@supports` overrides as raw CSS
 * in `globalCss`. That approach silently does nothing: Panda emits `globalCss`
 * into `@layer base` but its token variables into `@layer tokens`, and since
 * `tokens` comes later in Panda's own `@layer reset, base, tokens, recipes,
 * utilities` order, the plain hex always beat the `@supports` override
 * regardless of specificity. Verified by inspecting the generated stylesheet.
 *
 * Expressing the variants as the `_p3` condition instead makes Panda emit the
 * `@supports` block *inside* `@layer tokens`, directly after the base
 * declaration, where it wins correctly. It also propagates for free: the band
 * tokens below resolve to `var(--colors-brand-yellow)`, so every band picks up
 * the wide-gamut value without repeating it.
 */
export const wideGamutColors = defineSemanticTokens.colors({
  brandYellow: {
    value: { base: '#ffc833', _p3: 'color(display-p3 1 0.784 0.2)' },
  },
  purple: {
    value: { base: '#6c00ff', _p3: 'color(display-p3 0.424 0 1)' },
  },
  darkPurple: {
    value: { base: '#4a00d1', _p3: 'color(display-p3 0.29 0 0.82)' },
  },
  red: {
    value: { base: '#ef5023', _p3: 'color(display-p3 0.937 0.314 0.137)' },
  },
  tomatoRed: {
    value: { base: '#ff004e', _p3: 'color(display-p3 1 0 0.306)' },
  },
  aqua: {
    value: { base: '#00a88a', _p3: 'color(display-p3 0 0.659 0.541)' },
  },
  aquaLight: {
    value: { base: '#21c6a9', _p3: 'color(display-p3 0.129 0.776 0.663)' },
  },
  lightGreen: {
    value: { base: '#90f8b7', _p3: 'color(display-p3 0.565 0.973 0.718)' },
  },
  lightBlue: {
    value: { base: '#a0d1ff', _p3: 'color(display-p3 0.627 0.82 1)' },
  },
})

/**
 * Layer 2 — semantic aliases, re-bound per colour band (BRIEF §3.3).
 *
 * Each value is a condition map keyed by the `band*` conditions declared in
 * panda.config.ts. Panda compiles this into exactly the play.date
 * architecture: one `:where(:root, :host)` block for `base`, plus a
 * `[data-color=x], x[data-color=x]` block per band that rebinds the same
 * `--colors-*` variables. Utilities like `bg: 'pageBg'` therefore recolour
 * themselves purely by sitting inside — or being — a band.
 *
 * Contrast note (BRIEF §6): on `brandYellow` the text token is `screenBlack`,
 * never white, because white on yellow fails 4.5:1.
 */
export const semanticColors = defineSemanticTokens.colors({
  ...wideGamutColors,

  pageBg: {
    value: {
      base: '{colors.psdDarkGray}',
      _bandGray: '{colors.psdDarkGray}',
      _bandDarkgray: '{colors.darkestGray}',
      _bandYellow: '{colors.brandYellow}',
      _bandWhite: '{colors.lightestGray}',
      _bandBlack: '{colors.black}',
      _bandPurple: '{colors.purple}',
      _bandAqua: '{colors.aquaDark}',
      _bandAquaLight: '{colors.aquaLight}',
    },
  },
  text: {
    value: {
      base: '{colors.white}',
      _bandGray: '{colors.white}',
      _bandDarkgray: '{colors.lightestGray}',
      _bandYellow: '{colors.screenBlack}',
      _bandWhite: '{colors.screenBlack}',
      _bandBlack: '{colors.white}',
      _bandPurple: '{colors.white}',
      _bandAqua: '{colors.white}',
      _bandAquaLight: '{colors.screenBlack}',
    },
  },
  /** Body copy and secondary labels: text, stepped back a little. */
  subtle: {
    value: {
      base: '{colors.psdLightestGray}',
      _bandGray: '{colors.psdLightestGray}',
      _bandDarkgray: '{colors.psdLightGray}',
      _bandYellow: '{colors.screenBlack}',
      _bandWhite: '{colors.darkGray}',
      _bandBlack: '{colors.psdLightGray}',
      _bandPurple: '{colors.lightBlue}',
      _bandAqua: '{colors.lightGreen}',
      _bandAquaLight: '{colors.screenBlack}',
    },
  },
  /** Hairlines, dividers and card borders. */
  subtler: {
    value: {
      base: '{colors.psdMidGray}',
      _bandGray: '{colors.psdMidGray}',
      _bandDarkgray: '{colors.darkGray}',
      _bandYellow: '{colors.screenBlack}',
      _bandWhite: '{colors.psdLightGray}',
      _bandBlack: '{colors.darkGray}',
      _bandPurple: '{colors.mutedPurple}',
      _bandAqua: '{colors.aquaLight}',
      _bandAquaLight: '{colors.aquaDark}',
    },
  },
  /** The band's own accent, for eyebrows and marks. */
  accent: {
    value: {
      base: '{colors.brandYellow}',
      _bandGray: '{colors.brandYellow}',
      _bandDarkgray: '{colors.brandYellow}',
      _bandYellow: '{colors.purple}',
      _bandWhite: '{colors.purple}',
      _bandBlack: '{colors.brandYellow}',
      _bandPurple: '{colors.brandYellow}',
      _bandAqua: '{colors.lightGreen}',
      _bandAquaLight: '{colors.purple}',
    },
  },
  /** Card surfaces sit slightly off the band background. */
  cardBg: {
    value: {
      base: '{colors.psdMidGray}',
      _bandGray: '{colors.psdMidGray}',
      _bandDarkgray: '{colors.screenBlack}',
      _bandYellow: '{colors.white}',
      _bandWhite: '{colors.white}',
      _bandBlack: '{colors.darkestGray}',
      _bandPurple: '{colors.darkPurple}',
      _bandAqua: '{colors.aqua}',
      _bandAquaLight: '{colors.white}',
    },
  },
  cardText: {
    value: {
      base: '{colors.white}',
      _bandGray: '{colors.white}',
      _bandDarkgray: '{colors.lightestGray}',
      _bandYellow: '{colors.screenBlack}',
      _bandWhite: '{colors.screenBlack}',
      _bandBlack: '{colors.lightestGray}',
      _bandPurple: '{colors.white}',
      _bandAqua: '{colors.white}',
      _bandAquaLight: '{colors.screenBlack}',
    },
  },
  buttonBg: {
    value: {
      base: '{colors.white}',
      _bandGray: '{colors.white}',
      _bandDarkgray: '{colors.brandYellow}',
      _bandYellow: '{colors.purple}',
      _bandWhite: '{colors.purple}',
      _bandBlack: '{colors.brandYellow}',
      _bandPurple: '{colors.brandYellow}',
      _bandAqua: '{colors.brandYellow}',
      _bandAquaLight: '{colors.purple}',
    },
  },
  buttonText: {
    value: {
      base: '{colors.psdDarkGray}',
      _bandGray: '{colors.psdDarkGray}',
      _bandDarkgray: '{colors.black}',
      _bandYellow: '{colors.white}',
      _bandWhite: '{colors.white}',
      _bandBlack: '{colors.black}',
      _bandPurple: '{colors.black}',
      _bandAqua: '{colors.black}',
      _bandAquaLight: '{colors.white}',
    },
  },
  /** The :focus-visible ring. Must stay visible against every band, so each
   *  band picks the ring colour with the most contrast against itself. */
  focusRing: {
    value: {
      base: '{colors.white}',
      _bandGray: '{colors.white}',
      _bandDarkgray: '{colors.brandYellow}',
      _bandYellow: '{colors.purple}',
      _bandWhite: '{colors.purple}',
      _bandBlack: '{colors.brandYellow}',
      _bandPurple: '{colors.brandYellow}',
      _bandAqua: '{colors.white}',
      _bandAquaLight: '{colors.purple}',
    },
  },
})
