/**
 * A small ASCII renderer for the landing's objects: each character cell casts
 * one orthographic ray at a signed-distance scene, and the surface it hits is
 * drawn as a glyph whose weight and opacity follow the shading. It runs on a
 * 2D canvas with no WebGL, which is plenty at a few thousand cells.
 */

export type Face = "cap" | "side";

export interface AsciiScene {
  /** Signed distance from an object-space point to the surface. */
  sdf(x: number, y: number, z: number, t: number): number;
  /** Half extents of an object-space box around the scene; rays that miss it are skipped. */
  bounds: readonly [number, number, number];
  /**
   * Rotation at time `t`, in radians: the object turns about its own y axis
   * (yaw), then the whole view tilts about x (pitch). Negative pitch looks
   * down on it.
   */
  pose(t: number): { yaw: number; pitch: number };
  /** World units across the shorter side of the canvas. */
  extent: number;
  /** Where the object's origin sits, as a fraction of the canvas. */
  anchor: readonly [number, number];
  /** Which kind of face a normal belongs to, in object space. */
  face(nx: number, ny: number, nz: number): Face;
  /** The glyph for a surface cell. `ink` is 0..1, how much ink the cell should carry. */
  glyph(face: Face, ink: number, col: number, row: number, t: number): string;
  /** Opacity for a surface cell. */
  alpha(face: Face, ink: number): number;
}

// ------------------------------------------------------------- 2D helpers

function roundRect(px: number, py: number, bx: number, by: number, r: number): number {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function segment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/** A 2D distance pulled out along z between `z0` and `z1`. */
function extrude(d2: number, z: number, z0: number, z1: number): number {
  const half = (z1 - z0) / 2;
  const wy = Math.abs(z - (z0 + half)) - half;
  return Math.min(Math.max(d2, wy), 0) + Math.hypot(Math.max(d2, 0), Math.max(wy, 0));
}

function box(px: number, py: number, pz: number, bx: number, by: number, bz: number): number {
  const qx = Math.abs(px) - bx;
  const qy = Math.abs(py) - by;
  const qz = Math.abs(pz) - bz;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
    Math.min(Math.max(qx, qy, qz), 0)
  );
}

// ------------------------------------------------------------------ glyphs

/** Light to heavy. The space is left out: a hit should always leave a mark. */
const RAMP = ".:-=+*#%@";

/** Written along the sides of the mark: the stocks a plan covers, running like a tape. */
const TAPE =
  "AAPLx NVDAx TSLAx SPYx QQQx METAx MSFTx GOOGLx AMZNx COINx MSTRx HOODx CRCLx NFLXx AMDx PLTRx ";

const rampAt = (ink: number) => RAMP[Math.min(RAMP.length - 1, Math.floor(ink * RAMP.length))];

// -------------------------------------------------------------------- mark

/*
 * The Heirloom mark from favicon.svg, in its 120-unit box: two rounded posts
 * and the line between them. Normalised to about ±0.77 and y-up, then
 * extruded a long way back so it reads as a solid trailing off the page.
 */
const POST_X = 0.558;
const POST_HALF: readonly [number, number] = [0.175, 0.767];
const POST_R = 0.117;
const LINE: readonly (readonly [number, number])[] = [
  [-0.383, 0],
  [-0.233, 0],
  [-0.117, 0.283],
  [0.117, -0.283],
  [0.233, 0],
  [0.383, 0],
];
const LINE_HALF = 0.108;
const MARK_DEPTH = 1.9;

function mark2d(x: number, y: number): number {
  let d = Math.min(
    roundRect(x + POST_X, y, POST_HALF[0], POST_HALF[1], POST_R),
    roundRect(x - POST_X, y, POST_HALF[0], POST_HALF[1], POST_R),
  );
  for (let i = 1; i < LINE.length; i++) {
    const [ax, ay] = LINE[i - 1];
    const [bx, by] = LINE[i];
    d = Math.min(d, segment(x, y, ax, ay, bx, by) - LINE_HALF);
  }
  return d;
}

