import { useImperativeHandle, useRef, type Ref } from 'react';
import styles from './DarkOverlay.module.css';

export interface DarkOverlayHandle {
  /** 0 = off-screen to the right, 1 = screen fully black. */
  setCoverage: (coverage: number) => void;
}

interface DarkOverlayProps {
  ref?: Ref<DarkOverlayHandle>;
}

/**
 * A black band, twice the viewport wide, whose left half is a soft gradient.
 * Sliding it from the right edge to fully covering gives the "walking into the dark" effect;
 * sliding it back out to the right reveals what is underneath.
 */
export function DarkOverlay({ ref }: DarkOverlayProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setCoverage(coverage) {
      // Band is 200% wide: translate +50% → just off-screen right, −50% → solid half covers screen.
      const el = elRef.current;
      if (el) el.style.transform = `translate3d(${50 - coverage * 100}%, 0, 0)`;
    },
  }));

  return <div ref={elRef} className={styles.overlay} aria-hidden />;
}
