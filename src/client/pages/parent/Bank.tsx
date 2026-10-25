import { useEffect, useState } from 'react';
import { api } from '../../api.ts';
import type { ParamField, Params, Question } from '../../../shared/types.ts';
import { MathText } from '../../components/MathText.tsx';
import { QuestionInput, initialDraft } from '../../components/QuestionInput.tsx';
import { useParent } from './ParentLayout.tsx';

interface GenInfo {
  id: string;
  name: string;
  skill: string;
  description: string;
  defaults: Params;
  fields: ParamField[];
  presets: { id: string; label: string; params: Params }[];
}

interface Entry {
  id: number;
  generator: string;
  params: Params;
  label: string;
  note: string;
  weight: number;
  enabled: boolean;
}

type Draft = Omit<Entry, 'id'> & { id?: number };

const WEIGHTS = ['Off', 'Rarely', 'Normal', 'Often', 'A lot', 'Mostly'];

function ParamForm({ fields, params, onChange }: { fields: ParamField[]; params: Params; onChange: (p: Params) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...params, [k]: v });
  return (
    <div className="param-form">
      {fields.map((f) => (
        <div key={f.key} className="field">
          <label>{f.label}</label>
          {f.type === 'int' && (
            <input type="number" min={f.min} max={f.max} value={Number(params[f.key])} onChange={(e) => set(f.key, Number(e.target.value))} />
          )}
          {f.type === 'select' && (
            <select
              value={String(params[f.key])}
              onChange={(e) => set(f.key, f.options.find((o) => String(o.value) === e.target.value)?.value)}
            >
              {f.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
            </select>
          )}
          {f.type === 'multi' && (
            <div className="checks">
              {f.options.map((o) => {
                const arr = (params[f.key] as unknown[]) ?? [];
                const on = arr.includes(o.value);
                return (
                  <label key={String(o.value)} className="check">
                    <input type="checkbox" checked={on} onChange={() => set(f.key, on ? arr.filter((v) => v !== o.value) : [...arr, o.value])} />
                    {o.label}
                  </label>
                );
              })}
            </div>
          )}
          {f.type === 'bool' && (
            <label className="check">
              <input type="checkbox" checked={!!params[f.key]} onChange={(e) => set(f.key, e.target.checked)} /> Yes
            </label>
          )}
        </div>
      ))}
    </div>
  );
}

function Preview({ q }: { q: Question }) {
  return (
    <div className="preview-q">
      <p className="prompt-small"><MathText r={q.prompt} /></p>
      <div className="preview-input">
        <QuestionInput input={q.input} draft={initialDraft(q.input)} onChange={() => undefined} locked />
      </div>
      <p className="answer-line">Answer: <MathText r={q.answerText} /></p>
    </div>
  );
}

