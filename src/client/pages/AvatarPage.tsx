import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.ts';
import { useMe } from '../useMe.ts';
import { AVATAR_ITEMS, BADGES, DEFAULT_AVATAR, SEASONS, helperName, type Avatar, type AvatarItem, type Slot } from '../../shared/rewards.ts';
import { AvatarView } from '../components/AvatarView.tsx';
import { Helper } from '../components/Mascot.tsx';
import { useHelperLook } from '../helperLook.tsx';
import { sounds } from '../sounds.ts';
import { useModeFx } from '../components/ModeFx.tsx';
import { burst } from '../celebrate.ts';

type Who = 'me' | 'helper';

const MODES: Record<string, { icon: string; about: string }> = {
  'mode-normal': { icon: '😊', about: 'Normal mode: a happy chime and confetti for right answers.' },
  'mode-crazy': { icon: '🤪', about: 'Crazy Mode makes right and wrong answers WAY over the top: flashing colors, giant confetti, and your helper zooming around the screen!' },
  'mode-flood': { icon: '🌊', about: 'Flood Mode: every miss raises the water a little more, and it stays for the whole quiz. Right answers send bubbles floating up. Can you keep it dry?' },
  'mode-disco': { icon: '🪩', about: 'Disco Mode: a disco ball drops and your helper boogies across the screen with a dancing snail! Miss one and the record scratches… and the snail is very confused.' },
  'mode-retro': { icon: '👾', about: 'Retro Mode turns your quiz into an old video game: 8-bit sounds, pixel confetti, and your helper jumping like it just found a coin!' },
};

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
  const fx = useModeFx();
  const [who, setWho] = useState<Who>('me');
  const [slot, setSlot] = useState<Slot>('color');
  const [buying, setBuying] = useState<AvatarItem | null>(null);
  const [error, setError] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);
  if (!me) return <main className="page kid"><div className="loading">Loading…</div></main>;
  const avatar: Avatar = { ...DEFAULT_AVATAR, ...me.avatar };

  const owned = new Set(me.owned);
  const seasons = new Set(me.seasons);
  // seasonal items are for sale only while a grown-up has their set switched on; anything already bought stays
  const inStore = (i: AvatarItem) => !i.season || seasons.has(i.season) || owned.has(i.id);

  const wear = async (id: string) => {
    sounds.tap();
    const next = await api<Avatar>('PUT', '/api/avatar', { [slot]: id });
    setMe({ ...me, avatar: next });
    setAvatar(next);
  };

  const buy = async (item: AvatarItem) => {
    try {
      const res = await api<{ stars: number; avatar: Avatar; owned: string[]; newBadges: string[] }>('POST', '/api/shop/buy', { itemId: item.id });
      const earnedAt = new Date().toISOString();
      setMe({ ...me, stars: res.stars, avatar: res.avatar, owned: res.owned, badges: [...me.badges, ...res.newBadges.map((code) => ({ code, earned_at: earnedAt }))] });
      setNewBadges(res.newBadges);
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
  const tile = (a: Avatar) => (slot === 'mode' ? <span className="mode-icon">{MODES[a.mode]?.icon ?? '😊'}</span> : preview(a, 64));

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
      {newBadges.length > 0 && (
        <section className="card new-badges">
          <h2>New badge{newBadges.length > 1 ? 's' : ''}!</h2>
          <ul className="badge-shelf">
            {newBadges.map((code) => {
              const b = BADGES.find((x) => x.code === code)!;
              return (
                <li key={code} className="earned pop">
                  <span className="badge-emoji">{b.emoji}</span>
                  <span className="badge-name">{b.name}</span>
                  <span className="badge-desc">{b.description}</span>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn" onClick={() => setNewBadges([])}>Awesome!</button>
        </section>
      )}
      <div className="tabs" role="tablist">
        {SLOTS[who].map((s) => (
          <button key={s.slot} role="tab" aria-selected={slot === s.slot} className={`tab ${slot === s.slot ? 'active' : ''}`} onClick={() => setSlot(s.slot)}>
            {s.label}
          </button>
        ))}
      </div>
      {slot === 'mode' && (
        <>
          <p className="muted">{MODES[avatar.mode]?.about}</p>
          {fx.enabled && (
            <div className="try-row">
              <button type="button" className="btn" onClick={() => fx.fire('win')}>▶ Try a right answer</button>
              <button type="button" className="btn" onClick={() => fx.fire('oops')}>▶ Try a miss</button>
            </div>
          )}
        </>
      )}
      {fx.overlay}
      <ul className="item-grid">
        {AVATAR_ITEMS.filter((i) => i.slot === slot && inStore(i)).map((item) => {
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
                {item.season && <span className="season-tag" aria-label={SEASONS.find((s) => s.id === item.season)?.label}>{SEASONS.find((s) => s.id === item.season)?.emoji}</span>}
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
            {buying.slot === 'mode' && <p className="muted">{MODES[buying.id]?.about}</p>}
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
