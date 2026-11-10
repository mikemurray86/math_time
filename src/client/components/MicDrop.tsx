import { useEffect } from 'react';
import { reducedMotion } from '../celebrate.ts';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { Helper } from './Mascot.tsx';

/** When the mic hits the stage, in ms. The CSS timeline in styles.css (.mic-*) matches. */
export const MIC_DROP_IMPACT_MS = 1750;
const MIC_DROP_MS = 3800;

export const showMicDrop = () => !reducedMotion();

/**
 * A perfect score: the helper steps into a spotlight, puts on shades, holds out a mic
 * and lets it drop. Tap anywhere to skip.
 */
export function MicDrop({ onDone }: { onDone: () => void }) {
  const { look } = useHelperLook();

  useEffect(() => {
    sounds.micDrop(MIC_DROP_IMPACT_MS / 1000);
    const t = setTimeout(onDone, MIC_DROP_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="mic-drop" onClick={onDone} role="status" aria-live="polite">
      <span className="sr-only">Perfect score! Your helper does a mic drop.</span>
      <div className="mic-spot" aria-hidden />
      <div className="mic-title" aria-hidden>PERFECT!</div>
      <div className="mic-stage" aria-hidden>
        <div className="mic-helper">
          <Helper look={look} mood="cheer" size={150} />
          <svg className="mic-shades" viewBox="0 0 120 120" width="150" height="150">
            <path d="M38 52 h18 q2 0 2 2 q-1 10 -10 10 q-9 0 -10 -10 q0 -2 2 -2 z" fill="#1d1d2b" />
            <path d="M64 52 h18 q2 0 2 2 q-1 10 -10 10 q-9 0 -10 -10 q0 -2 2 -2 z" fill="#1d1d2b" />
            <path d="M56 55 h8 M36 54 l-8 -3 M84 54 l8 -3" stroke="#1d1d2b" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 55 l5 0 M68 55 l5 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          </svg>
        </div>
        <svg className="mic-paw" viewBox="0 0 40 30" width="40" height="30">
          <ellipse cx="20" cy="15" rx="14" ry="11" fill="#fff" stroke="#2d2240" strokeWidth="2.5" />
          <path d="M13 9 v6 M20 7 v7 M27 9 v6" stroke="#2d2240" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="mic-fall">
          <svg className="mic" viewBox="0 0 30 80" width="30" height="80">
            <path d="M9 26 L21 26 L18 76 Q15 80 12 76 z" fill="#2d2240" />
            <rect x="8" y="24" width="14" height="6" rx="2" fill="#6b6280" />
            <circle cx="15" cy="14" r="12" fill="#c9c5d6" stroke="#6b6280" strokeWidth="2" />
            <path d="M6 10 h18 M4 15 h22 M6 20 h18 M11 3 v22 M19 3 v22" stroke="#8a84a0" strokeWidth="1.3" />
            <circle cx="10" cy="9" r="3" fill="#fff" opacity=".7" />
          </svg>
        </div>
        <div className="mic-boom">BOOM.</div>
        <div className="mic-dust mic-dust-l" />
        <div className="mic-dust mic-dust-r" />
        <div className="mic-floor" />
      </div>
      <div className="mic-caption" aria-hidden>🎤 Mic drop!</div>
    </div>
  );
}
