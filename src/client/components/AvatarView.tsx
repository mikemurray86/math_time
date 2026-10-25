import type { Avatar } from '../../shared/rewards.ts';

const BODY: Record<string, string> = {
  'color-sky': '#5ab0ff',
  'color-mint': '#4fd1a5',
  'color-peach': '#ffab91',
  'color-lavender': '#b39ddb',
  'color-gold': '#ffcf40',
  'color-galaxy': 'url(#galaxy)',
  'color-ghost': '#f4f1fb',
  'color-maple': '#d9572b',
};

export function AvatarView({ avatar, size = 120 }: { avatar: Avatar; size?: number }) {
  const fill = BODY[avatar.color] ?? BODY['color-sky'];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Your avatar" className="avatar">
      <defs>
        <radialGradient id="galaxy" cx="35%" cy="30%">
          <stop offset="0" stopColor="#8e7bff" />
          <stop offset=".6" stopColor="#4a2fbf" />
          <stop offset="1" stopColor="#1f1446" />
        </radialGradient>
      </defs>
      {avatar.extra === 'extra-rainbow' && (
        <g fill="none" strokeWidth="6" strokeLinecap="round">
          {['#ff5d5d', '#ffb347', '#ffe066', '#5fd38d', '#5ab0ff', '#9b7bff'].map((c, i) => (
            <path key={c} d={`M${10 + i * 5} 80 A${50 - i * 5} ${50 - i * 5} 0 0 1 ${110 - i * 5} 80`} stroke={c} />
          ))}
        </g>
      )}
      {avatar.extra === 'extra-cape' && <path d="M30 70 L14 114 L106 114 L90 70 z" fill="#e63946" />}
      {avatar.extra === 'extra-wings' && (
        <g stroke="#7b2cbf" strokeWidth="2">
          <ellipse cx="24" cy="54" rx="18" ry="24" transform="rotate(-25 24 54)" fill="#c77dff" />
          <ellipse cx="96" cy="54" rx="18" ry="24" transform="rotate(25 96 54)" fill="#c77dff" />
          <ellipse cx="26" cy="94" rx="13" ry="15" transform="rotate(20 26 94)" fill="#ff8fc7" />
          <ellipse cx="94" cy="94" rx="13" ry="15" transform="rotate(-20 94 94)" fill="#ff8fc7" />
          <g fill="#fff" stroke="none" opacity=".8">
            <circle cx="18" cy="48" r="4" /><circle cx="102" cy="48" r="4" /><circle cx="24" cy="96" r="3" /><circle cx="96" cy="96" r="3" />
          </g>
        </g>
      )}
      {avatar.extra === 'extra-batwings' && (
        <g fill="#3b2f5c" stroke="#231a3a" strokeWidth="2" strokeLinejoin="round">
          <path d="M34 62 L4 40 L8 56 L0 66 L12 70 L8 84 L34 84 z" />
          <path d="M86 62 L116 40 L112 56 L120 66 L108 70 L112 84 L86 84 z" />
        </g>
      )}
      {avatar.extra === 'extra-backpack' && <rect x="16" y="64" width="88" height="40" rx="14" fill="#ff9f1c" />}
      <ellipse cx="60" cy="74" rx="38" ry="36" fill={fill} {...(avatar.color === 'color-ghost' ? { stroke: '#cfc8e6', strokeWidth: 2 } : {})} />
      <ellipse cx="48" cy="58" rx="10" ry="6" fill="#fff" opacity=".25" />
      {avatar.color === 'color-galaxy' && (
        <g fill="#fff">
          <circle cx="40" cy="92" r="1.2" /><circle cx="82" cy="88" r="1.5" /><circle cx="74" cy="100" r="1" /><circle cx="88" cy="64" r="1" />
        </g>
      )}
      {/* face */}
      {avatar.face === 'face-star' ? (
        <g fill="#ffd60a" stroke="#c99700" strokeWidth="1">
          {[46, 74].map((x) => (
            <path key={x} d={`M${x} 62 l3 6 6.5 1 -4.7 4.5 1.1 6.5 -5.9 -3.1 -5.9 3.1 1.1 -6.5 -4.7 -4.5 6.5 -1 z`} />
          ))}
        </g>
      ) : (
        <g fill="#2d2240">
          <ellipse cx="46" cy="70" rx="4.5" ry="5.5" />
          <ellipse cx="74" cy="70" rx="4.5" ry="5.5" />
          <circle cx="47.5" cy="68" r="1.5" fill="#fff" />
          <circle cx="75.5" cy="68" r="1.5" fill="#fff" />
        </g>
      )}
      {avatar.face === 'face-glasses' && (
        <g fill="none" stroke="#2d2240" strokeWidth="2.5">
          <circle cx="46" cy="70" r="10" /><circle cx="74" cy="70" r="10" /><path d="M56 70 h8" />
        </g>
      )}
      {avatar.face === 'face-shades' && (
        <g fill="#1d1d2b">
          <rect x="33" y="63" width="25" height="13" rx="5" /><rect x="62" y="63" width="25" height="13" rx="5" />
          <path d="M58 67 h4" stroke="#1d1d2b" strokeWidth="3" />
        </g>
      )}
      {avatar.extra === 'extra-backpack' && (
        <path d="M30 50 Q25 78 33 104 M90 50 Q95 78 87 104" fill="none" stroke="#cc7a00" strokeWidth="5" strokeLinecap="round" />
      )}
      <path d="M50 86 q10 9 20 0" stroke="#2d2240" strokeWidth="3" fill="none" strokeLinecap="round" />
      {avatar.face === 'face-fangs' && (
        <g fill="#fff" stroke="#2d2240" strokeWidth="1" strokeLinejoin="round">
          <path d="M53 89 l2 7 l2 -6 z" /><path d="M63 90 l2 6 l2 -7 z" />
        </g>
      )}
      {avatar.extra === 'extra-scarf' && (
        <g>
          <path d="M28 98 Q60 112 92 98 L88 108 Q60 121 32 108 z" fill="#c8502a" />
          <path d="M30 101 Q60 114 90 101" fill="none" stroke="#ffb347" strokeWidth="2.5" />
          <path d="M72 108 l4 12 l9 -2 l-4 -13 z" fill="#a83e1e" />
        </g>
      )}
      <circle cx="36" cy="84" r="5" fill="#ff7aa2" opacity=".5" />
      <circle cx="84" cy="84" r="5" fill="#ff7aa2" opacity=".5" />
      {/* hats */}
      {avatar.hat === 'hat-bow' && (
        <g fill="#ff5d8f">
          <path d="M70 40 l-14 -9 v18 z" /><path d="M70 40 l14 -9 v18 z" /><circle cx="70" cy="40" r="4" fill="#e63973" />
        </g>
      )}
      {avatar.hat === 'hat-cap' && (
        <g>
          <path d="M26 54 Q28 22 60 22 Q92 22 94 54 z" fill="#3a6df0" />
          <path d="M60 52 h44 q4 0 2 4 h-46 z" fill="#2a4fc0" />
          <circle cx="60" cy="23" r="3" fill="#2a4fc0" />
        </g>
      )}
      {avatar.hat === 'hat-crown' && (
        <path d="M36 46 L38 20 L50 34 L60 16 L70 34 L82 20 L84 46 z" fill="#ffcf40" stroke="#c99700" strokeWidth="2" strokeLinejoin="round" />
      )}
      {avatar.hat === 'hat-wizard' && (
        <g>
          <path d="M30 48 L62 0 L90 48 z" fill="#6c4cf1" />
          <ellipse cx="60" cy="48" rx="36" ry="6" fill="#4a2fbf" />
          <text x="54" y="34" fontSize="12" fill="#ffd60a">★</text>
          <text x="66" y="20" fontSize="8" fill="#ffd60a">★</text>
        </g>
      )}
      {avatar.hat === 'hat-witch' && (
        <g>
          <path d="M34 46 L68 2 L62 22 L86 46 z" fill="#2d2240" />
          <rect x="34" y="38" width="52" height="7" fill="#9b5de5" />
          <ellipse cx="60" cy="47" rx="40" ry="7" fill="#1d1d2b" />
          <rect x="54" y="37" width="10" height="9" rx="1" fill="none" stroke="#ffd166" strokeWidth="2" />
        </g>
      )}
      {avatar.hat === 'hat-acorn' && (
        <g>
          <path d="M26 54 Q26 24 60 24 Q94 24 94 54 Q60 46 26 54 z" fill="#8a5a2b" />
          <path d="M34 34 L46 50 M46 27 L62 48 M60 25 L76 47 M74 28 L86 46 M38 44 L60 26 M46 49 L74 28 M62 48 L86 32" stroke="#6b4320" strokeWidth="1.5" />
          <path d="M60 24 q-2 -10 6 -14" fill="none" stroke="#6b4320" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {avatar.hat === 'hat-leaves' && (
        <g>
          {[[28, 50, -50, '#d9572b'], [40, 40, -30, '#ffb347'], [53, 35, -10, '#c0392b'], [67, 35, 10, '#e9a23b'], [80, 40, 30, '#d9572b'], [92, 50, 50, '#ffb347']].map(([x, y, r, c]) => (
            <g key={x} transform={`rotate(${r} ${x} ${y})`}>
              <path d={`M${x} ${Number(y) + 9} Q${Number(x) - 9} ${y} ${x} ${Number(y) - 10} Q${Number(x) + 9} ${y} ${x} ${Number(y) + 9} z`} fill={String(c)} />
              <path d={`M${x} ${Number(y) + 9} V${Number(y) - 6}`} stroke="#7a2e14" strokeWidth="1.2" />
            </g>
          ))}
        </g>
      )}
      {avatar.hat === 'hat-headband' && (
        <g fill="none" strokeLinecap="round">
          <path d="M27 56 Q60 30 93 56" stroke="#ff5d8f" strokeWidth="8" />
          <path d="M28 56 Q60 31 92 56" stroke="#fff" strokeWidth="2" opacity=".7" />
        </g>
      )}
      {avatar.hat === 'hat-beret' && (
        <g>
          <ellipse cx="56" cy="40" rx="32" ry="10" transform="rotate(-10 56 40)" fill="#e63946" />
          <circle cx="54" cy="28" r="3" fill="#b5212e" />
        </g>
      )}
      {avatar.extra === 'extra-headphones' && (
        <g>
          <path d="M22 70 Q22 26 60 26 Q98 26 98 70" fill="none" stroke="#2d2240" strokeWidth="5" />
          <rect x="14" y="62" width="14" height="22" rx="6" fill="#ff5d8f" />
          <rect x="92" y="62" width="14" height="22" rx="6" fill="#ff5d8f" />
        </g>
      )}
      {avatar.hat === 'hat-astronaut' && (
        <g>
          <path d="M20 106 Q60 124 100 106" fill="none" stroke="#9aa5b8" strokeWidth="8" strokeLinecap="round" />
          <circle cx="60" cy="70" r="48" fill="rgba(170,215,255,.22)" stroke="#dfe7f2" strokeWidth="5" />
          <path d="M28 52 Q34 32 54 26" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
          <path d="M60 22 v-14" stroke="#9aa5b8" strokeWidth="3" />
          <circle cx="60" cy="7" r="4" fill="#e63946" />
        </g>
      )}
    </svg>
  );
}
