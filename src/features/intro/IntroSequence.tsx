import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { introConfig } from '../../config/intro';
import { useImageSequence } from '../../hooks/useImageSequence';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useScrollLock } from '../../hooks/useScrollLock';
import { easeInOutCubic } from '../../lib/math';
import { tween } from '../../lib/tween';
import { DarkOverlay, type DarkOverlayHandle } from './components/DarkOverlay';
import { FrameScrubber, type FrameScrubberHandle } from './components/FrameScrubber';
import { GlitchCaption, type GlitchCaptionHandle } from './components/GlitchCaption';
import { Loader } from './components/Loader';
import { SmokeTransition, type SmokeMode } from './components/SmokeTransition';
import { getCaptionHolds, getTimelineLayout, sampleTimeline } from './lib/timeline';
import { SCROLL_LOCKED_PHASES, type IntroPhase } from './types';
import styles from './IntroSequence.module.css';

const { video1, video2, scroll, captions, timing } = introConfig;
const FRAME_URLS = Array.from({ length: video1.frameCount }, (_, i) => video1.framePath(i));
const LAYOUT = getTimelineLayout(introConfig);
const CAPTION_HOLDS = getCaptionHolds(captions.scroll);
/** How far (in screens) the user must scroll up from the white screen to start the rewind. */
const REWIND_THRESHOLD = 0.1;

const SCRUBBER_PHASES: ReadonlySet<IntroPhase> = new Set(['loading', 'scrub', 'rewind']);

const smokeModeFor = (phase: IntroPhase): SmokeMode | null =>
  phase === 'smoke' ? 'in' : phase === 'rewind' ? 'out' : null;

/**
 * The intro:
 * 1. scroll scrubs video1 (+ captions)   2. darkness sweeps in, then recedes over video2
 * 3. video2 plays (locked)               4. white smoke to a white screen (+ caption)
 * Scrolling up from white rewinds through smoke to the end of video1.
 */
