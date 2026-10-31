// Recognizes a five-pointed star drawn in one stroke on the scratch pad (for the secret Star Kid badge).

export type Pt = [number, number];

/** n points spaced evenly along the path, so fast and slow pen movement count the same. */
function resample(pts: Pt[], n: number): Pt[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const step = seg.reduce((a, b) => a + b, 0) / (n - 1);
  const out: Pt[] = [pts[0]];
  let i = 0;
  let into = 0; // distance already used along segment i
  while (out.length < n - 1 && i < seg.length) {
    const need = step * out.length - (seg.slice(0, i).reduce((a, b) => a + b, 0) + into);
    if (seg[i] - into >= need) {
      into += need;
      const t = seg[i] ? into / seg[i] : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
    } else {
      i++;
      into = 0;
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Whether one pen stroke (in pixels) looks like a five-pointed star, drawn either as a
 * pentagram (five straight lines, crossing itself) or as an outline. The stroke has to end
 * near where it started, reach out to five points spread evenly around its middle, and dip
 * back toward the middle between them.
 */
export function isStar(raw: Pt[]): boolean {
  if (raw.length < 10) return false;
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const size = Math.max(w, h);
  if (size < 40 || Math.min(w, h) < size * 0.5) return false;
  const [start, end] = [raw[0], raw[raw.length - 1]];
  if (Math.hypot(end[0] - start[0], end[1] - start[1]) > size * 0.3) return false;

  const n = 120;
  const pts = resample(raw, n);
  const cx = pts.reduce((s, p) => s + p[0], 0) / n;
  const cy = pts.reduce((s, p) => s + p[1], 0) / n;
  const r = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy));
  const ang = pts.map((p) => Math.atan2(p[1] - cy, p[0] - cx));
  const maxR = Math.max(...r);

  // Loops around the middle: about once for an outline, twice for a pentagram.
  let turn = 0;
  for (let i = 1; i < n; i++) {
    let d = ang[i] - ang[i - 1];
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    turn += d;
  }
  const loops = Math.abs(turn) / (2 * Math.PI);
  if (!((loops > 0.7 && loops < 1.35) || (loops > 1.6 && loops < 2.4))) return false;

  // Count the points: out past 80% of the reach, then back in under 62% before the next one.
  const lowAt = r.findIndex((v) => v < maxR * 0.62);
  if (lowAt < 0) return false;
  const tips: number[] = [];
  let out = false;
  let best = -1;
  for (let k = 0; k <= n; k++) {
    const i = (lowAt + k) % n;
    if (r[i] > maxR * 0.8) {
      if (!out) best = i;
      out = true;
      if (r[i] > r[best]) best = i;
    } else if (r[i] < maxR * 0.62 && out) {
      out = false;
      tips.push(best);
    }
  }
  if (tips.length !== 5) return false;

  // ...spread roughly evenly around the middle (72° apart on a perfect star).
  const around = tips.map((i) => ang[i]).sort((a, b) => a - b);
  const gaps = around.map((a, i) => (i < 4 ? around[i + 1] - a : around[0] + 2 * Math.PI - a));
  return gaps.every((g) => g > (40 * Math.PI) / 180 && g < (110 * Math.PI) / 180);
}
