/** Resizes a canvas backing store to its CSS size × devicePixelRatio. Returns true if it changed. */
export function syncCanvasSize(canvas: HTMLCanvasElement, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

/** Draws a source onto the full canvas with `object-fit: cover` semantics. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
) {
  const { width: cw, height: ch } = ctx.canvas;
  const scale = Math.max(cw / source.width, ch / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (cw - w) / 2, (ch - h) / 2, w, h);
}
