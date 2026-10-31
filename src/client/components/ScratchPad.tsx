import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { load, save } from '../storage.ts';
import { isStar } from '../../shared/starShape.ts';
import { foundStar } from './StarRide.tsx';

interface Stroke {
  color: string;
  erase: boolean;
  pts: [number, number][]; // normalized 0..1 so the drawing survives resizes
}

const COLORS = ['#2d2240', '#6c4cf1', '#ff7a59', '#1fa67a'];
const PEN = 3;
const ERASER = 22;

export function NumberLine({ min, max }: { min: number; max: number }) {
  // Drawn in real pixels (measured), so labels stay readable on a phone.
  const ref = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 70;
  const y = 30;
  const pad = 26;
  const span = max - min;
  const perUnit = (W - 2 * pad) / span;
  const x = (v: number) => pad + (v - min) * perUnit;
  const labelEvery = perUnit >= 26 ? 1 : perUnit >= 13 ? 2 : 5;
  const minorPerUnit = perUnit >= 70 ? 4 : perUnit >= 32 ? 2 : 1;
  const ticks = [];
  for (let k = min * minorPerUnit; k <= max * minorPerUnit; k++) {
    const v = k / minorPerUnit;
    const major = k % minorPerUnit === 0;
    const half = !major && minorPerUnit === 4 && k % 2 === 0;
    const h = major ? 10 : half ? 7 : 4;
    ticks.push(<line key={k} x1={x(v)} x2={x(v)} y1={y - h} y2={y + h} className={major ? 'nl-major' : 'nl-minor'} />);
    if (major && v % labelEvery === 0) {
      ticks.push(
        <text key={`t${k}`} x={x(v)} y={y + 30} textAnchor="middle" className={v === 0 ? 'nl-label zero' : 'nl-label'}>
          {v < 0 ? `−${-v}` : v}
        </text>,
      );
    }
  }
  return (
    <svg ref={ref} className="number-line" viewBox={`0 0 ${W} ${H}`} height={H} aria-hidden>
      <line x1={8} x2={W - 8} y1={y} y2={y} className="nl-axis" />
      <path d={`M2 ${y} l10 -6 v12 z`} className="nl-arrow" />
      <path d={`M${W - 2} ${y} l-10 -6 v12 z`} className="nl-arrow" />
      {ticks}
    </svg>
  );
}

/** Freehand scratch area; optionally drawn over a number line. Cleared for each question by remounting. */
export function ScratchPad({ numberLine }: { numberLine?: { min: number; max: number } }) {
  const [open, setOpen] = useState(() => load('mt-scratch-open', window.matchMedia?.('(min-width: 640px)').matches ?? false));
  const [color, setColor] = useState(COLORS[0]);
  const [erasing, setErasing] = useState(false);
  const [count, setCount] = useState(0); // re-render tool buttons when strokes change
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toggle = () => {
    setOpen(!open);
    save('mt-scratch-open', !open);
  };

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const { width: w, height: h } = c;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = (s.erase ? ERASER : PEN) * dpr;
      ctx.beginPath();
      s.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * w, py * h) : ctx.moveTo(px * w, py * h)));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * h);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // Match the canvas to its on-screen size (sharp on high-DPI phones).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [open, redraw]);

  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = { color, erase: erasing, pts: [point(e)] };
    strokes.current.push(current.current);
    redraw();
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const r = e.currentTarget.getBoundingClientRect();
    for (const ev of events) current.current.pts.push([(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]);
    redraw();
  };

  const up = () => {
    const s = current.current;
    current.current = null;
    if (!s) return;
    setCount(strokes.current.length);
    const c = canvasRef.current;
    if (!s.erase && c && isStar(s.pts.map(([x, y]) => [x * c.clientWidth, y * c.clientHeight]))) foundStar();
  };

  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    setCount(0);
    redraw();
  };

  return (
    <section className={`card scratch ${open ? 'open' : ''}`}>
      <div className="scratch-head">
        <button type="button" className="scratch-title" onClick={toggle} aria-expanded={open}>
          ✏️ Scratch pad{numberLine ? ' + number line' : ''} <span className="chev">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="scratch-tools">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${!erasing && color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c);
                  setErasing(false);
                }}
                aria-label="Pen color"
              />
            ))}
            <button type="button" className={`icon-btn small ${erasing ? 'selected' : ''}`} onClick={() => setErasing(!erasing)} aria-pressed={erasing} aria-label="Eraser">🧽</button>
            <button type="button" className="icon-btn small" onClick={undo} disabled={!count} aria-label="Undo">↶</button>
            <button type="button" className="icon-btn small" onClick={clear} disabled={!count} aria-label="Clear">🗑️</button>
          </div>
        )}
      </div>
      {open && (
        <div className={`scratch-area ${numberLine ? 'with-line' : ''}`}>
          {numberLine && <NumberLine min={numberLine.min} max={numberLine.max} />}
          <canvas
            ref={canvasRef}
            className={erasing ? 'erasing' : ''}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label="Scratch pad. Draw here to work things out."
          />
        </div>
      )}
    </section>
  );
}
