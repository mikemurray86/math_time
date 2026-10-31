import { describe, expect, it } from 'vitest';
import { isStar, type Pt } from '../src/shared/starShape.ts';

// Straight lines through the corners, with a little hand wobble.
function draw(corners: Pt[], wobble = 3): Pt[] {
  const out: Pt[] = [];
  let seed = 7;
  const jitter = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2 * wobble;
  corners.slice(1).forEach((b, i) => {
    const a = corners[i];
    for (let t = 0; t < 1; t += 0.1) out.push([a[0] + (b[0] - a[0]) * t + jitter(), a[1] + (b[1] - a[1]) * t + jitter()]);
  });
  out.push(corners[corners.length - 1]);
  return out;
}

const at = (deg: number, r: number, cx = 200, cy = 150): Pt => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const pentagram = (start = -90, dir = 1, r = 100) => draw([0, 1, 2, 3, 4, 5].map((k) => at(start + dir * k * 144, r)));
const outline = (inner = 0.4, start = -90, r = 100) => draw([...Array(11).keys()].map((k) => at(start + k * 36, k % 2 ? r * inner : r)));

describe('star drawing', () => {
  it('spots a pentagram, either direction, from any tip, any size', () => {
    expect(isStar(pentagram())).toBe(true);
    expect(isStar(pentagram(-90, -1))).toBe(true);
    expect(isStar(pentagram(-18))).toBe(true);
    expect(isStar(pentagram(-80, 1, 40))).toBe(true); // small and a bit tilted
  });

  it('spots an outline star, skinny or chubby', () => {
    expect(isStar(outline())).toBe(true);
    expect(isStar(outline(0.5, -54))).toBe(true);
  });

  it('ignores other shapes and doodles', () => {
    const circle = [...Array(41).keys()].map((k) => at(k * 9, 100));
    const square = draw([[100, 50], [300, 50], [300, 250], [100, 250], [100, 50]]);
    const triangle = draw([at(-90, 100), at(30, 100), at(150, 100), at(-90, 100)]);
    const zigzag = draw([[0, 0], [40, 80], [80, 0], [120, 80], [160, 0], [200, 80]]);
    const halfStar = pentagram().slice(0, 40); // never closed
    const threePoints = draw([...Array(7).keys()].map((k) => at(-90 + k * 60, k % 2 ? 40 : 100)));
    const sixPoints = draw([...Array(13).keys()].map((k) => at(-90 + k * 30, k % 2 ? 45 : 100)));
    const tiny = pentagram(-90, 1, 10);
    for (const s of [circle, square, triangle, zigzag, halfStar, threePoints, sixPoints, tiny]) expect(isStar(s)).toBe(false);
  });
});
