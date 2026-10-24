import type { Avatar } from '../../shared/rewards.ts';

const BODY: Record<string, string> = {
  'color-sky': '#5ab0ff',
  'color-mint': '#4fd1a5',
  'color-peach': '#ffab91',
  'color-lavender': '#b39ddb',
  'color-gold': '#ffcf40',
  'color-galaxy': 'url(#galaxy)',
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
      <ellipse cx="60" cy="74" rx="38" ry="36" fill={fill} />
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
      <path d="M50 86 q10 9 20 0" stroke="#2d2240" strokeWidth="3" fill="none" strokeLinecap="round" />
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
      {avatar.extra === 'extra-headphones' && (
        <g>
          <path d="M22 70 Q22 26 60 26 Q98 26 98 70" fill="none" stroke="#2d2240" strokeWidth="5" />
          <rect x="14" y="62" width="14" height="22" rx="6" fill="#ff5d8f" />
          <rect x="92" y="62" width="14" height="22" rx="6" fill="#ff5d8f" />
        </g>
      )}
    </svg>
  );
}
