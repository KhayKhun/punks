import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { drawCover, syncCanvasSize } from '../../../lib/canvas';
import { lerp } from '../../../lib/math';
import styles from './FrameScrubber.module.css';

export interface FrameScrubberHandle {
  /** Call once per animation frame with the target progress (0–1). */
  update: (progress: number) => void;
  /** Shows the frame at `progress` (0–1) immediately, skipping the smoothing. */
  jumpTo: (progress: number) => void;
}

interface FrameScrubberProps {
  images: HTMLImageElement[];
  /** 0–1; lower = smoother but laggier frame changes. */
  smoothing: number;
  hidden?: boolean;
  ref?: Ref<FrameScrubberHandle>;
}

/** Full-screen canvas that shows an image sequence at a scroll-driven position. */
export function FrameScrubber({ images, smoothing, hidden, ref }: FrameScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef(0);
  const drawn = useRef(-1);

  const draw = useCallback(
    (index: number, force = false) => {
      const ctx = canvasRef.current?.getContext('2d');
      const image = images[index];
      if (!ctx || !image?.naturalWidth) return;
      if (!force && index === drawn.current) return;
      drawCover(ctx, image);
      drawn.current = index;
    },
    [images],
  );

  useImperativeHandle(ref, () => ({
    update(progress) {
      if (!images.length || !Number.isFinite(progress)) return;
      const target = progress * (images.length - 1);
      current.current = lerp(current.current, target, smoothing);
      if (Math.abs(target - current.current) < 0.01) current.current = target;
      draw(Math.round(current.current));
    },
    jumpTo(progress) {
      if (!images.length || !Number.isFinite(progress)) return;
      current.current = progress * (images.length - 1);
      draw(Math.round(current.current));
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      if (syncCanvasSize(canvas)) draw(Math.round(current.current), true);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  return <canvas ref={canvasRef} className={styles.canvas} hidden={hidden} aria-hidden />;
}
