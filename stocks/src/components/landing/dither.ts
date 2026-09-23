/**
 * Ordered dithering for the landing's two light fields: a soft shape is
 * thresholded against a 4×4 Bayer matrix into a grid of dots, with a little
 * per-column noise so it reads as scan lines rather than a smooth gradient.
 * It is the paper counterpart of the glowing, streaked images the page's dark
 * reference used.
 */

export type DitherShape = "rise" | "flare";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Below this the field is left blank, so faint light fades out instead of salting the paper. */
const FLOOR = 0.08;

/** A repeatable 0..1 value per column. */
function columnNoise(col: number): number {
  const s = Math.sin(col * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Intensity 0..1 at (u, v), both 0..1 across the field, v downwards. */
function intensity(shape: DitherShape, u: number, v: number): number {
  if (shape === "rise") {
    // Light welling up from the bottom centre, with a fainter wash above it.
    const core = Math.exp(-((u - 0.5) ** 2 / 0.03 + (v - 1.08) ** 2 / 0.2));
    const wash = Math.exp(-((u - 0.5) ** 2 / 0.12 + (v - 1) ** 2 / 0.35)) * 0.35;
    return Math.min(1, core + wash);
  }
  // A flare coming in from the right edge, level with the middle.
  const core = Math.exp(-((u - 1.05) ** 2 / 0.08 + (v - 0.5) ** 2 / 0.1));
  const wash = Math.exp(-((u - 1) ** 2 / 0.2 + (v - 0.5) ** 2 / 0.4)) * 0.35;
  return Math.min(1, core + wash);
}

export function drawDither(
  ctx: CanvasRenderingContext2D,
  shape: DitherShape,
  width: number,
  height: number,
  color: string,
) {
  ctx.clearRect(0, 0, width, height);
  const cell = 3;
  const dot = 2;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  ctx.fillStyle = color;

  for (let col = 0; col < cols; col++) {
    const streak = 0.72 + 0.28 * columnNoise(Math.floor(col / 2));
    const u = col / cols;
    for (let row = 0; row < rows; row++) {
      const value = (intensity(shape, u, row / rows) * streak - FLOOR) / (1 - FLOOR);
      if (value > BAYER[(row % 4) * 4 + (col % 4)]) {
        ctx.fillRect(col * cell, row * cell, dot, dot);
      }
    }
  }
}
