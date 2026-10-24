import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type KidSummary } from '../api.ts';
import { AvatarView } from '../components/AvatarView.tsx';
import { Helper } from '../components/Mascot.tsx';
import { PICTURES } from '../../shared/pictures.ts';
import { sounds } from '../sounds.ts';

export function Who() {
  const navigate = useNavigate();
  const [kids, setKids] = useState<KidSummary[] | null>(null);
  const [picked, setPicked] = useState<KidSummary | null>(null);
  const [code, setCode] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    api<KidSummary[]>('GET', '/api/kids').then(setKids).catch(() => setKids([]));
  }, []);

  const login = async (kid: KidSummary, entered: number[] = []) => {
    try {
      await api('POST', '/api/kid/login', { kidId: kid.id, code: entered });
      sounds.correct();
      navigate('/', { replace: true });
    } catch (e) {
      sounds.tryAgain();
      setError((e as Error).message);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setCode([]);
      }, 500);
    }
  };

  const pick = (kid: KidSummary) => {
    sounds.tap();
    setError('');
    setCode([]);
    if (kid.codeLength === 0) void login(kid);
    else setPicked(kid);
  };

  const press = (i: number) => {
    if (!picked || code.length >= picked.codeLength) return;
    sounds.tap();
    const next = [...code, i];
    setCode(next);
    if (next.length === picked.codeLength) void login(picked, next);
  };

  if (kids === null) return <main className="page kid"><div className="loading">Loading…</div></main>;

  if (picked) {
    return (
      <main className="page kid who">
        <header className="top-bar">
          <button type="button" className="icon-btn" onClick={() => setPicked(null)} aria-label="Back">←</button>
          <span className="logo">Math Time</span>
        </header>
        <section className={`card code-card ${shake ? 'shake' : ''}`}>
          <AvatarView avatar={picked.avatar} size={96} />
          <h1>Hi {picked.name}!</h1>
          <p className="muted">Tap your secret pictures</p>
          <div className="code-dots" aria-label={`${code.length} of ${picked.codeLength} pictures entered`}>
            {Array.from({ length: picked.codeLength }, (_, i) => (
              <span key={i} className={`code-dot ${i < code.length ? 'filled' : ''}`}>{i < code.length ? PICTURES[code[i]] : ''}</span>
            ))}
          </div>
          {error && <p className="warn">{error}</p>}
          <div className="code-pad">
            {PICTURES.map((p, i) => (
              <button key={p} type="button" className="code-key" onClick={() => press(i)} aria-label={`Picture ${i + 1}`}>{p}</button>
            ))}
          </div>
          <button type="button" className="link-btn" onClick={() => setCode(code.slice(0, -1))} disabled={!code.length}>⌫ Undo</button>
        </section>
      </main>
    );
  }

  return (
    <main className="page kid who">
      <header className="top-bar"><span className="logo">Math Time</span></header>
      <div className="who-title">
        <Helper mood="idle" size={90} />
        <h1>Who’s practicing today?</h1>
      </div>
      {kids.length === 0 ? (
        <section className="card">
          <p>No players yet! Ask a grown-up to add you.</p>
          <Link className="btn btn-primary" to="/parent/kids">Add players</Link>
        </section>
      ) : (
        <ul className="who-grid">
          {kids.map((k) => (
            <li key={k.id}>
              <button type="button" className="who-kid" onClick={() => pick(k)}>
                <AvatarView avatar={k.avatar} size={110} />
                <span className="who-name">{k.name}</span>
                {k.codeLength > 0 && <span className="who-lock" aria-label="Has a picture code">🔒</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <footer className="kid-footer"><Link to="/parent">Grown-ups</Link></footer>
    </main>
  );
}
