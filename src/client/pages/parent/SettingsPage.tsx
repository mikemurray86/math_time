import { useEffect, useState } from 'react';
import { api } from '../../api.ts';
import { SEASONS, type Season } from '../../../shared/rewards.ts';

interface Settings {
  quizLength: number;
  allowRetry: boolean;
  seasons: Season[];
  challenges: boolean;
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
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={s.challenges} onChange={(e) => setS({ ...s, challenges: e.target.checked })} />
            Next-grade challenge questions
          </label>
          <p className="muted">Children can pick challenge mode to add 2 questions from the next grade to a quiz. Once a child has mastered 90% of their question bank (8 of the last 10 right on the first try, for each question type), about 1 in 5 quiz questions comes from the next grade on its own.</p>
        </div>
        <fieldset className="field">
          <legend>Seasonal Star Store items</legend>
          {SEASONS.map((season) => (
            <label key={season.id} className="check">
              <input
                type="checkbox"
                checked={s.seasons.includes(season.id)}
                onChange={(e) => setS({ ...s, seasons: e.target.checked ? [...s.seasons, season.id] : s.seasons.filter((x) => x !== season.id) })}
              />
              {season.emoji} {season.label}
            </label>
          ))}
          <p className="muted">Switched-on sets can be bought in the Star Store. Turning one off takes it out of the store, but children keep anything they already bought.</p>
        </fieldset>
        <div className="action-row">
          <button type="button" className="btn btn-primary" onClick={save}>Save</button>
          {saved && <span className="good">Saved ✓</span>}
        </div>
        <p className="muted">The parent PIN is set with the PARENT_PIN environment variable (in the cluster, the math-time-config secret).</p>
      </section>
    </div>
  );
}
