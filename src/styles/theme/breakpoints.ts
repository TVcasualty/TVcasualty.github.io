/**
 * The design has exactly three breakpoints (BRIEF §3.1 / §3.9): 240px, where
 * the fluid root font size takes over from the 2.4px floor; 670px, where the
 * grids collapse; and 1100px, where scaling stops and `1rem === 10px`.
 *
 * This replaces Panda's defaults (640/768/1024/1280/1536) rather than
 * extending them, so the two systems can never be mixed by accident. Panda
 * has no `defineBreakpoints` helper, so the record is typed by hand.
 */
export const breakpoints: Record<'sm' | 'md' | 'lg', string> = {
  sm: '240px',
  md: '670px',
  lg: '1100px',
}
