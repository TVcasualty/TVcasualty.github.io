import { defineConfig } from '@pandacss/dev'

import { colors, semanticColors } from './src/styles/theme/colors'
import { fonts, fontWeights } from './src/styles/theme/fonts'
import { breakpoints } from './src/styles/theme/breakpoints'
import { globalCss } from './src/styles/global'

export default defineConfig({
  preflight: true,

  include: ['./src/**/*.{ts,tsx}'],
  exclude: ['./node_modules/**', './dist/**', './styled-system/**'],
  outdir: 'styled-system',

  /* Typos in token names should fail `tsc --noEmit`, not fail silently at
     runtime as an invalid CSS value. */
  strictPropertyValues: true,

  /* Deliberately unset. Hono JSX is not a Panda-supported JSX runtime, so
     there are no `styled` / pattern components here: styles are authored as
     `css({...})` and the resulting class string is passed to `class=`
     (Hono uses `class`, not `className`). This is also why no Panda runtime
     JavaScript reaches the browser. */
  // jsxFramework: undefined,

  /**
   * The colour-band conditions (BRIEF §3.9).
   *
   * Paired with the semantic tokens in src/styles/theme/colors.ts, these
   * make Panda emit one `[data-color=x], x[data-color=x]` block per band,
   * each rebinding the same `--colors-*` variables — which is exactly the
   * play.date architecture from §3.3.
   *
   * The `&[data-color=x]` half of each selector is essential: without it a
   * band would recolour its descendants but not itself.
   *
   * This is also why the scroll script in src/client/nav.ts works by doing
   * nothing more than copying `data-color` onto <html>: the navbar then
   * inherits the active band's colours through the root attribute.
   */
  conditions: {
    extend: {
      /* Wide-gamut displays. Used by the brand colour tokens in
         src/styles/theme/colors.ts; expressing it as a condition is what puts
         the `@supports` override inside `@layer tokens`, where it actually
         wins. See the long comment on `wideGamutColors`. */
      p3: '@supports (color: color(display-p3 1 1 1 / 1))',

      bandYellow: '[data-color=yellow] &, &[data-color=yellow]',
      bandPurple: '[data-color=purple] &, &[data-color=purple]',
      bandGray: '[data-color=gray] &, &[data-color=gray]',
      bandDarkgray: '[data-color=darkgray] &, &[data-color=darkgray]',
      bandWhite: '[data-color=white] &, &[data-color=white]',
      bandBlack: '[data-color=black] &, &[data-color=black]',
      bandAqua: '[data-color=aqua] &, &[data-color=aqua]',
      bandAquaLight: '[data-color="aqua-light"] &, &[data-color="aqua-light"]',
    },
  },

  theme: {
    /* `breakpoints` (not `extend.breakpoints`) so Panda's 640/768/1024/1280/
       1536 defaults are replaced outright rather than merged. Mixing the two
       sets would give the design two competing responsive systems. */
    breakpoints,
    extend: {
      tokens: { colors, fonts, fontWeights },
      semanticTokens: { colors: semanticColors },
      keyframes: {
        blobble: {
          '0%': { borderRadius: '42% 58% 63% 37% / 47% 42% 58% 53%' },
          '100%': { borderRadius: '58% 42% 37% 63% / 53% 58% 42% 47%' },
        },
      },
    },
  },

  globalCss,
})