export const markScene: AsciiScene = {
  // The front face sits at z = 0 and the solid runs back from it.
  sdf: (x, y, z) => extrude(mark2d(x, y), z, 0, MARK_DEPTH),
  bounds: [0.75, 0.78, MARK_DEPTH],
  // Turned so the solid trails up and to the right, away from the front face.
  pose: (t) => ({
    yaw: 0.62 + Math.sin(t * 0.21) * 0.12,
    pitch: -0.32 + Math.sin(t * 0.17 + 1.3) * 0.06,
  }),
  extent: 2.9,
  anchor: [0.33, 0.62],
  face: (_nx, _ny, nz) => (Math.abs(nz) > 0.6 ? "cap" : "side"),
  glyph: (face, ink, col, row, t) => {
    if (face === "cap") return rampAt(0.35 + ink * 0.45);
    const ch = TAPE[(((col + row * 11 + Math.floor(t * 3)) % TAPE.length) + TAPE.length) % TAPE.length];
    return ch === " " ? rampAt(ink * 0.4) : ch;
  },
  alpha: (face, ink) => (face === "cap" ? 0.62 : 0.12 + ink * 0.45),
};

// -------------------------------------------------------------------- bars

/*
 * A block of price bars, four by three, each breathing on its own phase with
 * a rising trend front to back. It stands in for the market the plans sit
 * over, and it is the one object on the page that is about stocks as such.
 */
const BAR_COLS = 4;
const BAR_ROWS = 3;
const BAR_PITCH = 0.36;
const BAR_HALF = 0.12;
const BAR_FLOOR = -0.62;

/** Half the height of bar (i, j). Tops stay between -0.42 and 0.5, inside `bounds`. */
function barHeight(i: number, j: number, t: number): number {
  const trend = 0.1 + 0.06 * i + 0.03 * j;
  const swing = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7 + j * 2.3);
  return trend + swing * 0.22;
}

export const barsScene: AsciiScene = {
  sdf: (x, y, z, t) => {
    let d = Infinity;
    for (let i = 0; i < BAR_COLS; i++) {
      const cx = (i - (BAR_COLS - 1) / 2) * BAR_PITCH;
      for (let j = 0; j < BAR_ROWS; j++) {
        const cz = (j - (BAR_ROWS - 1) / 2) * BAR_PITCH;
        const h = barHeight(i, j, t);
        d = Math.min(d, box(x - cx, y - (BAR_FLOOR + h), z - cz, BAR_HALF, h, BAR_HALF));
      }
    }
    return d;
  },
  bounds: [0.72, 0.62, 0.52],
  pose: (t) => ({ yaw: 0.6 + t * 0.12, pitch: -0.5 }),
  extent: 2.15,
  anchor: [0.5, 0.45],
  face: (_nx, ny) => (ny > 0.6 ? "cap" : "side"),
  glyph: (face, ink) => (face === "cap" ? "#" : rampAt(0.1 + ink * 0.55)),
  alpha: (face, ink) => (face === "cap" ? 0.6 : 0.2 + ink * 0.5),
};

// ----------------------------------------------------------------- render

export interface AsciiFrame {
  width: number;
  height: number;
  fontPx: number;
  color: string;
  t: number;
}

/** World-space direction towards the light: above, left, and in front. */
const LIGHT = (() => {
  const v = [-0.5, 0.62, -0.6];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n] as const;
})();
const ALPHA_STEPS = 10;
const EPS = 0.0025;

/**
 * Draws one frame of `scene` into `ctx`, which is already scaled to CSS
 * pixels. Cells are grouped by opacity so the canvas state changes ten times
 * a frame rather than once per glyph.
 */
