import { useId, type ReactNode } from 'react';
import { DEFAULT_AVATAR, helperName, type HelperLook } from '../../shared/rewards.ts';
import { useHelperLook } from '../helperLook.tsx';

export type Mood = 'idle' | 'cheer' | 'think' | 'encourage';
type Kind = 'fox' | 'wolf' | 'horse' | 'bear';

interface Fur {
  main: string;
  inner: string; // inside the ears; the horse's mane
  muzzle: string;
  tip: string; // tail tip
  outline?: string;
}

// "Classic" is each animal's natural color; the rest fit any helper.
const CLASSIC: Record<Kind, Fur> = {
  fox: { main: '#ff8a3d', inner: '#5b3a29', muzzle: '#fff4e8', tip: '#fff' },
  wolf: { main: '#646b7c', inner: '#353a48', muzzle: '#eef0f5', tip: '#eef0f5' }, // darker than Silver
  horse: { main: '#a86b3c', inner: '#4a2b16', muzzle: '#e8c9a8', tip: '#4a2b16' },
  bear: { main: '#faf7ef', inner: '#d8d0bf', muzzle: '#ffffff', tip: '#faf7ef', outline: '#cfc5b0' },
};

const FURS: Record<string, Fur> = {
  'hfur-arctic': { main: '#eef4f9', inner: '#9fb3c8', muzzle: '#ffffff', tip: '#cfe0ee', outline: '#b8c8d8' },
  'hfur-silver': { main: '#a7adbb', inner: '#5d6375', muzzle: '#f2f3f7', tip: '#f2f3f7' },
  'hfur-ruby': { main: '#d6334a', inner: '#6e1424', muzzle: '#ffe9ec', tip: '#ffe9ec' },
  'hfur-lilac': { main: '#b48cf2', inner: '#5b3d99', muzzle: '#f6efff', tip: '#f6efff' },
  'hfur-galaxy': { main: 'galaxy', inner: '#1f1446', muzzle: '#e8e3ff', tip: '#ffd60a' },
};

const KINDS: Record<string, Kind> = { 'helper-fox': 'fox', 'helper-wolf': 'wolf', 'helper-horse': 'horse', 'helper-bear': 'bear' };
const KIND_NAMES: Record<Kind, string> = { fox: 'fox', wolf: 'wolf', horse: 'horse', bear: 'polar bear' };

type Paint = { main: string; f: Fur; line: object };

/** Tail, body and head for each animal. Eyes sit at (49, 58) and (71, 58) on all of them. */
function Animal({ kind, main, f, line }: { kind: Kind } & Paint) {
  if (kind === 'horse') {
    return (
      <g>
        <path d="M84 94 q24 -2 26 22 q-7 -8 -15 -6 q3 -8 -11 -13 z" fill={f.inner} />
        <ellipse cx="60" cy="104" rx="26" ry="15" fill={main} {...line} />
        <path d="M84 40 Q98 52 91 74 Q87 62 84 58 z" fill={f.inner} />
        <path d="M40 36 L42 11 L54 30 z" fill={main} {...line} />
        <path d="M80 36 L78 11 L66 30 z" fill={main} {...line} />
        <path d="M43 31 L44 17 L50 28 z" fill={f.inner} opacity=".6" />
        <path d="M77 31 L76 17 L70 28 z" fill={f.inner} opacity=".6" />
        <path d="M34 52 Q34 28 60 28 Q86 28 86 52 L84 74 Q84 94 60 94 Q36 94 36 74 z" fill={main} {...line} />
        <path d="M57 33 L63 33 L62 58 L58 58 z" fill={f.muzzle} />
        <path d="M47 31 Q53 17 60 25 Q66 16 73 31 Q60 37 47 31 z" fill={f.inner} />
        <ellipse cx="60" cy="80" rx="20" ry="13" fill={f.muzzle} />
        <ellipse cx="53" cy="79" rx="2.3" ry="3.2" fill="#2d2240" />
        <ellipse cx="67" cy="79" rx="2.3" ry="3.2" fill="#2d2240" />
      </g>
    );
  }
  if (kind === 'bear') {
    return (
      <g>
        <circle cx="86" cy="104" r="6" fill={main} {...line} />
        <ellipse cx="60" cy="101" rx="27" ry="16" fill={main} {...line} />
        <ellipse cx="60" cy="105" rx="15" ry="10" fill={f.muzzle} opacity=".7" />
        <circle cx="35" cy="34" r="11" fill={main} {...line} />
        <circle cx="85" cy="34" r="11" fill={main} {...line} />
        <circle cx="35" cy="34" r="5.5" fill={f.inner} />
        <circle cx="85" cy="34" r="5.5" fill={f.inner} />
        <path d="M24 60 Q24 30 60 30 Q96 30 96 60 Q96 90 60 90 Q24 90 24 60 z" fill={main} {...line} />
        <ellipse cx="60" cy="73" rx="17" ry="12.5" fill={f.muzzle} {...line} />
        <ellipse cx="60" cy="67" rx="6.5" ry="4.5" fill="#2d2240" />
      </g>
    );
  }
  if (kind === 'wolf') {
    return (
      <g>
        <path d="M84 100 q36 -6 26 -44 q-6 8 -10 6 q-2 16 -18 26 z" fill={main} {...line} />
        <path d="M106 62 q4 -6 4 -10 q-4 4 -9 5 z" fill={f.tip} />
        <ellipse cx="60" cy="100" rx="26" ry="16" fill={main} {...line} />
        <ellipse cx="60" cy="104" rx="14" ry="10" fill={f.muzzle} />
        <path d="M30 44 L31 6 L53 32 z" fill={main} {...line} />
        <path d="M90 44 L89 6 L67 32 z" fill={main} {...line} />
        <path d="M35 37 L35 16 L46 31 z" fill={f.inner} />
        <path d="M85 37 L85 16 L74 31 z" fill={f.inner} />
        <path d="M24 58 Q24 30 60 30 Q96 30 96 58 L91 68 L96 73 Q84 89 60 90 Q36 89 24 73 L29 68 z" fill={main} {...line} />
        <path d="M33 64 Q46 60 60 72 Q74 60 87 64 Q84 89 60 90 Q36 89 33 64 z" fill={f.muzzle} />
        <ellipse cx="60" cy="68" rx="5.5" ry="3.8" fill="#2d2240" />
      </g>
    );
  }
  return (
    <g>
      <path d="M86 100 q30 -10 22 -42 q-4 18 -24 26 z" fill={main} {...line} />
      <path d="M104 64 q6 -4 4 -8 q-2 6 -8 10 z" fill={f.tip} />
      <ellipse cx="60" cy="100" rx="26" ry="16" fill={main} {...line} />
      <ellipse cx="60" cy="104" rx="14" ry="10" fill={f.muzzle} />
      <path d="M28 46 L30 14 L52 34 z" fill={main} {...line} />
      <path d="M92 46 L90 14 L68 34 z" fill={main} {...line} />
      <path d="M33 38 L34 22 L45 33 z" fill={f.inner} />
      <path d="M87 38 L86 22 L75 33 z" fill={f.inner} />
      <path d="M26 56 Q26 30 60 30 Q94 30 94 56 Q94 86 60 88 Q26 86 26 56 z" fill={main} {...line} />
      <path d="M30 62 Q40 60 60 70 Q80 60 90 62 Q88 86 60 88 Q32 86 30 62 z" fill={f.muzzle} />
      <ellipse cx="60" cy="67" rx="4.5" ry="3.2" fill="#2d2240" />
    </g>
  );
}