export function IntroSequence() {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<FrameScrubberHandle>(null);
  const overlayRef = useRef<DarkOverlayHandle>(null);
  const captionRef = useRef<GlitchCaptionHandle>(null);

  const reducedMotion = useReducedMotion();
  const frames = useImageSequence(FRAME_URLS);
  const [sequencePhase, setPhase] = useState<Exclude<IntroPhase, 'loading'>>('scrub');
  const phase: IntroPhase = frames.ready ? sequencePhase : 'loading';
  /** Scroll position (px) pinned while a `holdLines` phrase is being read, or null. */
  const [readingHoldY, setReadingHoldY] = useState<number | null>(null);
  /** Hold points already triggered; forgotten once the user scrolls back above them. */
  const passedHolds = useRef(new Set<number>());

  useScrollLock(
    SCROLL_LOCKED_PHASES.has(phase) || readingHoldY !== null,
    readingHoldY ?? undefined,
  );

  /** Track position and screen height, or null before layout (hidden tab/iframe). */
  const measure = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage || stage.clientHeight === 0) return null;
    const screenHeight = stage.clientHeight;
    return {
      screenHeight,
      /** Current scroll position in screens from the top of the track. */
      screens: (window.scrollY - track.offsetTop) / screenHeight,
      scrollYFor: (screens: number) => track.offsetTop + screens * screenHeight,
    };
  }, []);

  // Phase 1 + 2a: map scroll position to video1 frame, darkness and captions, until the trigger point.
  useEffect(() => {
    if (phase !== 'scrub') return;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const m = measure();
      if (!m) return;
      let screens = m.screens;

      // Reading holds: crossing a held phrase (even in one big jump) snaps onto it and locks briefly.
      passedHolds.current.forEach((at) => {
        if (screens < at) passedHolds.current.delete(at);
      });
      const hold = CAPTION_HOLDS.find((h) => screens >= h.at && !passedHolds.current.has(h.at));
      if (hold) {
        passedHolds.current.add(hold.at);
        screens = hold.snapTo;
        // Move now (not just when the lock engages) so the next frame can't see the overshoot.
        const y = m.scrollYFor(screens);
        window.scrollTo(0, y);
        setReadingHoldY(y);
      }

      const sample = sampleTimeline(screens, introConfig);
      scrubberRef.current?.update(sample.frame);
      overlayRef.current?.setCoverage(sample.darkness);
      captionRef.current?.show(sample.caption?.line ?? null, {
        tone: 'light',
        anchor: sample.caption?.anchor,
      });

      if (sample.triggered) {
        cancelAnimationFrame(raf);
        // Snap to the trigger point in case the user flung past it (before the lock pins the position).
        window.scrollTo(0, m.scrollYFor(LAYOUT.triggerAt));
        setPhase('reveal');
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, measure]);

  // Release a reading hold after `readHoldMs`.
  useEffect(() => {
    if (readingHoldY === null) return;
    const id = window.setTimeout(() => setReadingHoldY(null), captions.readHoldMs);
    return () => window.clearTimeout(id);
  }, [readingHoldY]);

  // Phase 2b: darkness recedes to the right over video2's first frame (timed).
  useEffect(() => {
    if (phase !== 'reveal') return;
    captionRef.current?.show(null);
    const video = videoRef.current;
    if (video) video.currentTime = 0;

    const reveal = tween({
      duration: timing.revealMs,
      easing: easeInOutCubic,
      onUpdate: (t) => overlayRef.current?.setCoverage(1 - t),
    });
    reveal.promise.then(() => setPhase('playing'));
    return reveal.cancel;
  }, [phase]);

  // Phase 3: forced playback of video2.
  useEffect(() => {
    if (phase !== 'playing') return;
    const video = videoRef.current;
    if (!video) {
      setPhase('smoke');
      return;
    }

    // A late play() rejection (e.g. AbortError from a later pause()) must not act after cleanup.
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setPhase('smoke');
    };
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    video.play().catch(finish);

    // Start the smoke `smokeLeadMs` before the end; video2 keeps playing underneath it.
    let raf = 0;
    const watchTime = () => {
      const remainingMs = (video.duration - video.currentTime) * 1000;
      if (Number.isFinite(remainingMs) && remainingMs <= timing.smokeLeadMs) {
        finish();
        return;
      }
      raf = requestAnimationFrame(watchTime);
    };
    raf = requestAnimationFrame(watchTime);

    // Never leave the user stuck in a locked scroll.
    const durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : 5000;
    const safety = window.setTimeout(finish, durationMs + timing.playbackGraceMs);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      window.clearTimeout(safety);
    };
  }, [phase]);

  // Phase 4 (done): white-screen captions, and scrolling back up starts the rewind.
  useEffect(() => {
    if (phase !== 'done') return;
    const caption = captionRef.current;

    const { lines, anchor, delayMs, holdMs } = captions.white;
    const timers = lines.map((line, i) =>
      window.setTimeout(() => caption?.show(line, { tone: 'dark', anchor }), delayMs + i * holdMs),
    );

    let rewinding = false;
    const onScroll = () => {
      const m = measure();
      if (rewinding || !m || m.screens > LAYOUT.triggerAt - REWIND_THRESHOLD) return;
      rewinding = true;
      // Jump under the white before the lock pins the scroll position.
      window.scrollTo(0, m.scrollYFor(scroll.rewindTo));
      setPhase('rewind');
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('scroll', onScroll);
      caption?.show(null);
    };
  }, [phase, measure]);

  // Rewind: set video1 up at `rewindTo` under the white, then the smoke clears (SmokeTransition 'out').
  useEffect(() => {
    if (phase !== 'rewind') return;
    const sample = sampleTimeline(scroll.rewindTo, introConfig);
    scrubberRef.current?.jumpTo(sample.frame);
    overlayRef.current?.setCoverage(sample.darkness);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [phase]);

  const handleSmokeComplete = useCallback(() => {
    setPhase((p) => (p === 'smoke' ? 'done' : p === 'rewind' ? 'scrub' : p));
  }, []);

  return (
    <section
      ref={trackRef}
      className={styles.track}
      style={{ '--track-screens': LAYOUT.trackScreens } as CSSProperties}
    >
      <div ref={stageRef} className={styles.stage} data-phase={phase}>
        <FrameScrubber
          ref={scrubberRef}
          images={frames.images}
          smoothing={scroll.scrubSmoothing}
          hidden={!SCRUBBER_PHASES.has(phase)}
        />
        <video
          ref={videoRef}
          className={styles.video}
          src={video2.src}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
        />
        <DarkOverlay ref={overlayRef} />
        <SmokeTransition
          mode={smokeModeFor(phase)}
          durationMs={phase === 'rewind' ? timing.rewindMs : timing.smokeMs}
          reducedMotion={reducedMotion}
          onComplete={handleSmokeComplete}
        />
        <GlitchCaption
          ref={captionRef}
          anchor={captions.anchor}
          glitchMs={captions.glitchMs}
          reducedMotion={reducedMotion}
        />
        {phase === 'loading' && <Loader progress={frames.progress} />}
      </div>
    </section>
  );
}
