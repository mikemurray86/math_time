import { useCallback, useState } from 'react';
import { Helper } from './Mascot.tsx';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { burst, crazyConfetti, reducedMotion } from '../celebrate.ts';

type Kind = 'win' | 'oops';

/** Crazy Mode celebrations (a Star Store item). Falls back to the normal effects for reduced motion. */
export function useCrazyFx() {
  const { look } = useHelperLook();
  const [fx, setFx] = useState<{ kind: Kind; n: number } | null>(null);
  const enabled = look.mode === 'mode-crazy';

  const fire = useCallback((kind: Kind) => {
    if (reducedMotion()) {
      if (kind === 'win') {
        sounds.correct();
        burst();
      } else sounds.tryAgain();
      return;
    }
    setFx((f) => ({ kind, n: (f?.n ?? 0) + 1 }));
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
  }, []);

  const overlay = fx && !reducedMotion() && (
    <div key={fx.n} className={`crazy crazy-${fx.kind}`} aria-hidden>
      <div className="crazy-flash" />
      <div className="crazy-flyer">
        <Helper look={look} mood={fx.kind === 'win' ? 'cheer' : 'think'} size={130} />
      </div>
    </div>
  );

  return { enabled, fire, overlay };
}
