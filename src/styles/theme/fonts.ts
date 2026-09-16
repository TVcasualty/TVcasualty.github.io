import { defineTokens } from '@pandacss/dev'

/**
 * Plus Jakarta Sans is self-hosted from public/fonts (BRIEF §2.7): a single
 * variable woff2, latin subset, weight axis 300–800. The @font-face rule and
 * its unicode-range live in src/styles/global.ts.
 */
export const fonts = defineTokens.fonts({
  body: {
    value: [
      'Plus Jakarta Sans',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Helvetica',
      'Arial',
      'sans-serif',
    ],
  },
  mono: {
    value: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
  },
})

/** The weight ladder Plus Jakarta Sans shares with Playdate's Roobert. */
export const fontWeights = defineTokens.fontWeights({
  light: { value: '300' },
  normal: { value: '400' },
  medium: { value: '500' },
  bold: { value: '700' },
  black: { value: '800' },
})