export function drawAscii(ctx: CanvasRenderingContext2D, scene: AsciiScene, frame: AsciiFrame) {
  const { width, height, fontPx, color, t } = frame;
  ctx.clearRect(0, 0, width, height);

  const cellW = fontPx * 0.62;
  const cellH = fontPx * 1.18;
  const cols = Math.floor(width / cellW);
  const rows = Math.floor(height / cellH);
  if (cols < 2 || rows < 2) return;

  const unit = Math.min(width, height) / scene.extent;
  const ox0 = width * scene.anchor[0];
  const oy0 = height * scene.anchor[1];

  const { yaw, pitch } = scene.pose(t);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  // Object = Rᵀ · world, for R = Rx(pitch) · Ry(yaw). The camera looks down +z.
  const dx = -cp * sy;
  const dy = sp;
  const dz = cp * cy;
  const lx = cy * LIGHT[0] + sp * sy * LIGHT[1] - cp * sy * LIGHT[2];
  const ly = cp * LIGHT[1] + sp * LIGHT[2];
  const lz = sy * LIGHT[0] - sp * cy * LIGHT[1] + cp * cy * LIGHT[2];

  const back = 6;
  const [bx, by, bz] = scene.bounds;
  const buckets: { ch: string; x: number; y: number }[][] = Array.from(
    { length: ALPHA_STEPS },
    () => [],
  );

  for (let row = 0; row < rows; row++) {
    const wy = (oy0 - (row + 0.5) * cellH) / unit;
    for (let col = 0; col < cols; col++) {
      const wx = ((col + 0.5) * cellW - ox0) / unit;

      const ox = cy * wx + sp * sy * wy + cp * sy * back;
      const oy = cp * wy - sp * back;
      const oz = sy * wx - sp * cy * wy - cp * cy * back;

      // Slab test against the bounds, so empty space costs almost nothing.
      let t0 = 0;
      let t1 = back * 2 + 4;
      let miss = false;
      for (const [o, d, b] of [
        [ox, dx, bx],
        [oy, dy, by],
        [oz, dz, bz],
      ] as const) {
        if (Math.abs(d) < 1e-9) {
          if (Math.abs(o) > b) miss = true;
          continue;
        }
        const ta = (-b - o) / d;
        const tb = (b - o) / d;
        t0 = Math.max(t0, Math.min(ta, tb));
        t1 = Math.min(t1, Math.max(ta, tb));
      }
      if (miss || t0 > t1) continue;

      let dist = t0;
      let hit = false;
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 0; i < 56; i++) {
        px = ox + dx * dist;
        py = oy + dy * dist;
        pz = oz + dz * dist;
        const d = scene.sdf(px, py, pz, t);
        if (d < EPS) {
          hit = true;
          break;
        }
        dist += d;
        if (dist > t1) break;
      }
      if (!hit) continue;

      // Tetrahedral normal: four samples instead of six.
      const e = 0.004;
      const a = scene.sdf(px + e, py - e, pz - e, t);
      const b = scene.sdf(px - e, py - e, pz + e, t);
      const c = scene.sdf(px - e, py + e, pz - e, t);
      const f = scene.sdf(px + e, py + e, pz + e, t);
      let nx = a - b - c + f;
      let ny = -a - b + c + f;
      let nz = -a + b - c + f;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;

      const light = Math.max(0, nx * lx + ny * ly + nz * lz);
      // Ink is the absence of light: a face turned away carries more of it.
      const ink = 0.18 + 0.82 * (1 - light);
      const face = scene.face(nx, ny, nz);
      const alpha = scene.alpha(face, ink);
      const step = Math.min(ALPHA_STEPS - 1, Math.max(0, Math.round(alpha * ALPHA_STEPS) - 1));
      buckets[step].push({
        ch: scene.glyph(face, ink, col, row, t),
        x: col * cellW,
        y: row * cellH,
      });
    }
  }

  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.font = `${fontPx}px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  for (let i = 0; i < ALPHA_STEPS; i++) {
    const cells = buckets[i];
    if (cells.length === 0) continue;
    ctx.globalAlpha = (i + 1) / ALPHA_STEPS;
    for (const cell of cells) ctx.fillText(cell.ch, cell.x, cell.y);
  }
  ctx.globalAlpha = 1;
}
