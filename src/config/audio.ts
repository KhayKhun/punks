/** Background music configuration. */
export const audioConfig = {
  music: {
    src: encodeURI('/media/Tense Beat_128k.m4a'),
    /** Target volume (0–1). */
    volume: 0.6,
    /** Fade in/out length (ms) when the music starts, stops or the tab is hidden. */
    fadeMs: 1200,
  },
  /** localStorage key remembering a visitor who turned the sound off. */
  storageKey: 'punkweb:sound',
} as const;
