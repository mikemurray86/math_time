import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.ts';
import { useMe } from '../useMe.ts';
import { AvatarView } from '../components/AvatarView.tsx';
import { MascotSays } from '../components/Mascot.tsx';
import { BADGES, helperName } from '../../shared/rewards.ts';
import { SoundToggle } from '../components/SoundToggle.tsx';

const GREETINGS = ['Ready to crush some math?', 'Let’s train that brain!', 'Math time is the best time!', 'I believe in you!'];

export function Home() {
  const navigate = useNavigate();
  const [me] = useMe();
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const switchKid = async () => {
    await api('POST', '/api/kid/logout');
    navigate('/who');
  };
  const earned = new Set(me?.badges.map((b) => b.code));
  const practicedToday = me?.lastDate === new Date().toLocaleDateString('en-CA');

  return (
    <main className="page kid home">
      <header className="top-bar">
        <span className="logo">Math Time</span>
        <SoundToggle />
      </header>

      <section className="hero card">
        <Link to="/avatar" className="hero-avatar" aria-label="Change your avatar">
          {me && <AvatarView avatar={me.avatar} size={110} />}
          <span className="edit-tag">✏️</span>
        </Link>
        <div>
          <h1>Hi{me ? ` ${me.name}` : ''}! 👋</h1>
          <button type="button" className="link-btn not-you" onClick={switchKid}>Not {me?.name ?? 'you'}? Switch player</button>
          <div className="stats">
            <span className="stat"><span className="stat-icon">⭐</span>{me?.stars ?? 0}<small>stars</small></span>
            <span className={`stat ${me?.streak ? 'hot' : ''}`}>
              <span className="stat-icon">🔥</span>{me?.streak ?? 0}<small>day streak</small>
            </span>
          </div>
        </div>
      </section>

      <MascotSays mood="idle">
        {practicedToday ? 'You already practiced today. Want to go for more stars?' : me?.streak ? `Keep your ${me.streak}-day streak going! ${greeting}` : greeting}
      </MascotSays>

      <Link to="/quiz" className="btn btn-big btn-primary start-btn">Start a quiz 🚀</Link>
      <Link to="/avatar" className="btn btn-big store-btn">⭐ Star Store <small>dress up you &amp; {me ? helperName(me.avatar) : 'your helper'}</small></Link>

      <section className="card">
        <h2>My badges</h2>
        <ul className="badge-shelf">
          {BADGES.map((b) => (
            <li key={b.code} className={earned.has(b.code) ? 'earned' : 'locked'} title={b.description}>
              <span className="badge-emoji">{earned.has(b.code) ? b.emoji : '🔒'}</span>
              <span className="badge-name">{b.name}</span>
              <span className="badge-desc">{b.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="kid-footer">
        <Link to="/parent">Grown-ups</Link>
      </footer>
    </main>
  );
}
