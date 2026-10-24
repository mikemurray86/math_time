import { useState } from 'react';
import { isMuted, setMuted } from '../sounds.ts';

export function SoundToggle() {
  const [muted, set] = useState(isMuted());
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => {
        setMuted(!muted);
        set(!muted);
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
