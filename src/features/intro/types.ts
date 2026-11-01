/**
 * Phases of the intro, in order.
 * - loading:  preloading video1 frames, scroll locked
 * - scrub:    scroll scrubs video1 and sweeps in the darkness (reversible)
 * - reveal:   darkness recedes over video2's first frame (timed, scroll locked)
 * - playing:  video2 plays to the end (scroll locked)
 * - smoke:    white smoke wipes from the top-left to full white (scroll locked)
 * - done:     white screen, scroll unlocked; scrolling back up starts `rewind`
 * - rewind:   white clears back into smoke over the end of video1, then → scrub (scroll locked)
 */
export type IntroPhase =
  | 'loading'
  | 'scrub'
  | 'reveal'
  | 'playing'
  | 'smoke'
  | 'done'
  | 'rewind';

export const SCROLL_LOCKED_PHASES: ReadonlySet<IntroPhase> = new Set([
  'loading',
  'reveal',
  'playing',
  'smoke',
  'rewind',
]);
