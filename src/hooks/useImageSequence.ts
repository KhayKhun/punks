import { useEffect, useState } from 'react';

interface ImageSequenceState {
  images: HTMLImageElement[];
  /** 0–1 share of images loaded. */
  progress: number;
  ready: boolean;
}

/** Resolves once the image has loaded or failed — a missing frame shouldn't block the whole intro. */
function whenLoaded(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}

/** Preloads an ordered list of images. */
export function useImageSequence(urls: readonly string[]): ImageSequenceState {
  const [state, setState] = useState<ImageSequenceState>({
    images: [],
    progress: 0,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const images = urls.map((url) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      return img;
    });

    Promise.all(
      images.map((img) =>
        whenLoaded(img).then(() => {
          // Warm up decoding without waiting on it: decode() can stay pending in background tabs.
          img.decode().catch(() => undefined);
          loaded += 1;
          if (!cancelled) setState((s) => ({ ...s, progress: loaded / images.length }));
        }),
      ),
    ).then(() => {
      if (!cancelled) setState({ images, progress: 1, ready: true });
    });

    return () => {
      cancelled = true;
    };
  }, [urls]);

  return state;
}
