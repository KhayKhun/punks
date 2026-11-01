import { getLines } from '../content/messages';

/**
 * Intro sequence configuration — the single place to tune timing and assets.
 *
 * Scroll distances are in "screens": 1 = one viewport height of scrolling.
 */

/** Darkness sweeps in from the right over [DARKNESS_START, DARKNESS_END]; then solid black until BLACK_END. */
const DARKNESS_START = 3.4;
const DARKNESS_LENGTH = 2;
const BLACK_HOLD = 1;
const DARKNESS_END = DARKNESS_START + DARKNESS_LENGTH;
const BLACK_END = DARKNESS_END + BLACK_HOLD;

export const introConfig = {
  video1: {
    /** Pre-extracted frames (see `npm run frames`). */
    frameCount: 152,
    framePath: (index: number) =>
      `/frames/video1/${String(index + 1).padStart(4, '0')}.jpg`,
  },
  video2: {
    src: '/media/video2.mp4',
  },
  scroll: {
    /** Scroll distance that scrubs video1 from first to last frame. */
    video1Scrub: 4.2,
    /** Where the darkness starts sweeping in from the right (overlaps the end of video1). */
    darknessStart: DARKNESS_START,
    /** Scroll distance for the darkness to fully cover the screen. */
    darknessLength: DARKNESS_LENGTH,
    /** Scroll distance of solid black before the auto sequence starts. */
    blackHold: BLACK_HOLD,
    /** Smoothing factor for the scrubbed frame (0–1, lower = smoother/laggier). */
    scrubSmoothing: 0.18,
    /** Where scrolling up from the white screen lands: near the end of video1, before the darkness. */
    rewindTo: 3.3,
  },
  captions: {
    /** Caption block centre as a share of the viewport — the golden-ratio point (right of and above centre). */
    anchor: { x: 0.618, y: 0.382 },
    /** Length of the glitch transition between phrases (ms). */
    glitchMs: 420,
    /** How long scroll stays locked on a `holdLines` phrase so it can be read (ms). */
    readHoldMs: 1000,
    /** Scroll-driven phrases: each cue's lines split its [from, to] range (in screens) evenly. */
    scroll: [
      // While video1 plays.
      { lines: [...getLines('wake', 0, 2), ...getLines('city', 0, 2)], from: 0, to: DARKNESS_START },
      // Only once the screen is fully black — plain background, so dead centre.
      {
        lines: getLines('city', 2, 4),
        from: DARKNESS_END,
        to: BLACK_END,
        anchor: { x: 0.5, y: 0.5 },
        // "sit down, shut up, fit in." comes right before the locked video2 — never let a
        // big scroll jump skip it.
        holdLines: [1],
      },
    ],
    /** Time-driven phrases on the white screen after video2. */
    white: {
      lines: getLines('city', 4, 5),
      /** Plain white screen — no busy background to dodge, so dead centre. */
      anchor: { x: 0.5, y: 0.5 },
      delayMs: 250,
      holdMs: 1600,
    },
  },
  timing: {
    /** Darkness recedes to the right revealing video2's first frame (ms, not scroll-controlled). */
    revealMs: 1000,
    /** White smoke from the top-left until fully white (ms). */
    smokeMs: 1000,
    /** The smoke starts this long before video2 ends (ms); video2 keeps playing underneath. */
    smokeLeadMs: 2000,
    /** Smoke clearing from white back to video1 when the user scrolls up (ms). */
    rewindMs: 1000,
    /** Safety net: if video2 never ends, continue anyway after its duration + this (ms). */
    playbackGraceMs: 2500,
  },
} as const;

export type IntroConfig = typeof introConfig;
