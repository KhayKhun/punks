export interface LoopPlayerOptions {
  /** Target volume (0–1). */
  volume: number;
  fadeMs: number;
}

/**
 * Gapless looping audio via the Web Audio API (`<audio loop>` leaves a gap at the loop point with AAC).
 * Browsers keep the AudioContext suspended until a user gesture; `start()` reports whether it could play.
 */
export function createLoopPlayer(src: string, { volume, fadeMs }: LoopPlayerOptions) {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const buffer = fetch(src)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data));

  // Created once, on first successful start — concurrent starts share it.
  let sourceStarted: Promise<void> | null = null;
  let suspendTimer = 0;

  const ensureSource = () =>
    (sourceStarted ??= buffer.then((decoded) => {
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.loop = true;
      source.connect(gain);
      source.start();
    }));

  const rampTo = (value: number) => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + fadeMs / 1000);
  };

  return {
    /** Starts (or resumes) the loop with a fade-in. Resolves false if the browser still blocks audio. */
    async start(): Promise<boolean> {
      window.clearTimeout(suspendTimer);
      // Without a user gesture resume() may never settle — don't wait on it forever.
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 300))]);
      if (ctx.state !== 'running') return false;

      await ensureSource();
      rampTo(volume);
      return true;
    },

    /** Fades out, then suspends the context so nothing keeps running in the background. */
    stop() {
      if (ctx.state !== 'running') return;
      rampTo(0);
      window.clearTimeout(suspendTimer);
      suspendTimer = window.setTimeout(() => void ctx.suspend(), fadeMs);
    },

    destroy() {
      window.clearTimeout(suspendTimer);
      void ctx.close();
    },
  };
}

export type LoopPlayer = ReturnType<typeof createLoopPlayer>;
