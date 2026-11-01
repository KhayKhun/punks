import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { parseLine } from '../../../content/messages';
import styles from './GlitchCaption.module.css';

export type CaptionTone = 'light' | 'dark';

/** Caption block centre as a share of the stage (0–1). */
export interface CaptionAnchor {
  readonly x: number;
  readonly y: number;
}

export interface CaptionOptions {
  /** 'light' = white text with a dark scrim (over video/black); 'dark' = ink text on white. */
  tone?: CaptionTone;
  /** Where to centre this line; defaults to the component's `anchor` prop. */
  anchor?: CaptionAnchor;
}

export interface GlitchCaptionHandle {
  /**
   * Requests a line (raw message line, "!" = hit) or null to clear.
   * Safe to call every animation frame — it only re-renders when something changes.
   */
  show: (line: string | null, options?: CaptionOptions) => void;
}

interface GlitchCaptionProps {
  anchor: CaptionAnchor;
  glitchMs: number;
  reducedMotion?: boolean;
  ref?: Ref<GlitchCaptionHandle>;
}

interface Target {
  line: string | null;
  tone: CaptionTone;
  anchor: CaptionAnchor;
}

interface Displayed extends Target {
  line: string;
  stage: 'in' | 'out';
  /** Bumped per new line so the element remounts and replays its in-animation. */
  key: number;
}

const sameAnchor = (a: CaptionAnchor, b: CaptionAnchor) => a.x === b.x && a.y === b.y;

/** One phrase at a time; glitches out the old phrase, then glitches in the next. */
export function GlitchCaption({ anchor, glitchMs, reducedMotion, ref }: GlitchCaptionProps) {
  const [displayed, setDisplayed] = useState<Displayed | null>(null);
  const target = useRef<Target>({ line: null, tone: 'light', anchor });
  const shown = useRef<string | null>(null);
  const swapTimer = useRef(0);
  const nextKey = useRef(0);

  const outMs = reducedMotion ? 0 : Math.round(glitchMs * 0.4);

  useImperativeHandle(ref, () => ({
    show(line, { tone = 'light', anchor: lineAnchor = anchor } = {}) {
      const prev = target.current;
      if (prev.line === line && prev.tone === tone && sameAnchor(prev.anchor, lineAnchor)) return;
      target.current = { line, tone, anchor: lineAnchor };

      // Same line, new tone/anchor: restyle in place.
      if (line !== null && line === shown.current) {
        setDisplayed((d) => (d ? { ...d, tone, anchor: lineAnchor } : d));
        return;
      }

      // A swap is already pending — it will pick up the latest target when it fires.
      if (swapTimer.current) return;

      const swapIn = () => {
        swapTimer.current = 0;
        const next = target.current;
        shown.current = next.line;
        setDisplayed(
          next.line === null
            ? null
            : { ...next, line: next.line, stage: 'in', key: ++nextKey.current },
        );
      };

      if (shown.current === null || outMs === 0) {
        swapIn();
        return;
      }
      setDisplayed((d) => (d ? { ...d, stage: 'out' } : d));
      swapTimer.current = window.setTimeout(swapIn, outMs);
    },
  }));

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  const parsed = displayed ? parseLine(displayed.line) : null;
  const position = displayed?.anchor ?? anchor;
  const scrimVisible = displayed?.tone === 'light' && displayed.stage === 'in';

  return (
    <div
      className={styles.anchor}
      style={
        {
          '--anchor-x': position.x,
          '--anchor-y': position.y,
          '--glitch-ms': `${glitchMs}ms`,
          '--glitch-out-ms': `${outMs}ms`,
        } as CSSProperties
      }
      data-centered={position.x === 0.5 || undefined}
      aria-live="polite"
    >
      <span className={styles.scrim} data-visible={scrimVisible || undefined} aria-hidden />
      {displayed && parsed && (
        <p
          key={displayed.key}
          className={styles.caption}
          data-text={parsed.text}
          data-stage={displayed.stage}
          data-tone={displayed.tone}
          data-hit={parsed.hit || undefined}
          data-reduced={reducedMotion || undefined}
        >
          {parsed.text}
        </p>
      )}
    </div>
  );
}
