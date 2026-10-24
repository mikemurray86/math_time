import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { api } from '../../api.ts';
import type { Avatar } from '../../../shared/rewards.ts';
import { AvatarView } from '../../components/AvatarView.tsx';
import { load, save } from '../../storage.ts';

export interface ParentKid {
  id: number;
  name: string;
  codeLength: number;
  avatar: Avatar;
  stars: number;
  streak: number;
  bestStreak: number;
  lastDate: string | null;
  quizzes: number;
  lastQuiz: string | null;
}

interface ParentCtx {
  kids: ParentKid[];
  kid: ParentKid | null; // the child the dashboard and bank are showing
  reloadKids: () => Promise<void>;
}

export const useParent = () => useOutletContext<ParentCtx>();

export function ParentLayout() {
  const [parent, setParent] = useState<boolean | null>(null);
  const [kids, setKids] = useState<ParentKid[]>([]);
  const [kidId, setKidId] = useState<number | null>(() => load('mt-parent-kid', null));
  const { pathname } = useLocation();

  const reloadKids = useCallback(async () => setKids(await api<ParentKid[]>('GET', '/api/parent/kids')), []);
  useEffect(() => {
    api<{ parent: boolean }>('GET', '/api/parent/session').then((s) => setParent(s.parent)).catch(() => setParent(false));
  }, []);
  useEffect(() => {
    if (parent) void reloadKids();
  }, [parent, reloadKids]);

  if (parent === null) return <main className="page parent"><div className="loading">Loading…</div></main>;
  if (!parent) return <Login onDone={() => setParent(true)} />;

  const kid = kids.find((k) => k.id === kidId) ?? kids[0] ?? null;
  const choose = (id: number) => {
    setKidId(id);
    save('mt-parent-kid', id);
  };
  const perKid = pathname === '/parent' || pathname.startsWith('/parent/bank');

  return (
    <main className="page parent">
      <header className="parent-nav">
        <span className="logo">Math Time · Parents</span>
        <nav>
          <NavLink to="/parent" end>Dashboard</NavLink>
          <NavLink to="/parent/bank">Question bank</NavLink>
          <NavLink to="/parent/kids">Kids</NavLink>
          <NavLink to="/parent/settings">Settings</NavLink>
          <Link to="/who">Kid view</Link>
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              await api('POST', '/api/parent/logout');
              setParent(false);
            }}
          >
            Log out
          </button>
        </nav>
      </header>
      {perKid && kids.length > 0 && (
        <div className="kid-switcher" role="tablist" aria-label="Choose a child">
          {kids.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={k.id === kid?.id} className={`chip kid-chip ${k.id === kid?.id ? 'selected' : ''}`} onClick={() => choose(k.id)}>
              <AvatarView avatar={k.avatar} size={28} />
              {k.name}
            </button>
          ))}
        </div>
      )}
      {perKid && kids.length === 0 ? (
        <section className="card">
          <h2>Add your first child</h2>
          <p>Each child gets their own question bank, stars, badges and results.</p>
          <Link className="btn btn-primary" to="/parent/kids">Add a child</Link>
        </section>
      ) : (
        <Outlet context={{ kids, kid, reloadKids } satisfies ParentCtx} />
      )}
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api('POST', '/api/parent/login', { pin });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setPin('');
    }
  };
  return (
    <main className="page parent login">
      <form className="card login-card" onSubmit={submit}>
        <h1>Grown-ups only 🔐</h1>
        <label htmlFor="pin">Parent PIN</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
        {error && <p className="warn">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={!pin}>Unlock</button>
        <Link to="/">← Back to Math Time</Link>
      </form>
    </main>
  );
}
