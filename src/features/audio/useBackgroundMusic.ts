import { useCallback, useEffect, useRef, useState } from 'react';
import { audioConfig } from '../../config/audio';
import { createLoopPlayer, type LoopPlayer } from '../../lib/loopPlayer';

/** Events that count as a user gesture, letting the browser unlock audio. */
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;
/** Gestures on the toggle (marked `data-sound-toggle`) are handled by the toggle itself. */
const SOUND_TOGGLE_SELECTOR = '[data-sound-toggle]';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(audioConfig.storageKey) !== 'off';
  } catch {
    return true;
  }
}

function writeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(audioConfig.storageKey, enabled ? 'on' : 'off');
  } catch {
    // Storage blocked (private mode etc.) — the preference just won't persist.
  }
}

/**
 * Looping background music. Starts as soon as the browser allows (immediately, or on the
 * first click/tap/key), pauses while the tab is hidden, and remembers a visitor's "off".
 */
export function useBackgroundMusic() {
  const [playing, setPlaying] = useState(false);
  const enabled = useRef(readEnabled());
  const player = useRef<LoopPlayer | null>(null);

  const tryStart = useCallback(async () => {
    const current = player.current;
    if (!current || !enabled.current || document.hidden) return;
    const ok = await current.start().catch(() => false);
    // Ignore results from a player that was torn down or a change of mind meanwhile.
    if (player.current === current) setPlaying(ok && enabled.current);
  }, []);

  useEffect(() => {
    const instance = createLoopPlayer(audioConfig.music.src, audioConfig.music);
    player.current = instance;
    void tryStart();

    const onGesture = (event: Event) => {
      if ((event.target as Element | null)?.closest?.(SOUND_TOGGLE_SELECTOR)) return;
      void tryStart();
    };
    const onVisibility = () => {
      if (document.hidden) {
        instance.stop();
        setPlaying(false);
      } else {
        void tryStart();
      }
    };

    GESTURE_EVENTS.forEach((type) => window.addEventListener(type, onGesture, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, onGesture));
      document.removeEventListener('visibilitychange', onVisibility);
      player.current = null;
      instance.destroy();
    };
  }, [tryStart]);

  const toggle = useCallback(() => {
    if (playing) {
      enabled.current = false;
      player.current?.stop();
      setPlaying(false);
    } else {
      enabled.current = true;
      void tryStart();
    }
    writeEnabled(enabled.current);
  }, [playing, tryStart]);

  return { playing, toggle };
}
