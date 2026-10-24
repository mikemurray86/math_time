import { useState } from 'react';
import { api } from '../../api.ts';
import { AvatarView } from '../../components/AvatarView.tsx';
import { CODE_MAX, CODE_MIN, PICTURES } from '../../../shared/pictures.ts';
import { useParent, type ParentKid } from './ParentLayout.tsx';
import { fmtWhen } from './format.ts';

/** Pick a picture code; the parent sees it while choosing it, since they set it for the child. */
function CodePicker({ code, onChange }: { code: number[]; onChange: (c: number[]) => void }) {
  return (
    <div className="code-picker">
      <div className="code-dots">
        {code.length === 0 ? <span className="muted">No code: tap the avatar to start</span> : code.map((c, i) => <span key={i} className="code-dot filled">{PICTURES[c]}</span>)}
      </div>
      <div className="code-pad small">
        {PICTURES.map((p, i) => (
          <button key={p} type="button" className="code-key" disabled={code.length >= CODE_MAX} onClick={() => onChange([...code, i])}>{p}</button>
        ))}
      </div>
      <div className="action-row left">
        <button type="button" className="btn small" onClick={() => onChange(code.slice(0, -1))} disabled={!code.length}>⌫ Undo</button>
        <button type="button" className="btn small" onClick={() => onChange([])} disabled={!code.length}>No code</button>
        <button
          type="button"
          className="btn small"
          onClick={() => onChange(Array.from({ length: 3 }, () => Math.floor(Math.random() * PICTURES.length)))}
        >
          🎲 Random
        </button>
      </div>
      {code.length > 0 && code.length < CODE_MIN && <p className="warn">Use at least {CODE_MIN} pictures.</p>}
    </div>
  );
}

const codeOk = (c: number[]) => c.length === 0 || c.length >= CODE_MIN;

function AddKid({ kids, onDone }: { kids: ParentKid[]; onDone: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState<number[]>([]);
  const [copyFrom, setCopyFrom] = useState(0);
  const [error, setError] = useState('');
  const save = async () => {
    try {
      await api('POST', '/api/parent/kids', { name, code: code.length ? code : null, copyBankFrom: copyFrom || undefined });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className="card editor">
      <h2>Add a child</h2>
      <div className="field">
        <label htmlFor="kid-name">Name</label>
        <input id="kid-name" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Picture code (optional, so siblings can’t play as each other)</label>
        <CodePicker code={code} onChange={setCode} />
      </div>
      <div className="field">
        <label htmlFor="kid-bank">Start their question bank with</label>
        <select id="kid-bank" value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value))}>
          <option value={0}>The starter questions</option>
          {kids.map((k) => <option key={k.id} value={k.id}>A copy of {k.name}’s bank</option>)}
        </select>
      </div>
      {error && <p className="warn">{error}</p>}
      <div className="action-row">
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!name.trim() || !codeOk(code)} onClick={save}>Add child</button>
      </div>
    </section>
  );
}

function KidCard({ kid, onChanged }: { kid: ParentKid; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(kid.name);
  const [code, setCode] = useState<number[] | null>(null); // null = leave the code alone
  const [error, setError] = useState('');

  const save = async () => {
    try {
      await api('PUT', `/api/parent/kids/${kid.id}`, { name, ...(code ? { code: code.length ? code : null } : {}) });
      setEditing(false);
      setCode(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [stars, setStars] = useState(kid.stars);
  const giveStars = async (delta: number) => {
    const updated = await api<{ stars: number }>('POST', `/api/parent/kids/${kid.id}/stars`, { delta });
    setStars(updated.stars);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete ${kid.name} and all of their quizzes, stars, badges and question bank? This can’t be undone.`)) return;
    await api('DELETE', `/api/parent/kids/${kid.id}`);
    onChanged();
  };

  return (
    <li className="card kid-card">
      <div className="kid-row">
        <AvatarView avatar={kid.avatar} size={64} />
        <div className="kid-info">
          <strong>{kid.name}</strong>
          <span className="muted">
            ⭐ {stars} · 🔥 {kid.streak} · {kid.quizzes} quiz{kid.quizzes === 1 ? '' : 'zes'}
            {kid.lastQuiz && ` · last ${fmtWhen(kid.lastQuiz)}`}
          </span>
          <span className="muted">{kid.codeLength ? `🔒 ${kid.codeLength}-picture code` : 'No picture code'}</span>
        </div>
        {!editing && <button type="button" className="btn small" onClick={() => setEditing(true)}>Edit</button>}
      </div>
      <div className="star-adjust" aria-label={`Adjust ${kid.name}’s stars`}>
        <span className="star-adjust-label">Stars</span>
        {[-10, -1].map((d) => (
          <button key={d} type="button" className="btn small" disabled={stars === 0} onClick={() => giveStars(d)}>{d}</button>
        ))}
        <span className="star-adjust-count">⭐ {stars}</span>
        {[1, 10, 50].map((d) => (
          <button key={d} type="button" className="btn small" onClick={() => giveStars(d)}>+{d}</button>
        ))}
      </div>
      {editing && (
        <div className="editor">
          <div className="field">
            <label>Name</label>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Picture code</label>
            {code === null ? (
              <div className="action-row left">
                <button type="button" className="btn small" onClick={() => setCode([])}>{kid.codeLength ? 'Change or remove code' : 'Set a code'}</button>
              </div>
            ) : (
              <CodePicker code={code} onChange={setCode} />
            )}
          </div>
          {error && <p className="warn">{error}</p>}
          <div className="action-row">
            <button type="button" className="btn small danger" onClick={remove}>Delete child</button>
            <span className="spacer" />
            <button type="button" className="btn small" onClick={() => { setEditing(false); setCode(null); setName(kid.name); }}>Cancel</button>
            <button type="button" className="btn small btn-primary" disabled={!name.trim() || (code !== null && !codeOk(code))} onClick={save}>Save</button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Kids() {
  const { kids, reloadKids } = useParent();
  const [adding, setAdding] = useState(false);
  return (
    <div className="parent-body">
      <div className="bank-head">
        <div>
          <h1>Kids</h1>
          <p className="muted">Each child has their own question bank, stars, streak, badges and quiz history. They pick themselves on the “Who’s practicing?” screen.</p>
        </div>
        {!adding && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>+ Add child</button>}
      </div>
      {adding && <AddKid kids={kids} onDone={() => { setAdding(false); void reloadKids(); }} />}
      <ul className="bank-list">
        {kids.map((k) => <KidCard key={k.id} kid={k} onChanged={reloadKids} />)}
      </ul>
    </div>
  );
}
