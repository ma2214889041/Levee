/**
 * Generative topographic contour field (marching squares) — Levee's signature
 * visual. Ported to TypeScript from the design handoff's `levee-topo.js`, used
 * here as the ambient background of the Confidential Relief UI so it shares the
 * exact "monitored hillside" language of the Levee landing page and dashboard.
 */

export interface Peak {
  x: number;
  y: number;
  amp: number;
  s: number;
  ry?: number;
}

export interface ContourOptions {
  cols?: number;
  rows?: number;
  peaks?: Peak[];
  levels?: number[] | null;
  levelCount?: number;
  min?: number;
  max?: number;
  colorFor?: (t: number, level: number) => string;
  lineWidth?: number;
  glow?: number;
}

function buildField(cols: number, rows: number, peaks: Peak[]): number[][] {
  const f: number[][] = [];
  for (let j = 0; j <= rows; j++) {
    f[j] = [];
    for (let i = 0; i <= cols; i++) {
      const x = i / cols;
      const y = j / rows;
      let v = 0;
      for (const p of peaks) {
        const dx = x - p.x;
        const dy = (y - p.y) * (p.ry || 1);
        v += p.amp * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s));
      }
      f[j][i] = v;
    }
  }
  return f;
}

/** Crossing point on a cell edge, in grid coords. */
function lerp(a: number, b: number, L: number): number {
  return (L - a) / (b - a);
}

export function renderContours(canvas: HTMLCanvasElement, opts: ContourOptions = {}): void {
  const o: Required<ContourOptions> = {
    cols: 72,
    rows: 46,
    peaks: [{ x: 0.62, y: 0.42, amp: 1, s: 0.26, ry: 1 }],
    levels: null,
    levelCount: 11,
    min: 0.06,
    max: 0.98,
    colorFor: (t) => `rgba(95,208,192,${0.16 + t * 0.5})`,
    lineWidth: 1.3,
    glow: 0,
    ...opts,
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(rect.width, 10);
  const H = Math.max(rect.height, 10);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const cols = o.cols;
  const rows = o.rows;
  const field = buildField(cols, rows, o.peaks);
  const cw = W / cols;
  const ch = H / rows;

  const levels =
    o.levels ||
    Array.from(
      { length: o.levelCount },
      (_, k) => o.min + ((o.max - o.min) * k) / (o.levelCount - 1)
    );

  levels.forEach((L, li) => {
    const t = li / (levels.length - 1);
    ctx.strokeStyle = o.colorFor(t, L);
    ctx.lineWidth = o.lineWidth;
    ctx.lineJoin = "round";
    if (o.glow) {
      ctx.shadowBlur = o.glow;
      ctx.shadowColor = o.colorFor(t, L);
    }
    ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const tl = field[j][i];
        const tr = field[j][i + 1];
        const br = field[j + 1][i + 1];
        const bl = field[j + 1][i];
        const pts: [number, number][] = [];
        if ((tl - L) * (tr - L) < 0) pts.push([i + lerp(tl, tr, L), j]);
        if ((tr - L) * (br - L) < 0) pts.push([i + 1, j + lerp(tr, br, L)]);
        if ((br - L) * (bl - L) < 0) pts.push([i + 1 - lerp(br, bl, L), j + 1]);
        if ((bl - L) * (tl - L) < 0) pts.push([i, j + 1 - lerp(bl, tl, L)]);
        if (pts.length === 2) {
          ctx.moveTo(pts[0][0] * cw, pts[0][1] * ch);
          ctx.lineTo(pts[1][0] * cw, pts[1][1] * ch);
        } else if (pts.length === 4) {
          const center = (tl + tr + br + bl) / 4;
          const pair = center >= L ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
          pair.forEach(([a, b]) => {
            ctx.moveTo(pts[a][0] * cw, pts[a][1] * ch);
            ctx.lineTo(pts[b][0] * cw, pts[b][1] * ch);
          });
        }
      }
    }
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
}

/**
 * Neon cyan→amber→risk ramp from the Web3 concept: cool protective teal for the
 * calm outer contours warming to amber/red toward the monitored ridge.
 */
export function neon(t: number): string {
  if (t < 0.6) {
    const a = 0.1 + t * 0.5;
    return `rgba(45,229,198,${a})`;
  }
  const k = (t - 0.6) / 0.4;
  const r = Math.round(45 + (255 - 45) * k);
  const g = Math.round(229 + (90 - 229) * k);
  const b = Math.round(198 + (82 - 198) * k);
  return `rgba(${r},${g},${b},${0.55 + k * 0.42})`;
}

/** The hero terrain configuration used on the Levee landing page. */
export function drawHeroTerrain(canvas: HTMLCanvasElement): void {
  renderContours(canvas, {
    cols: 90,
    rows: 56,
    levelCount: 16,
    min: 0.04,
    max: 1.04,
    lineWidth: 1.15,
    glow: 3,
    peaks: [
      { x: 0.72, y: 0.4, amp: 1.0, s: 0.19, ry: 1.05 },
      { x: 0.55, y: 0.64, amp: 0.6, s: 0.15, ry: 1.1 },
      { x: 0.9, y: 0.7, amp: 0.46, s: 0.17, ry: 1 },
    ],
    colorFor: neon,
  });
}
