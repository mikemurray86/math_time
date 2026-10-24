import { useEffect, useState } from 'react';
import { api } from '../../api.ts';

interface Settings {
  quizLength: number;
  allowRetry: boolean;
}

export function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api<Settings>('GET', '/api/parent/settings').then(setS);
  }, []);
  if (!s) return <div className="loading">Loading…</div>;

  const save = async () => {
    setS(await api<Settings>('PUT', '/api/parent/settings', s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="parent-body">
      <section className="card settings">
        <h1>Settings</h1>
        <p className="muted">These apply to every child. Names and picture codes are on the Kids page.</p>
        <div className="field">
          <label htmlFor="len">Questions per quiz: {s.quizLength}</label>
          <input id="len" type="range" min={3} max={30} value={s.quizLength} onChange={(e) => setS({ ...s, quizLength: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={s.allowRetry} onChange={(e) => setS({ ...s, allowRetry: e.target.checked })} />
            Give one hint and a second try after a wrong answer
          </label>
        </div>
        <div className="action-row">
          <button type="button" className="btn btn-primary" onClick={save}>Save</button>
          {saved && <span className="good">Saved ✓</span>}
        </div>
        <p className="muted">The parent PIN is set with the PARENT_PIN environment variable (in the cluster, the math-time-config secret).</p>
      </section>
    </div>
  );
}
