import { useEffect, useRef } from 'react';
import { syncCanvasSize } from '../../../lib/canvas';
import { tween } from '../../../lib/tween';
import { createSmokeTransition } from '../lib/smoke';
import styles from './SmokeTransition.module.css';

/** Extra time before the safety timer forces completion, so the user is never left scroll-locked. */
const SAFETY_MARGIN_MS = 600;

/** Snaps the canvas to where a transition would have ended: fully white ('in') or clear ('out'). */
function paintEndState(canvas: HTMLCanvasElement, reverse: boolean, reducedMotion?: boolean) {
  if (reducedMotion) {
    canvas.style.opacity = reverse ? '0' : '1';
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!reverse) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/** 'in' = smoke rolls in to full white; 'out' = white clears back out to the corner. */
export type SmokeMode = 'in' | 'out';

interface SmokeTransitionProps {
  /** Starts a transition when set; null leaves the canvas as it is. */
  mode: SmokeMode | null;
  durationMs: number;
  /** Plain white fade instead of particles. */
  reducedMotion?: boolean;
  onComplete: () => void;
}

/** White smoke from the top-left corner, to or from a fully white screen. */
export function SmokeTransition({ mode, durationMs, reducedMotion, onComplete }: SmokeTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!mode || !canvas) return;
    const reverse = mode === 'out';

    // Completes exactly once — from the animation, or from the safety timer if it never finishes.
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      onCompleteRef.current();
    };
    let stop = () => {};
    const forceEnd = () => {
      stop();
      paintEndState(canvas, reverse, reducedMotion);
      complete();
    };
    const safety = window.setTimeout(forceEnd, durationMs + SAFETY_MARGIN_MS);

    if (reducedMotion) {
      const fade = tween({
        duration: durationMs,
        onUpdate: (t) => (canvas.style.opacity = String(reverse ? 1 - t : t)),
      });
      fade.promise.then(complete);
      stop = fade.cancel;
    } else {
      syncCanvasSize(canvas, 1.5);
      const smoke = createSmokeTransition(canvas, { durationMs });
      smoke.play({ reverse }).then(complete);
      stop = smoke.destroy;
    }

    return () => {
      completed = true;
      window.clearTimeout(safety);
      stop();
    };
  }, [mode, durationMs, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      data-reduced={reducedMotion || undefined}
      aria-hidden
    />
  );
}
