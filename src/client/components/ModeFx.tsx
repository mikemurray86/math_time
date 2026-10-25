import { useCallback, useId, useState } from 'react';
import { Helper } from './Mascot.tsx';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { bubbles, burst, crazyConfetti, reducedMotion, retroConfetti } from '../celebrate.ts';

type Kind = 'win' | 'oops';

const FLOOD_STEP = 6; // vh the water rises per miss
const FLOOD_MAX = 8; // misses before it stops rising, so it never covers the whole quiz
const RETRO_WIN = ['NICE!', 'LEVEL UP!', '1UP!', 'COMBO!', 'HIGH SCORE!'];
const RETRO_OOPS = ['OOPS!', 'TRY AGAIN!', 'CONTINUE?'];
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * Celebration modes from the Star Store (Crazy, Flood, Retro, Disco). Crazy falls back to the normal
 * effects for reduced motion; the others keep their sounds and the flood's water level.
 */
export function useModeFx() {
  const { look } = useHelperLook();
  const [fx, setFx] = useState<{ kind: Kind; n: number; text: string } | null>(null);
  const [flood, setFlood] = useState(0);
  const mode = look.mode;
  const enabled = mode === 'mode-crazy' || mode === 'mode-flood' || mode === 'mode-retro' || mode === 'mode-disco';

  const fire = useCallback(
    (kind: Kind) => {
      const calm = reducedMotion();
      const show = (text = '') => !calm && setFx((f) => ({ kind, n: (f?.n ?? 0) + 1, text }));
      if (mode === 'mode-flood') {
        if (kind === 'win') {
          sounds.floodWin();
          bubbles();
        } else {
          sounds.floodOops();
          setFlood((l) => Math.min(l + 1, FLOOD_MAX));
        }
        return;
      }
      if (mode === 'mode-retro') {
        if (kind === 'win') {
          sounds.retroWin();
          retroConfetti();
        } else sounds.retroOops();
        show(pick(kind === 'win' ? RETRO_WIN : RETRO_OOPS));
        return;
      }
      if (mode === 'mode-disco') {
        if (kind === 'win') sounds.discoWin();
        else sounds.discoOops();
        show();
        return;
      }
      if (calm) {
        if (kind === 'win') {
          sounds.correct();
          burst();
        } else sounds.tryAgain();
        return;
      }
      show();
      if (kind === 'win') {
        sounds.crazyWin();
        crazyConfetti();
      } else {
        sounds.crazyOops();
        document.body.classList.remove('crazy-shake');
        void document.body.offsetWidth; // restart the animation
        document.body.classList.add('crazy-shake');
        setTimeout(() => document.body.classList.remove('crazy-shake'), 700);
      }
    },
    [mode],
  );

  const overlay = (
    <>
      {mode === 'mode-flood' && (
        <div className={flood ? 'flood' : 'flood dry'} style={{ height: `${flood * FLOOD_STEP}vh` }} aria-hidden>
          {flood >= 3 && <span className="flood-fish">🐟</span>}
          {flood >= 5 && <span className="flood-fish two">🐠</span>}
        </div>
      )}
      {fx && mode === 'mode-crazy' && (
        <div key={fx.n} className={`crazy crazy-${fx.kind}`} aria-hidden>
          <div className="crazy-flash" />
          <div className="crazy-flyer">
            <Helper look={look} mood={fx.kind === 'win' ? 'cheer' : 'think'} size={130} />
          </div>
        </div>
      )}
      {fx && mode === 'mode-retro' && (
        <div key={fx.n} className={`retro retro-${fx.kind}`} aria-hidden>
          <div className="retro-scan" />
          <div className="retro-text">{fx.text}</div>
          <div className="retro-hopper">
            <Helper look={look} mood={fx.kind === 'win' ? 'cheer' : 'think'} size={110} />
          </div>
        </div>
      )}
      {fx && mode === 'mode-disco' && (
        <div key={fx.n} className={`disco disco-${fx.kind}`} aria-hidden>
          <div className="disco-lights" />
          <div className="disco-ball"><DiscoBall /></div>
          <div className="disco-dancers">
            <Snail />
            {fx.kind === 'win' ? <Helper look={look} mood="cheer" size={110} /> : <span className="disco-huh">❓</span>}
          </div>
        </div>
      )}
    </>
  );

  return { enabled, fire, overlay };
}

/** Hangs from the top of the screen on a string; the ball itself is the bottom 80px. */
function DiscoBall() {
  const clip = useId();
  const tiles = ['#e8ecf4', '#b9c2d3', '#fdfdff', '#8d97ab'];
  return (
    <svg width="80" height="160" viewBox="0 0 80 160">
      <path d="M40 0 V82" stroke="#8d97ab" strokeWidth="2" />
      <clipPath id={clip}><circle cx="40" cy="118" r="34" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        {[...Array(7)].flatMap((_, r) =>
          [...Array(7)].map((_, c) => <rect key={`${r}-${c}`} x={6 + c * 10} y={84 + r * 10} width="9.4" height="9.4" fill={tiles[(r * 3 + c * 5) % 4]} />),
        )}
      </g>
      <circle cx="40" cy="118" r="34" fill="none" stroke="#6b7488" strokeWidth="2" />
      <text x="22" y="104" fontSize="14" fill="#fff" className="disco-twinkle">✦</text>
    </svg>
  );
}

function Snail() {
  return (
    <svg className="snail" width="96" height="72" viewBox="0 0 120 90">
      <path d="M8 84 Q6 70 24 70 H86 Q96 70 98 58 V40 Q98 30 106 30 Q114 30 114 40 V70 Q114 84 98 84 z" fill="#ffd27a" stroke="#d9a441" strokeWidth="2" />
      <g stroke="#d9a441" strokeWidth="3" strokeLinecap="round">
        <path d="M102 32 L96 10" />
        <path d="M110 32 L115 11" />
      </g>
      <circle cx="96" cy="9" r="5" fill="#2d2240" />
      <circle cx="115" cy="10" r="5" fill="#2d2240" />
      <circle cx="97.5" cy="7.5" r="1.6" fill="#fff" />
      <circle cx="116.5" cy="8.5" r="1.6" fill="#fff" />
      <path d="M101 50 q5 5 10 0" stroke="#2d2240" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="52" cy="48" r="28" fill="#c77dff" stroke="#7b2cbf" strokeWidth="3" />
      <path d="M52 48 a3 3 0 0 1 6 0 a6 6 0 0 1 -12 0 a9 9 0 0 1 18 0 a12 12 0 0 1 -24 0 a15 15 0 0 1 30 0" fill="none" stroke="#7b2cbf" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
