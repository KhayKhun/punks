import { useEffect } from 'react';

const SCROLL_KEYS = new Set([
  ' ',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

const prevent = (event: Event) => event.preventDefault();
const preventKeys = (event: KeyboardEvent) => {
  if (SCROLL_KEYS.has(event.key)) event.preventDefault();
};

/**
 * Blocks wheel, touch and keyboard scrolling while `locked` is true.
 * Pins the page at `pinY` (px) if given, otherwise wherever it is when the lock engages.
 */
export function useScrollLock(locked: boolean, pinY?: number) {
  useEffect(() => {
    if (!locked) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    // Pin the position against anything that still manages to scroll (scrollbar drag, find-in-page…).
    if (pinY !== undefined) window.scrollTo(0, pinY);
    const pinnedY = pinY ?? window.scrollY;
    const pin = () => {
      if (window.scrollY !== pinnedY) window.scrollTo(0, pinnedY);
    };

    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener('wheel', prevent, opts);
    window.addEventListener('touchmove', prevent, opts);
    window.addEventListener('keydown', preventKeys, opts);
    window.addEventListener('scroll', pin);

    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener('wheel', prevent, opts);
      window.removeEventListener('touchmove', prevent, opts);
      window.removeEventListener('keydown', preventKeys, opts);
      window.removeEventListener('scroll', pin);
    };
  }, [locked, pinY]);
}
