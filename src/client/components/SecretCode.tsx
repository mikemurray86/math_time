import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.ts';
import { BADGES } from '../../shared/rewards.ts';
import { retroConfetti } from '../celebrate.ts';
import { sounds } from '../sounds.ts';

type Dir = 'up' | 'down' | 'left' | 'right';
const CODE: Dir[] = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const SWIPE = 40; // px a finger has to travel to count as a swipe

// Grown-ups get a joke instead of a badge.
const PARENT_CHEATS = [
  '☕ Infinite coffee unlocked',
  '😴 +8 hours of sleep',
  '🧺 Laundry auto-folds for 24 hours',
  '🔇 Bedtime arguments disabled',
  '🍕 Dinner is now someone else’s problem',
  '🧦 Every sock has found its match',
];

// After the badge, kids get a silly "cheat" every time they enter it again.
const KID_CHEATS = [
  '🦖 Your helper is now 10% dinosaur',
  '🥦 Broccoli now tastes like ice cream',
  '🐌 The snail from Disco Mode says hi',
  '🚀 Your pencil now goes 1,000 mph',
  '🧦 Your socks are now invisible',
  '🍪 Cookies have zero crumbs',
  '🎈 Gravity is optional on Tuesdays',
  '🐶 Every dog you see will wave at you',
  '🌈 Puddles now splash rainbows',
  '🤖 Robot voice: ACTIVATED. Beep boop',
  '⭐ +1,000,000 stars! …Just kidding, keep practicing 😉',
];

/** The classic cheat code, by arrow keys or swipes: earns the secret Gamer badge on kid pages, and a laugh on grown-up pages. */
export function SecretCode() {
  const { pathname } = useLocation();
  const parentPage = pathname.startsWith('/parent');
  const [show, setShow] = useState(false);
  const [cheat, setCheat] = useState('');
  const seq = useRef<Dir[]>([]);

  useEffect(() => {
    if (!cheat) return;
    const t = setTimeout(() => setCheat(''), 4000);
    return () => clearTimeout(t);
  }, [cheat]);

  useEffect(() => {
    if (pathname === '/who') return;
    const push = (d: Dir) => {
      const s = [...seq.current, d].slice(-CODE.length);
      seq.current = s;
      if (s.length < CODE.length || s.some((x, i) => x !== CODE[i])) return;
      seq.current = [];
      retroConfetti();
      sounds.retroWin();
      const joke = (list: string[]) => setCheat((prev) => list.filter((c) => c !== prev)[Math.floor(Math.random() * (list.length - 1))]);
      if (parentPage) {
        joke(PARENT_CHEATS);
        return;
      }
      api<{ newBadges: string[] }>('POST', '/api/secret/gamer')
        .then((r) => (r.newBadges.includes('gamer') ? setShow(true) : joke(KID_CHEATS)))
        .catch(() => joke(KID_CHEATS));
    };
    const onKey = (e: KeyboardEvent) => {
      if (KEYS[e.key]) push(KEYS[e.key]);
    };
    let start: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pathname, parentPage]);

  if (cheat) {
    return (
      <div className="cheat-toast" role="status">
        <strong>🎮 Cheat code accepted!</strong> {cheat}
      </div>
    );
  }
  return show ? <BadgePopup code="gamer" onClose={() => setShow(false)} /> : null;
}

/** "Secret badge unlocked!" for a secret found on the page. */
export function BadgePopup({ code, onClose }: { code: string; onClose: () => void }) {
  const b = BADGES.find((x) => x.code === code)!;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card new-badges" role="dialog" aria-modal="true" aria-label="Secret badge found" onClick={(e) => e.stopPropagation()}>
        <h2>Secret badge unlocked!</h2>
        <ul className="badge-shelf">
          <li className="earned pop">
            <span className="badge-emoji">{b.emoji}</span>
            <span className="badge-name">{b.name}</span>
            <span className="badge-desc">{b.description}</span>
          </li>
        </ul>
        <div className="sheet-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>Awesome!</button>
        </div>
      </div>
    </div>
  );
}
