import { useRef, useState, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import { Fraction, F } from '../../shared/fraction.ts';
import { toExpr } from '../../shared/expr.ts';
import type { GridPoint, GridSpec } from '../../shared/types.ts';
import { MathText } from './MathText.tsx';
import { sounds } from '../sounds.ts';

export interface Pt {
  x: string;
  y: string;
}

interface Props {
  grid: GridSpec;
  value?: Pt | null; // the point she's placing (plot mode)
  onChange?: (p: Pt) => void; // present → the grid is interactive
  extra?: GridPoint[]; // overlay points: review and answer reveal
  label?: string;
}

const U = 10; // svg units per grid unit
const PAD = 0.9;
const ZOOMS = [1, 2, 4];
const TONES: Record<NonNullable<GridPoint['tone']>, string> = {
  a: 'var(--purple)',
  b: 'var(--coral)',
  mine: 'var(--coral)',
  retry: 'var(--sun-dark)',
  correct: 'var(--green)',
};

interface View {
  cx: number;
  cy: number;
  half: number;
}

function Layers({ range, m, view, points }: { range: number; m: number; view: View; points: GridPoint[] }) {
  const full = range + PAD;
  const scale = view.half / full; // < 1 when zoomed in
  const fs = full * U * 0.055 * scale;
  const labelEvery = range >= 10 && scale > 0.6 ? 2 : 1;
  // Draw minor lines, then major, then the axes so heavier lines sit on top.
  const lines: JSX.Element[][] = [[], [], []];
  const end = range * U;
  for (let k = -range * m; k <= range * m; k++) {
    const v = (k / m) * U;
    const tier = k === 0 ? 2 : k % m === 0 ? 1 : 0;
    const cls = ['g-minor', 'g-major', 'g-axis'][tier];
    lines[tier].push(
      <line key={`v${k}`} className={cls} x1={v} y1={-end} x2={v} y2={end} vectorEffect="non-scaling-stroke" />,
      <line key={`h${k}`} className={cls} x1={-end} y1={-v} x2={end} y2={-v} vectorEffect="non-scaling-stroke" />,
    );
  }
  const labels = [];
  for (let n = -range; n <= range; n++) {
    if (n === 0 || n % labelEvery !== 0) continue;
    const t = n < 0 ? `−${-n}` : `${n}`;
    labels.push(
      <text key={`lx${n}`} className="g-label" x={n * U} y={fs * 1.15} fontSize={fs} textAnchor="middle">{t}</text>,
      <text key={`ly${n}`} className="g-label" x={-fs * 0.45} y={-n * U + fs * 0.35} fontSize={fs} textAnchor="end">{t}</text>,
    );
  }
  const r = full * U * 0.02 * scale;
  return (
    <g>
      {lines.flat()}
      {labels}
      <text className="g-label" x={-fs * 0.4} y={fs * 1.1} fontSize={fs} textAnchor="end">0</text>
      <text className="g-axis-name" x={(range + 0.45) * U} y={fs * 0.35} fontSize={fs * 1.2}>x</text>
      <text className="g-axis-name" x={0} y={-(range + 0.35) * U} fontSize={fs * 1.2} textAnchor="middle">y</text>
      {points.map((p, i) => {
        const x = Fraction.parse(p.x)!.toNumber() * U;
        const y = -Fraction.parse(p.y)!.toNumber() * U;
        const color = TONES[p.tone ?? 'a'];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r * 1.9} fill={color} opacity={0.18} />
            <circle cx={x} cy={y} r={r} fill={color} stroke="white" strokeWidth={r * 0.35} />
            {p.label && (
              <text x={x + r * 1.6} y={y - r * 1.6} fontSize={fs * 1.15} className="g-point-label" fill={color}>
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

const viewBox = (v: View) => `${(v.cx - v.half) * U} ${(-v.cy - v.half) * U} ${2 * v.half * U} ${2 * v.half * U}`;

export function CoordinateGrid({ grid, value, onChange, extra = [], label = 'P' }: Props) {
  const R = grid.range;
  const step = Fraction.parse(grid.step) ?? F(1);
  const m = Math.max(1, Math.round(step.d / step.n)); // steps per unit; step is 1/m
  const full = R + PAD;
  const interactive = !!onChange;

  const [zoom, setZoom] = useState(0);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const half = full / ZOOMS[zoom];
  const clamp = (c: number) => Math.max(-full + half, Math.min(full - half, c));
  const view: View = { cx: clamp(center.x), cy: clamp(center.y), half };

  const px = value ? Fraction.parse(value.x) : null;
  const py = value ? Fraction.parse(value.y) : null;
  const points: GridPoint[] = [...grid.points, ...extra];
  if (px && py) points.push({ label, x: value!.x, y: value!.y, tone: 'mine' });

  const snap = (u: number) => F(Math.max(-R * m, Math.min(R * m, Math.round(u * m))), m).toString();

  const place = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const next = { x: snap(p.x / U), y: snap(-p.y / U) };
    if (next.x !== value?.x || next.y !== value?.y) {
      onChange!(next);
      sounds.tap();
    }
  };

  const nudge = (dx: number, dy: number) => {
    const x = (px ?? F(0)).add(F(dx, m));
    const y = (py ?? F(0)).add(F(dy, m));
    if (Math.abs(x.toNumber()) > R || Math.abs(y.toNumber()) > R) return;
    onChange!({ x: x.toString(), y: y.toString() });
    sounds.tap();
    // keep the point in view when zoomed
    if (Math.abs(x.toNumber() - view.cx) > half * 0.8 || Math.abs(y.toNumber() - view.cy) > half * 0.8) {
      setCenter({ x: x.toNumber(), y: y.toNumber() });
    }
  };

  const changeZoom = (dir: number) => {
    const z = Math.max(0, Math.min(ZOOMS.length - 1, zoom + dir));
    setZoom(z);
    setCenter({ x: px?.toNumber() ?? 0, y: py?.toNumber() ?? 0 });
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (moves[e.key]) {
      e.preventDefault();
      nudge(...moves[e.key]);
    }
  };

  const style = grid.style ?? 'mixed';

  return (
    <div className="grid-wrap">
      <svg
        ref={svgRef}
        className={`grid ${interactive ? 'grid-interactive' : ''}`}
        viewBox={viewBox(view)}
        role={interactive ? 'application' : 'img'}
        aria-label={interactive ? 'Coordinate grid. Tap to place your point, or use the arrow keys.' : 'Coordinate grid'}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? onKey : undefined}
        onPointerDown={
          interactive
            ? (e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                place(e);
              }
            : undefined
        }
        onPointerMove={interactive ? (e) => e.buttons && place(e) : undefined}
      >
        <Layers range={R} m={m} view={view} points={points} />
      </svg>

      {interactive && (
        <div className="grid-controls">
          <div className="readout" aria-live="polite">
            {px && py ? (
              <MathText r={[`${label} = (`, toExpr(px, style), ', ', toExpr(py, style), ')']} />
            ) : (
              <span className="muted">Tap the grid to place {label}</span>
            )}
          </div>
          <div className="nudge">
            <button type="button" className="icon-btn" onClick={() => nudge(-1, 0)} aria-label="Move left">←</button>
            <button type="button" className="icon-btn" onClick={() => nudge(0, 1)} aria-label="Move up">↑</button>
            <button type="button" className="icon-btn" onClick={() => nudge(0, -1)} aria-label="Move down">↓</button>
            <button type="button" className="icon-btn" onClick={() => nudge(1, 0)} aria-label="Move right">→</button>
            <span className="spacer" />
            <button type="button" className="icon-btn" onClick={() => changeZoom(-1)} disabled={zoom === 0} aria-label="Zoom out">🔍−</button>
            <button type="button" className="icon-btn" onClick={() => changeZoom(1)} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">🔍+</button>
          </div>
        </div>
      )}
    </div>
  );
}
