import { clamp } from './math';

export interface TweenOptions {
  duration: number;
  onUpdate: (t: number) => void;
  easing?: (t: number) => number;
}

/**
 * Time-based 0→1 tween on requestAnimationFrame.
 * Returns `{ promise, cancel }`; the promise resolves when the tween finishes.
 */
export function tween({ duration, onUpdate, easing = (t) => t }: TweenOptions) {
  let frame = 0;
  let cancelled = false;

  const promise = new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      if (cancelled) return;
      // rAF timestamps can predate `start`, so clamp to keep t within 0–1.
      const t = clamp((now - start) / duration);
      onUpdate(easing(t));
      if (t < 1) frame = requestAnimationFrame(step);
      else resolve();
    };
    frame = requestAnimationFrame(step);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    },
  };
}