function Hat({ id }: { id: string }) {
  switch (id) {
    case 'hhat-party':
      return (
        <g>
          <path d="M46 34 L60 2 L74 34 z" fill="#ff5d8f" />
          <path d="M51 23 L69 23 M55 14 L65 14" stroke="#ffd60a" strokeWidth="3" />
          <circle cx="60" cy="3" r="4.5" fill="#ffd60a" />
        </g>
      );
    case 'hhat-beanie':
      return (
        <g>
          <path d="M34 38 Q34 14 60 14 Q86 14 86 38 z" fill="#2ec4b6" />
          <rect x="32" y="32" width="56" height="9" rx="4.5" fill="#1f9e93" />
          <circle cx="60" cy="12" r="6" fill="#fff" />
        </g>
      );
    case 'hhat-top':
      return (
        <g>
          <rect x="46" y="4" width="28" height="29" rx="3" fill="#2d2240" />
          <rect x="46" y="25" width="28" height="5" fill="#e63946" />
          <ellipse cx="60" cy="33" rx="25" ry="5" fill="#2d2240" />
        </g>
      );
    case 'hhat-pirate':
      return (
        <g>
          <path d="M28 38 Q60 0 92 38 Q60 26 28 38 z" fill="#2d2240" />
          <circle cx="60" cy="22" r="4.5" fill="#fff" />
          <path d="M53 29 L67 35 M67 29 L53 35" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'hhat-crown':
      return (
        <g>
          <path d="M42 36 L44 12 L52 25 L60 8 L68 25 L76 12 L78 36 z" fill="#ffcf40" stroke="#c99700" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="60" cy="29" r="3" fill="#e63946" />
          <circle cx="50" cy="31" r="2.2" fill="#2ec4b6" />
          <circle cx="70" cy="31" r="2.2" fill="#2ec4b6" />
        </g>
      );
    default:
      return null;
  }
}

function Extra({ id, neck }: { id: string; neck: number }) {
  // neck shifts scarves and medals down for the horse's longer face
  const at = (el: ReactNode) => <g transform={`translate(0 ${neck})`}>{el}</g>;
  switch (id) {
    case 'hextra-scarf':
      return at(
        <g>
          <path d="M34 82 Q60 96 86 82 L86 91 Q60 105 34 91 z" fill="#e63946" />
          <path d="M70 93 l5 18 l8 -3 l-4 -17 z" fill="#c92a3a" />
        </g>,
      );
    case 'hextra-bowtie':
      return at(
        <g>
          <path d="M60 92 l-13 -8 v16 z M60 92 l13 -8 v16 z" fill="#6c4cf1" />
          <circle cx="60" cy="92" r="4" fill="#4a2fbf" />
        </g>,
      );
    case 'hextra-glasses':
      return (
        <g fill="rgba(255,255,255,.18)" stroke="#2d2240" strokeWidth="2.5">
          <circle cx="49" cy="57" r="9.5" />
          <circle cx="71" cy="57" r="9.5" />
          <path d="M58.5 57 h3" fill="none" />
        </g>
      );
    case 'hextra-medal':
      return at(
        <g>
          <path d="M51 84 L60 98 L69 84" fill="none" stroke="#3a6df0" strokeWidth="5" />
          <circle cx="60" cy="101" r="7.5" fill="#ffcf40" stroke="#c99700" strokeWidth="2" />
          <text x="60" y="105" fontSize="9" textAnchor="middle" fill="#c99700">★</text>
        </g>,
      );
    default:
      return null; // the cape is drawn behind the body
  }
}

/** The child's math helper (Pip, Luna, Maple or Popsicle), dressed however they chose in the Star Store. */
export function Helper({ mood = 'idle', size = 96, look = DEFAULT_AVATAR }: { mood?: Mood; size?: number; look?: HelperLook }) {
  const gid = useId();
  const kind = KINDS[look.helper] ?? 'fox';
  const f = FURS[look.helperFur] ?? CLASSIC[kind];
  const main = f.main === 'galaxy' ? `url(#${gid})` : f.main;
  const line = f.outline ? { stroke: f.outline, strokeWidth: 1.5 } : {};
  const horse = kind === 'horse';
  const eyes =
    mood === 'cheer' ? (
      <g stroke="#2d2240" strokeWidth="3.5" fill="none" strokeLinecap="round">
        <path d="M44 58 q5 -7 10 0" />
        <path d="M66 58 q5 -7 10 0" />
      </g>
    ) : (
      <g fill="#2d2240">
        <ellipse cx={mood === 'think' ? 51 : 49} cy={mood === 'think' ? 55 : 58} rx="4.5" ry="5.5" />
        <ellipse cx={mood === 'think' ? 73 : 71} cy={mood === 'think' ? 55 : 58} rx="4.5" ry="5.5" />
        <circle cx={mood === 'think' ? 52.5 : 50.5} cy={mood === 'think' ? 53 : 56} r="1.6" fill="#fff" />
        <circle cx={mood === 'think' ? 74.5 : 72.5} cy={mood === 'think' ? 53 : 56} r="1.6" fill="#fff" />
      </g>
    );
  const my = horse ? 13 : 0; // horse mouths sit lower, under the muzzle
  const mouth =
    mood === 'cheer' ? (
      <path d={`M53 ${74 + my} q7 9 14 0 z`} fill="#c2185b" stroke="#2d2240" strokeWidth="2" strokeLinejoin="round" />
    ) : mood === 'think' ? (
      <path d={`M55 ${75 + my} q5 -2 10 1`} stroke="#2d2240" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    ) : (
      <path d={`M53 ${73 + my} q7 6 14 0`} stroke="#2d2240" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
  const name = helperName(look);
  return (
    <svg className={`pip pip-${mood}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${name} the ${KIND_NAMES[kind]}`}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%">
          <stop offset="0" stopColor="#8e7bff" />
          <stop offset=".6" stopColor="#4a2fbf" />
          <stop offset="1" stopColor="#1f1446" />
        </radialGradient>
      </defs>
      {look.helperExtra === 'hextra-cape' && <path d="M38 82 L16 118 L104 118 L82 82 z" fill="#e63946" />}
      <Animal kind={kind} main={main} f={f} line={line} />
      {f.main === 'galaxy' && (
        <g fill="#fff">
          <circle cx="40" cy="44" r="1.2" /><circle cx="80" cy="40" r="1.5" /><circle cx="70" cy="36" r="1" /><circle cx="96" cy="76" r="1.2" />
        </g>
      )}
      {mood === 'encourage' && (
        <g stroke="#5b3a29" strokeWidth="2.5" strokeLinecap="round">
          <path d="M43 47 l10 -3" />
          <path d="M77 47 l-10 -3" />
        </g>
      )}
      {eyes}
      {mouth}
      <circle cx={horse ? 41 : 38} cy={horse ? 67 : 70} r="4.5" fill="#ff7aa2" opacity=".55" />
      <circle cx={horse ? 79 : 82} cy={horse ? 67 : 70} r="4.5" fill="#ff7aa2" opacity=".55" />
      <Extra id={look.helperExtra} neck={horse ? 8 : 0} />
      <Hat id={look.helperHat} />
      {mood === 'think' && <text x="98" y="30" fontSize="20" fill="var(--purple)">?</text>}
    </svg>
  );
}

export function MascotSays({ mood, children }: { mood: Mood; children: ReactNode }) {
  const { look } = useHelperLook();
  return (
    <div className={`mascot-says mood-${mood}`}>
      <Helper mood={mood} size={84} look={look} />
      <div className="bubble" role="status">{children}</div>
    </div>
  );
}
