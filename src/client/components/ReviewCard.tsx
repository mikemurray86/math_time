import type { ReactNode } from 'react';
import type { GridPoint, Question, Response } from '../../shared/types.ts';
import { Fraction } from '../../shared/fraction.ts';
import { toExpr, type Rich } from '../../shared/expr.ts';
import { MathExpr, MathText } from './MathText.tsx';
import { CoordinateGrid } from './CoordinateGrid.tsx';
import { RectFigure } from './QuestionInput.tsx';

export interface ReviewQ {
  id: number;
  label: string;
  question: Question;
  first: Response | null;
  retry: Response | null;
  correctFirst: number | null;
  correctFinal: number | null;
  timeMs: number | null;
}

/** Render an answer in a readable way. */
function ResponseText({ q, r }: { q: Question; r: Response | null }) {
  if (!r) return <span className="muted">no answer</span>;
  const input = q.input;
  const num = (s: unknown) => {
    const f = Fraction.parse(s);
    const style = 'grid' in input ? input.grid?.style : undefined;
    return f ? <MathExpr e={toExpr(f, style ?? 'mixed')} /> : <code>{String(s ?? '')}</code>;
  };
  if (input.kind === 'order' && 'ids' in r) {
    const byId = new Map(input.items.map((i) => [i.id, i.expr]));
    const sep = input.direction === 'asc' ? ' < ' : ' > ';
    const rich: Rich = (r.ids ?? []).flatMap((id, i) => (byId.has(id) ? (i ? [sep, byId.get(id)!] : [byId.get(id)!]) : []));
    return <MathText r={rich} />;
  }
  if (input.kind === 'choice' && 'id' in r) {
    const label = input.options.find((o) => o.id === r.id)?.label ?? '?';
    return input.left && input.right ? <MathText r={[input.left, ` ${label} `, input.right]} /> : <span>{label}</span>;
  }
  if ('values' in r && input.kind === 'multi') {
    return <span>{input.fields.map((f, i) => `${f}: ${r.values?.[i] ?? '—'}`).join(',  ')}</span>;
  }
  if ('value' in r) return num(r.value);
  if ('x' in r) return <span>({num(r.x)}, {num(r.y)})</span>;
  return <code>{JSON.stringify(r)}</code>;
}

const mark = (v: number | null) => (v === 1 ? <span className="mark good">✓</span> : v === 0 ? <span className="mark bad">✗</span> : <span className="mark">–</span>);

/** One answered question: the prompt, each try, the right answer and how to solve it. */
export function ReviewCard({ r, index, meta, explainLabel, explainOpen }: {
  r: ReviewQ;
  index: number;
  meta?: ReactNode; // shown at the right of the header (e.g. time taken)
  explainLabel: string;
  explainOpen?: boolean;
}) {
  const q = r.question;
  const grid = 'grid' in q.input ? q.input.grid : undefined;
  const rect = q.input.kind === 'number' ? q.input.rect : undefined;
  const overlay: GridPoint[] = [];
  if (q.input.kind === 'plot') {
    if (r.first && 'x' in r.first) overlay.push({ label: '1st', x: r.first.x, y: r.first.y, tone: 'mine' });
    if (r.retry && 'x' in r.retry) overlay.push({ label: '2nd', x: r.retry.x, y: r.retry.y, tone: 'retry' });
    if (q.answer.kind === 'pair') overlay.push({ label: '✓', x: q.answer.x, y: q.answer.y, tone: 'correct' });
  }
  return (
    <section className={`card review-q ${r.correctFirst ? 'right' : r.correctFinal ? 'fixed' : 'wrong'}`}>
      <div className="review-head">
        <span className="q-number">#{index + 1} · {r.label}</span>
        {meta && <span className="muted">{meta}</span>}
      </div>
      <p className="prompt-small"><MathText r={q.prompt} /></p>
      {q.input.kind === 'choice' && q.input.left && q.input.right && <p className="prompt-small"><MathText r={[q.input.left, '  ?  ', q.input.right]} /></p>}
      {q.input.kind === 'choice' && !q.input.left && <p className="muted">Choices: {q.input.options.map((o) => o.label).join(' · ')}</p>}
      {rect && (
        <div className="review-grid">
          <RectFigure rect={rect} />
        </div>
      )}
      {grid && (
        <div className="review-grid">
          <CoordinateGrid grid={grid} extra={overlay} />
        </div>
      )}
      <dl className="review-answers">
        <dt>{mark(r.correctFirst)} First try</dt>
        <dd><ResponseText q={q} r={r.first} /></dd>
        {r.retry && (
          <>
            <dt>{mark(r.correctFinal)} Second try</dt>
            <dd><ResponseText q={q} r={r.retry} /></dd>
          </>
        )}
        <dt><span className="mark good">★</span> Correct</dt>
        <dd><MathText r={q.answerText} /></dd>
      </dl>
      <details open={explainOpen}>
        <summary>{explainLabel}</summary>
        <div className="steps">{q.explanation.map((line, j) => <p key={j}><MathText r={line} /></p>)}</div>
      </details>
    </section>
  );
}
