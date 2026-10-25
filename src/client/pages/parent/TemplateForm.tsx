import { useRef } from 'react';
import type { Params } from '../../../shared/types.ts';

// Loosely typed while the parent types: the server cleans it up (see shared/generators/custom.ts).
type Var = { name: string; type: string; [k: string]: unknown };
type Ans = { label: string; formula: string; suffix: string };

const TYPES = [
  { value: 'whole', label: 'Whole number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'fraction', label: 'Fraction' },
  { value: 'calc', label: 'Worked out from others' },
  { value: 'words', label: 'Pick a word' },
];

const NEW_VAR: Record<string, Omit<Var, 'name'>> = {
  whole: { type: 'whole', min: 1, max: 20, step: 1 },
  decimal: { type: 'decimal', min: 0.1, max: 10, places: 1 },
  fraction: { type: 'fraction', min: 0.25, max: 3, dens: [2, 3, 4], style: 'mixed' },
  calc: { type: 'calc', formula: '' },
  words: { type: 'words', options: [] },
};

const lines = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '');

/** The editor for "Your own question": question text with {placeholders}, the numbers, rules and answers. */
export function TemplateForm({ params, onChange }: { params: Params; onChange: (p: Params) => void }) {
  const text = useRef<HTMLTextAreaElement>(null);
  const vars = (params.vars as Var[]) ?? [];
  const answers = (params.answers as Ans[]) ?? [];
  const set = (k: string, v: unknown) => onChange({ ...params, [k]: v });
  const setVar = (i: number, patch: Partial<Var>) => set('vars', vars.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const setAns = (i: number, patch: Partial<Ans>) => set('answers', answers.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const insert = (name: string) => {
    const el = text.current;
    const s = String(params.text ?? '');
    const at = el ? el.selectionStart : s.length;
    set('text', `${s.slice(0, at)}{${name}}${s.slice(el ? el.selectionEnd : at)}`);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + name.length + 2, at + name.length + 2);
    });
  };
  const addVar = () => {
    const used = new Set(vars.map((v) => v.name));
    const name = 'abcdefghjkmnpqrstuvwxyz'.split('').find((c) => !used.has(c)) ?? `n${vars.length}`;
    set('vars', [...vars, { name, ...NEW_VAR.whole }]);
  };

  return (
    <div className="template-form">
      <div className="field">
        <label htmlFor="tpl-text">Question</label>
        <textarea
          id="tpl-text"
          ref={text}
          rows={3}
          maxLength={600}
          value={String(params.text ?? '')}
          placeholder="Maria has {a} stickers and gives away {b}. How many are left?"
          onChange={(e) => set('text', e.target.value)}
        />
        {vars.length > 0 && (
          <div className="chips">
            {vars.map((v) => (
              <button key={v.name} type="button" className="chip" onClick={() => insert(v.name)}>+ {`{${v.name}}`}</button>
            ))}
          </div>
        )}
        <p className="muted">Put a name in curly braces where a number goes. You can also do math in them, like {'{a * 2}'}.</p>
      </div>

      <div className="field">
        <label>Numbers</label>
        <ul className="var-list">
          {vars.map((v, i) => (
            <li key={i} className="var-row">
              <input aria-label="Name" className="var-name" value={v.name} maxLength={12} onChange={(e) => setVar(i, { name: e.target.value })} />
              <select aria-label="Kind" value={v.type} onChange={(e) => setVar(i, { name: v.name, ...NEW_VAR[e.target.value] })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {(v.type === 'whole' || v.type === 'decimal' || v.type === 'fraction') && (
                <>
                  <label className="var-opt">from <input type="number" step="any" value={String(v.min)} onChange={(e) => setVar(i, { min: e.target.value })} /></label>
                  <label className="var-opt">to <input type="number" step="any" value={String(v.max)} onChange={(e) => setVar(i, { max: e.target.value })} /></label>
                </>
              )}
              {v.type === 'whole' && (
                <label className="var-opt">count by <input type="number" min={1} value={String(v.step)} onChange={(e) => setVar(i, { step: e.target.value })} /></label>
              )}
              {v.type === 'decimal' && (
                <label className="var-opt">places
                  <select value={String(v.places)} onChange={(e) => setVar(i, { places: Number(e.target.value) })}>
                    {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              )}
              {v.type === 'fraction' && (
                <>
                  <label className="var-opt">denominators
                    <input value={(v.dens as unknown[]).join(',')} placeholder="2, 3, 4" onChange={(e) => setVar(i, { dens: e.target.value.split(',') })} />
                  </label>
                  <label className="var-opt">write as
                    <select value={String(v.style)} onChange={(e) => setVar(i, { style: e.target.value })}>
                      <option value="mixed">mixed numbers (1 1/2)</option>
                      <option value="fraction">fractions (3/2)</option>
                    </select>
                  </label>
                </>
              )}
              {v.type === 'calc' && (
                <label className="var-opt wide">= <input value={String(v.formula)} placeholder="w * l" onChange={(e) => setVar(i, { formula: e.target.value })} /></label>
              )}
              {v.type === 'words' && (
                <label className="var-opt wide">one of
                  <input value={(v.options as string[]).join(',')} placeholder="Maria, Jamal, Priya" onChange={(e) => setVar(i, { options: e.target.value.split(',') })} />
                </label>
              )}
              <button type="button" className="btn small danger" aria-label={`Remove ${v.name}`} onClick={() => set('vars', vars.filter((_, j) => j !== i))}>✕</button>
            </li>
          ))}
        </ul>
        {vars.length < 8 && <button type="button" className="btn small" onClick={addVar}>+ Add a number</button>}
      </div>

      <div className="field">
        <label htmlFor="tpl-where">Rules (optional, one per line)</label>
        <textarea id="tpl-where" rows={2} value={lines(params.where)} placeholder={'b < a\nwhole(a / b)'} onChange={(e) => set('where', e.target.value.split('\n'))} />
        <p className="muted">New numbers are picked until every rule is true, e.g. so an answer is never negative.</p>
      </div>

      <div className="field">
        <label>{answers.length > 1 ? 'Answers' : 'Answer'}</label>
        {answers.map((a, i) => (
          <div key={i} className="var-row">
            {answers.length > 1 && <input aria-label="Box label" placeholder={`Answer ${i + 1}`} value={a.label} maxLength={30} onChange={(e) => setAns(i, { label: e.target.value })} />}
            <label className="var-opt wide">= <input aria-label="Answer formula" value={a.formula} placeholder="a - b" onChange={(e) => setAns(i, { formula: e.target.value })} /></label>
            <input aria-label="Unit" className="var-unit" placeholder="unit, e.g. cm" value={a.suffix} maxLength={20} onChange={(e) => setAns(i, { suffix: e.target.value })} />
            {answers.length > 1 && (
              <button type="button" className="btn small danger" aria-label="Remove this answer box" onClick={() => set('answers', answers.filter((_, j) => j !== i))}>✕</button>
            )}
          </div>
        ))}
        {answers.length < 4 && (
          <button type="button" className="btn small" onClick={() => set('answers', [...answers, { label: '', formula: '', suffix: '' }])}>+ Another answer box</button>
        )}
        <select aria-label="Answer form" value={String(params.form ?? 'any')} onChange={(e) => set('form', e.target.value)}>
          <option value="any">Any form is OK (1/2 = 0.5)</option>
          <option value="fraction">Must be written as a fraction</option>
          <option value="decimal">Must be written as a decimal</option>
        </select>
      </div>

      <details>
        <summary>Hint and worked steps (optional)</summary>
        <div className="field">
          <label htmlFor="tpl-hint">Hint after a first wrong try</label>
          <input id="tpl-hint" value={String(params.hint ?? '')} maxLength={300} onChange={(e) => set('hint', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tpl-steps">Steps shown after a second miss (one per line; {'{answer}'} is the answer)</label>
          <textarea id="tpl-steps" rows={3} value={lines(params.steps)} placeholder="{a} − {b} = {answer}" onChange={(e) => set('steps', e.target.value.split('\n'))} />
        </div>
      </details>

      <details>
        <summary>What can go in a formula?</summary>
        <ul className="muted formula-help">
          <li><code>+ - * / ^</code> and <code>( )</code>. Math is exact, so 1/3 stays 1/3.</li>
          <li><code>abs(x) min(a, b) max(a, b) gcd(a, b) lcm(a, b) floor(x) round(x)</code></li>
          <li>Rules: <code>&lt; &gt; &lt;= &gt;= = !=</code>, <code>and or not</code>, and <code>whole(x)</code> for “x is a whole number”.</li>
          <li>Several answer boxes: use <code>{'{answer1}'}</code>, <code>{'{answer2}'}</code> in the steps.</li>
        </ul>
      </details>
    </div>
  );
}