function Editor({ kidId, kidName, draft, catalog, onCancel, onSaved }: { kidId: number; kidName: string; draft: Draft; catalog: GenInfo[]; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [samples, setSamples] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const gen = catalog.find((g) => g.id === d.generator)!;

  const preview = async (next = d) => {
    try {
      const res = await api<{ params: Params; samples: Question[] }>('POST', '/api/parent/preview', { generator: next.generator, params: next.params });
      setSamples(res.samples);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void preview();
    // regenerate samples whenever the settings change
  }, [d.generator, JSON.stringify(d.params)]);

  const save = async () => {
    try {
      if (d.id) await api('PUT', `/api/parent/bank/${d.id}`, d);
      else await api('POST', '/api/parent/bank', { ...d, kidId });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="card editor">
      <h2>{d.id ? `Edit ${kidName}’s question` : `Add a question to ${kidName}’s bank`}</h2>
      <div className="field">
        <label>Problem type</label>
        <select
          value={d.generator}
          onChange={(e) => {
            const g = catalog.find((x) => x.id === e.target.value)!;
            setD({ ...d, generator: g.id, params: g.presets[0]?.params ?? g.defaults, label: d.id ? d.label : g.presets[0]?.label ?? g.name });
          }}
        >
          {catalog.map((g) => <option key={g.id} value={g.id}>{g.skill}: {g.name}</option>)}
        </select>
        <p className="muted">{gen.description}</p>
      </div>
      <div className="field">
        <label>Start from a preset</label>
        <div className="chips">
          {gen.presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip ${JSON.stringify(p.params) === JSON.stringify(d.params) ? 'selected' : ''}`}
              onClick={() => setD({ ...d, params: p.params, label: d.id ? d.label : p.label })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <details open={!gen.presets.some((p) => JSON.stringify(p.params) === JSON.stringify(d.params))}>
        <summary>Fine-tune the difficulty</summary>
        <ParamForm fields={gen.fields} params={d.params} onChange={(params) => setD({ ...d, params })} />
      </details>
      <div className="field">
        <label>Name</label>
        <input value={d.label} maxLength={120} onChange={(e) => setD({ ...d, label: e.target.value })} />
      </div>
      <div className="field">
        <label>Note (e.g. which test it came from)</label>
        <input value={d.note} maxLength={500} placeholder="Unit 3 test, question 7" onChange={(e) => setD({ ...d, note: e.target.value })} />
      </div>
      <div className="field">
        <label>How often: {WEIGHTS[d.weight]}</label>
        <input type="range" min={0} max={5} value={d.weight} onChange={(e) => setD({ ...d, weight: Number(e.target.value) })} />
      </div>

      <div className="preview-head">
        <h3>Sample questions (the numbers change every quiz)</h3>
        <button type="button" className="btn small" onClick={() => preview()}>🔄 New samples</button>
      </div>
      <div className="previews">{samples.map((q, i) => <Preview key={i} q={q} />)}</div>

      {error && <p className="warn">{error}</p>}
      <div className="action-row">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save}>Save</button>
      </div>
    </section>
  );
}

export function Bank() {
  const { kid, kids, grades } = useParent();
  const [addGrade, setAddGrade] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [catalog, setCatalog] = useState<GenInfo[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [copied, setCopied] = useState('');

  const load = () => (kid ? api<Entry[]>('GET', `/api/parent/bank?kid=${kid.id}`).then(setEntries) : Promise.resolve());
  useEffect(() => {
    api<GenInfo[]>('GET', '/api/parent/generators').then(setCatalog);
  }, []);
  useEffect(() => {
    setEditing(null);
    void load();
  }, [kid?.id]);
  if (!kid) return null;
  const siblings = kids.filter((k) => k.id !== kid.id);

  const update = async (e: Entry, patch: Partial<Entry>) => {
    await api('PUT', `/api/parent/bank/${e.id}`, { ...e, ...patch });
    void load();
  };

  if (editing && catalog.length) {
    return (
      <div className="parent-body">
        <Editor kidId={kid.id} kidName={kid.name} draft={editing} catalog={catalog} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      </div>
    );
  }

  const nameOf = (id: string) => catalog.find((g) => g.id === id);
  const enabledCount = entries.filter((e) => e.enabled && e.weight > 0).length;

  return (
    <div className="parent-body">
      <div className="bank-head">
        <div>
          <h1>{kid.name}’s question bank</h1>
          <p className="muted">
            Each entry is a template. Every quiz makes new numbers at the same difficulty. Entries she misses come up more often on their own.
            {' '}{enabledCount} of {entries.length} turned on.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!catalog.length}
          onClick={() => {
            const g = catalog[0];
            setEditing({ generator: g.id, params: g.presets[0]?.params ?? g.defaults, label: g.presets[0]?.label ?? g.name, note: '', weight: 2, enabled: true });
          }}
        >
          + Add question
        </button>
      </div>
      <div className="grade-set-row">
        <select value={addGrade} onChange={(e) => setAddGrade(Number(e.target.value))} aria-label="Grade set to add">
          <option value={0}>Add a grade set…</option>
          {grades.map((g) => <option key={g.grade} value={g.grade}>{g.label} ({g.count} question types)</option>)}
        </select>
        <button
          type="button"
          className="btn small"
          disabled={!addGrade}
          onClick={async () => {
            const g = grades.find((x) => x.grade === addGrade)!;
            if (!confirm(`Add the ${g.count} ${g.label} question types to ${kid.name}’s bank?`)) return;
            await api('POST', '/api/parent/bank/grade-set', { kidId: kid.id, grade: addGrade });
            setAddGrade(0);
            void load();
          }}
        >
          Add
        </button>
      </div>
      {copied && <p className="good" role="status">{copied}</p>}
      <ul className="bank-list">
        {entries.map((e) => (
          <li key={e.id} className={`card bank-entry ${e.enabled ? '' : 'disabled'}`}>
            <div className="bank-main">
              <strong>{e.label}</strong>
              <span className="muted">{nameOf(e.generator)?.skill} · {nameOf(e.generator)?.name}</span>
              {e.note && <span className="note">📝 {e.note}</span>}
            </div>
            <div className="bank-controls">
              <label className="switch">
                <input type="checkbox" checked={e.enabled} onChange={() => update(e, { enabled: !e.enabled })} />
                <span>{e.enabled ? 'On' : 'Off'}</span>
              </label>
              <select value={e.weight} onChange={(ev) => update(e, { weight: Number(ev.target.value) })} aria-label="How often">
                {WEIGHTS.map((w, i) => <option key={w} value={i}>{w}</option>)}
              </select>
              <button type="button" className="btn small" onClick={() => setEditing(e)}>Edit</button>
              {siblings.length > 0 && (
                <select
                  value=""
                  aria-label="Copy to another child"
                  onChange={async (ev) => {
                    const to = siblings.find((k) => k.id === Number(ev.target.value));
                    if (!to) return;
                    await api('POST', `/api/parent/bank/${e.id}/copy`, { kidId: to.id });
                    setCopied(`Copied “${e.label}” to ${to.name}’s bank.`);
                    setTimeout(() => setCopied(''), 3000);
                  }}
                >
                  <option value="">Copy to…</option>
                  {siblings.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              )}
              <button
                type="button"
                className="btn small danger"
                onClick={async () => {
                  if (!confirm(`Delete "${e.label}"? Past quiz results are kept.`)) return;
                  await api('DELETE', `/api/parent/bank/${e.id}`);
                  void load();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
