import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import { reducedMotion } from '../celebrate.ts';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { Helper } from './Mascot.tsx';
import { BadgePopup } from './SecretCode.tsx';

const EVENT = 'mt-star-kid';
const RIDE_MS = 3600;
const SPARKS = ['#ffd60a', '#fff3b0', '#ffffff', '#ff8fc7', '#8fd3ff'];

/** A star was drawn on the scratch pad: earn Star Kid, and the first time, the helper goes for a ride. */
export function foundStar() {
  api<{ newBadges: string[] }>('POST', '/api/secret/star_kid')
    .then((r) => {
      if (r.newBadges.includes('star_kid')) window.dispatchEvent(new Event(EVENT));
    })
    .catch(() => undefined);
}

const bez = (a: number, c: number, b: number, t: number) => (1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b;

/** Where the star is at t (0..1) on a W×H screen: swoops in from the bottom left, loops the loop, then zooms off to the top right. */
function flight(t: number, W: number, H: number) {
  const R = Math.min(W, H) * 0.2;
  const cx = W / 2;
  const cy = H * 0.45;
  if (t < 0.3) {
    const u = t / 0.3;
    return { x: bez(-150, W * 0.15, cx, u), y: bez(H * 0.9, cy + R * 1.6, cy + R, u), s: 1 };
  }
  if (t < 0.7) {
    const a = Math.PI / 2 - ((t - 0.3) / 0.4) * 2 * Math.PI; // around the loop, starting at the bottom
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), s: 1 };
  }
  const u = (t - 0.7) / 0.3;
  return { x: bez(cx, W * 0.85, W + 200, u), y: bez(cy + R, cy + R, -200, u), s: 1 - 0.6 * u };
}

export function StarRide() {
  const { look } = useHelperLook();
  const [stage, setStage] = useState<'ride' | 'badge' | null>(null);
  const rider = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const go = () => {
      if (reducedMotion()) return setStage('badge');
      sounds.starRide();
      setStage('ride');
    };
    window.addEventListener(EVENT, go);
    return () => window.removeEventListener(EVENT, go);
  }, []);

  useEffect(() => {
    if (stage !== 'ride') return;
    const t0 = performance.now();
    let frame = 0;
    let lastSpark = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / RIDE_MS);
      const { innerWidth: W, innerHeight: H } = window;
      const p = flight(t, W, H);
      const q = flight(Math.min(1, t + 0.005), W, H);
      const heading = t < 1 ? (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI : 0;
      // ride level while swooping, tip with the track round the loop
      const tilt = t >= 0.3 && t < 0.7 ? heading : Math.max(-30, Math.min(30, heading));
      if (rider.current) rider.current.style.transform = `translate(${p.x - 65}px, ${p.y - 75}px) rotate(${tilt}deg) scale(${p.s})`;
      if (sky.current && now - lastSpark > 28) {
        lastSpark = now;
        const spark = document.createElement('span');
        spark.className = 'star-spark';
        spark.textContent = Math.random() < 0.5 ? '★' : '✦';
        spark.style.left = `${p.x + (Math.random() - 0.5) * 30}px`;
        spark.style.top = `${p.y + 30 + (Math.random() - 0.5) * 30}px`;
        spark.style.color = SPARKS[Math.floor(Math.random() * SPARKS.length)];
        spark.addEventListener('animationend', () => spark.remove());
        sky.current.appendChild(spark);
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else setTimeout(() => setStage('badge'), 500);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  if (stage === 'badge') return <BadgePopup code="star_kid" onClose={() => setStage(null)} />;
  if (stage !== 'ride') return null;
  return (
    <div className="star-sky" ref={sky} aria-live="polite">
      <span className="sr-only">Your helper is riding a shooting star!</span>
      <div className="star-rider" ref={rider}>
        <svg className="ride-star" viewBox="0 0 100 100" width="130" height="110" aria-hidden>
          <path d="M50 4 L61 38 L97 38 L68 59 L79 94 L50 73 L21 94 L32 59 L3 38 L39 38 Z" fill="#ffd60a" stroke="#f4a300" strokeWidth="4" strokeLinejoin="round" />
          <path d="M44 24 L48 14 M30 42 L42 42" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        </svg>
        <div className="ride-helper"><Helper look={look} mood="cheer" size={84} /></div>
      </div>
    </div>
  );
}
