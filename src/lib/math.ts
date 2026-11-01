export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Maps `value` from [start, end] to [0, 1], clamped. */
export const progressBetween = (value: number, start: number, end: number) =>
  end === start ? (value >= end ? 1 : 0) : clamp((value - start) / (end - start));

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

