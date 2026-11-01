import type { IntroConfig } from '../../../config/intro';
import { easeInOutSine, progressBetween } from '../../../lib/math';

export interface TimelineLayout {
  /** Total scroll distance (in screens) before the auto sequence triggers. */
  triggerAt: number;
  /** Track height in screens (scroll distance + the sticky viewport itself). */
  trackScreens: number;
}

export interface TimelineSample {
  /** 0–1 progress through video1's frames. */
  frame: number;
  /** 0–1 coverage of the darkness overlay (0 = none, 1 = fully black). */
  darkness: number;
  /** True once the user has scrolled to the end of the black hold. */
  triggered: boolean;
  /** Message line (and where to place it) at this scroll position, or null between cues. */
  caption: SampledCaption | null;
}

export interface CaptionCue {
  lines: readonly string[];
  /** Scroll range in screens; `from` inclusive, `to` exclusive. */
  from: number;
  to: number;
  /** Placement override (share of the stage, 0–1); defaults to `captions.anchor`. */
  anchor?: { readonly x: number; readonly y: number };
  /** Indexes of lines that must not be scrolled past unread (see `getCaptionHolds`). */
  holdLines?: readonly number[];
}

export interface CaptionHold {
  /** Scroll position (screens) where the held line starts; crossing it downwards triggers the hold. */
  at: number;
  /** Where to snap the scroll so the held line is on screen. */
  snapTo: number;
}

/** Share of a line's scroll segment to snap into — far enough in that the line is clearly showing. */
const HOLD_SNAP_INTO_SEGMENT = 0.25;

/** Reading holds: one per `holdLines` entry, at the start of that line's scroll segment. */
export function getCaptionHolds(cues: readonly CaptionCue[]): CaptionHold[] {
  return cues.flatMap((cue) => {
    const segment = (cue.to - cue.from) / cue.lines.length;
    return (cue.holdLines ?? []).map((index) => {
      const at = cue.from + index * segment;
      return { at, snapTo: at + segment * HOLD_SNAP_INTO_SEGMENT };
    });
  });
}

export interface SampledCaption {
  line: string;
  anchor?: CaptionCue['anchor'];
}

/** Picks the line for a scroll position: each cue's lines share its range evenly. */
export function sampleCaption(screens: number, cues: readonly CaptionCue[]): SampledCaption | null {
  const cue = cues.find((c) => screens >= c.from && screens < c.to);
  if (!cue || cue.lines.length === 0) return null;
  const local = (screens - cue.from) / (cue.to - cue.from);
  const line = cue.lines[Math.min(cue.lines.length - 1, Math.floor(local * cue.lines.length))];
  return { line, anchor: cue.anchor };
}

export function getTimelineLayout({ scroll }: IntroConfig): TimelineLayout {
  const darknessEnd = scroll.darknessStart + scroll.darknessLength;
  const triggerAt = Math.max(scroll.video1Scrub, darknessEnd) + scroll.blackHold;
  return { triggerAt, trackScreens: triggerAt + 1 };
}

/** Pure mapping from scroll position (in screens) to visual state. */
export function sampleTimeline(screens: number, config: IntroConfig): TimelineSample {
  const { scroll, captions } = config;
  const { triggerAt } = getTimelineLayout(config);
  return {
    frame: progressBetween(screens, 0, scroll.video1Scrub),
    darkness: easeInOutSine(
      progressBetween(screens, scroll.darknessStart, scroll.darknessStart + scroll.darknessLength),
    ),
    triggered: screens >= triggerAt,
    caption: sampleCaption(screens, captions.scroll),
  };
}
