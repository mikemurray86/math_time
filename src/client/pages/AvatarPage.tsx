import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.ts';
import { useMe } from '../useMe.ts';
import { AVATAR_ITEMS, DEFAULT_AVATAR, helperName, type Avatar, type AvatarItem, type Slot } from '../../shared/rewards.ts';
import { AvatarView } from '../components/AvatarView.tsx';
import { Helper } from '../components/Mascot.tsx';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { useCrazyFx } from '../components/CrazyFx.tsx';
import { burst } from '../celebrate.ts';

type Who = 'me' | 'helper';

const SLOTS: Record<Who, { slot: Slot; label: string }[]> = {
  me: [
    { slot: 'color', label: 'Color' },
    { slot: 'hat', label: 'Hat' },
    { slot: 'face', label: 'Face' },
    { slot: 'extra', label: 'Extras' },
  ],
  helper: [
    { slot: 'helper', label: 'Animal' },
    { slot: 'helperFur', label: 'Fur' },
    { slot: 'helperHat', label: 'Hat' },
    { slot: 'helperExtra', label: 'Extras' },
    { slot: 'mode', label: 'Modes' },
  ],
};

/** The Star Store: children spend stars on looks for their avatar and math helper. */
export function AvatarPage() {
  const [me, setMe] = useMe();
  const { setAvatar } = useHelperLook();
  const crazy = useCrazyFx();
  const [who, setWho] = useState<Who>('me');
  const [slot, setSlot] = useState<Slot>('color');
  const [buying, setBuying] = useState<AvatarItem | null>(null);
  const [error, setError] = useState('');
  if (!me) return <main className="page kid"><div className="loading">Loading…</div></main>;
  const avatar: Avatar = { ...DEFAULT_AVATAR, ...me.avatar };

  const owned = new Set(me.owned);

  const wear = async (id: string) => {
    sounds.tap();
    const next = await api<Avatar>('PUT', '/api/avatar', { [slot]: id });
    setMe({ ...me, avatar: next });
    setAvatar(next);
  };

  const buy = async (item: AvatarItem) => {
    try {
      const res = await api<{ stars: number; avatar: Avatar; owned: string[] }>('POST', '/api/shop/buy', { itemId: item.id });
      setMe({ ...me, stars: res.stars, avatar: res.avatar, owned: res.owned });
      setAvatar(res.avatar);
      setBuying(null);
      sounds.badge();
      burst();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const switchWho = (w: Who) => {
    setWho(w);
    setSlot(SLOTS[w][0].slot);
  };

  const preview = (a: Avatar, size: number) => (who === 'me' ? <AvatarView avatar={a} size={size} /> : <Helper look={a} size={size} mood="cheer" />);
  const tile = (a: Avatar) => (slot === 'mode' ? <span className="mode-icon">{a.mode === 'mode-crazy' ? '🤪' : '😊'}</span> : preview(a, 64));

  return (
    <main className="page kid avatar-page">
      <header className="top-bar">
        <Link to="/" className="icon-btn" aria-label="Back">←</Link>
        <span className="logo">Star Store</span>
        <span className="star-count">⭐ {me.stars}</span>
      </header>
      <div className="segmented" role="tablist" aria-label="Who to dress up">
        <button role="tab" aria-selected={who === 'me'} className={who === 'me' ? 'active' : ''} onClick={() => switchWho('me')}>
          <AvatarView avatar={avatar} size={30} /> Me
        </button>
        <button role="tab" aria-selected={who === 'helper'} className={who === 'helper' ? 'active' : ''} onClick={() => switchWho('helper')}>
          <Helper look={avatar} size={30} /> {helperName(avatar)}
        </button>
      </div>
      <div className="avatar-preview card">{preview(avatar, 170)}</div>
      <div className="tabs" role="tablist">
        {SLOTS[who].map((s) => (
          <button key={s.slot} role="tab" aria-selected={slot === s.slot} className={`tab ${slot === s.slot ? 'active' : ''}`} onClick={() => setSlot(s.slot)}>
            {s.label}
          </button>
        ))}
      </div>
      {slot === 'mode' && (
        <>
          <p className="muted">Crazy Mode makes right and wrong answers WAY over the top: flashing colors, giant confetti, and your helper zooming around the screen!</p>
          {avatar.mode === 'mode-crazy' && (
            <div className="try-row">
              <button type="button" className="btn" onClick={() => crazy.fire('win')}>▶ Try a right answer</button>
              <button type="button" className="btn" onClick={() => crazy.fire('oops')}>▶ Try a miss</button>
            </div>
          )}
        </>
      )}
      {crazy.overlay}
      <ul className="item-grid">
        {AVATAR_ITEMS.filter((i) => i.slot === slot).map((item) => {
          const have = owned.has(item.id);
          const affordable = me.stars >= item.stars;
          const selected = avatar[slot] === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`item ${selected ? 'selected' : ''} ${!have && !affordable ? 'too-pricey' : ''}`}
                onClick={() => {
                  if (have) void wear(item.id);
                  else {
                    sounds.tap();
                    setError('');
                    setBuying(item);
                  }
                }}
              >
                {tile({ ...avatar, [slot]: item.id })}
                <span>{item.label}</span>
                {!have && <span className={`price ${affordable ? 'can-buy' : ''}`}>{affordable ? '' : '🔒 '}{item.stars}⭐</span>}
                {selected && <span className="wearing">Wearing</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {buying && (
        <div className="sheet-backdrop" onClick={() => setBuying(null)}>
          <div className="sheet card" role="dialog" aria-modal="true" aria-label={`Buy ${buying.label}`} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-preview">{buying.slot === 'mode' ? tile({ ...avatar, mode: buying.id }) : preview({ ...avatar, [buying.slot]: buying.id }, 120)}</div>
            <h2>{buying.label}</h2>
            {me.stars >= buying.stars ? (
              <>
                <p>Buy it for <strong>{buying.stars}⭐</strong>? You’ll have {me.stars - buying.stars}⭐ left.</p>
                {error && <p className="warn">{error}</p>}
                <div className="sheet-actions">
                  <button type="button" className="btn" onClick={() => setBuying(null)}>Not now</button>
                  <button type="button" className="btn btn-primary" onClick={() => buy(buying)}>Yes, buy it!</button>
                </div>
              </>
            ) : (
              <>
                <p>This costs <strong>{buying.stars}⭐</strong>. You need <strong>{buying.stars - me.stars} more</strong>. Keep practicing!</p>
                <div className="sheet-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setBuying(null)}>OK</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
