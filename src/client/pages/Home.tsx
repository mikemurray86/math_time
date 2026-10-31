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
  const [challenge, setChallenge] = useState(false);
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

      <Link to={challenge ? '/quiz?challenge=1' : '/quiz'} className="btn btn-big btn-primary start-btn">Start a quiz 🚀</Link>
      {me?.challenge.available && (
        <div className="challenge-pick">
          <label className={`challenge-toggle ${challenge ? 'on' : ''}`}>
            <input type="checkbox" checked={challenge} onChange={(e) => setChallenge(e.target.checked)} />
            <span>⚡ <strong>Challenge mode</strong>: add 2 bonus questions from {me.challenge.nextGrade}</span>
          </label>
          {me.challenge.auto && <p className="muted">🎓 You’ve mastered {me.challenge.mastery.pct}% of your questions, so {me.challenge.nextGrade} questions will pop up in every quiz!</p>}
        </div>
      )}
      <Link to="/avatar" className="btn btn-big store-btn">⭐ Star Store <small>dress up you &amp; {me ? helperName(me.avatar) : 'your helper'}</small></Link>

      <section className="card">
        <h2>My badges</h2>
        <ul className="badge-shelf">
          {BADGES.map((b) =>
            b.secret && !earned.has(b.code) ? (
              <li key={b.code} className="locked secret" title="A secret badge">
                <span className="badge-emoji">❓</span>
                <span className="badge-name">Secret badge</span>
                <span className="badge-desc">Keep practicing to discover it!</span>
              </li>
            ) : (
              <li key={b.code} className={earned.has(b.code) ? 'earned' : 'locked'} title={b.description}>
                <span className="badge-emoji">{earned.has(b.code) ? b.emoji : '🔒'}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.description}</span>
              </li>
            ),
          )}
        </ul>
      </section>

      <footer className="kid-footer">
        <Link to="/parent">Grown-ups</Link>
      </footer>
    </main>
  );
}
