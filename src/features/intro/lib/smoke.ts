import { clamp, easeOutCubic, lerp } from '../../../lib/math';

interface Puff {
  sprite: HTMLCanvasElement;
  /** Emission time as a share of the total duration (0–1). */
  birth: number;
  angle: number;
  /** Travel distance as a share of the screen diagonal. */
  reach: number;
  startSize: number;
  endSize: number;
  spin: number;
  rotation: number;
}

export interface SmokeOptions {
  durationMs: number;
  /** Number of smoke puffs; fewer = lighter on low-end devices. */
  puffCount?: number;
}

const SPRITE_SIZE = 256;

/** A soft, lumpy white cloud made of overlapping radial blobs. */
function createPuffSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE_SIZE;
  const ctx = sprite.getContext('2d')!;
  const c = SPRITE_SIZE / 2;

  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * c * 0.45;
    const x = c + Math.cos(angle) * dist;
    const y = c + Math.sin(angle) * dist;
    const r = c * (0.22 + Math.random() * 0.24);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.6, 'rgba(246,246,250,0.6)');
    g.addColorStop(0.85, 'rgba(232,232,240,0.2)');
    g.addColorStop(1, 'rgba(225,225,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return sprite;
}

function createPuffs(count: number): Puff[] {
  const sprites = Array.from({ length: 4 }, createPuffSprite);
  return Array.from({ length: count }, (_, i) => ({
    sprite: sprites[i % sprites.length],
    birth: (i / count) * 0.7 + Math.random() * 0.05,
    // Fan out from the top-left corner towards the bottom-right quadrant.
    angle: lerp(0.05, Math.PI / 2 - 0.05, Math.random()),
    reach: 0.3 + Math.random() * 0.7,
    startSize: 0.08 + Math.random() * 0.08,
    endSize: 0.4 + Math.random() * 0.4,
    spin: (Math.random() - 0.5) * 1.2,
    rotation: Math.random() * Math.PI * 2,
  }));
}

/**
 * Plays a thick white smoke burst from the top-left corner that ends in a fully white canvas
 * (or, reversed, white breaking up into smoke that retreats into the corner).
 * Framework-agnostic: hand it a canvas, await `play()`.
 */
export function createSmokeTransition(canvas: HTMLCanvasElement, options: SmokeOptions) {
  const { durationMs, puffCount = 60 } = options;
  const ctx = canvas.getContext('2d')!;
  const puffs = createPuffs(puffCount);
  let frame = 0;

  const render = (progress: number) => {
    // Out-of-range t breaks the maths (negative t ** 2.4 = NaN → createRadialGradient throws).
    const t = Number.isFinite(progress) ? clamp(progress) : 0;
    const { width: w, height: h } = canvas;
    const diag = Math.hypot(w, h);
    ctx.clearRect(0, 0, w, h);

    // Glow anchored at the top-left that grows to swallow the screen.
    const glowRadius = Math.max(1, lerp(0.08, 1.6, t ** 2.4) * diag);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.55, 'rgba(255,255,255,0.92)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (const puff of puffs) {
      const life = clamp((t - puff.birth) / (1 - puff.birth));
      if (life <= 0) continue;
      const travel = easeOutCubic(life) * puff.reach * diag;
      const size = lerp(puff.startSize, puff.endSize, easeOutCubic(life)) * diag;
      const x = Math.cos(puff.angle) * travel;
      const y = Math.sin(puff.angle) * travel;
      ctx.save();
      ctx.globalAlpha = clamp(life * 4) * 0.95;
      ctx.translate(x, y);
      ctx.rotate(puff.rotation + puff.spin * life);
      ctx.drawImage(puff.sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    // Guarantee a clean, fully white end state.
    const whiteout = clamp((t - 0.82) / 0.18);
    if (whiteout > 0) {
      ctx.fillStyle = `rgba(255,255,255,${whiteout})`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  return {
    /** Draws a single frame at progress `t` (0–1) — handy for scroll-driven use or debugging. */
    renderFrame: render,
    /** Plays to white; with `reverse`, plays from white back to a clear canvas. */
    play({ reverse = false }: { reverse?: boolean } = {}): Promise<void> {
      return new Promise((resolve) => {
        const start = performance.now();
        const finish = () => {
          const { width: w, height: h } = canvas;
          if (reverse) {
            // t = 0 still draws a small glow in the corner — leave nothing behind.
            ctx.clearRect(0, 0, w, h);
          } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);
          }
          resolve();
        };
        const step = (now: number) => {
          // rAF timestamps can predate `start`, so clamp — never feed a negative progress.
          const p = clamp((now - start) / durationMs);
          try {
            render(reverse ? 1 - p : p);
          } catch (error) {
            // Never let a drawing error strand the caller (and a locked scroll) mid-transition.
            console.error('Smoke transition failed; jumping to its end state.', error);
            finish();
            return;
          }
          if (p < 1) frame = requestAnimationFrame(step);
          else finish();
        };
        frame = requestAnimationFrame(step);
      });
    },
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
}
