import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.ts';
import type { Question, Response } from '../../../shared/types.ts';
import { Fraction } from '../../../shared/fraction.ts';
import { toExpr, type Rich } from '../../../shared/expr.ts';
import { MathExpr, MathText } from '../../components/MathText.tsx';
import { CoordinateGrid } from '../../components/CoordinateGrid.tsx';
import { fmtDuration, fmtWhen } from './format.ts';

interface ReviewQ {
  id: number;
  label: string;
  question: Question;
  first: Response | null;
  retry: Response | null;
  correctFirst: number | null;
  correctFinal: number | null;
  timeMs: number | null;
}

interface Review {
  quiz: { id: number; finished_at: string | null; score: number | null; total: number; stars_earned: number };
  kid: { name: string } | null;
  questions: ReviewQ[];
}

/** Render what she answered in a readable way. */
function ResponseText({ q, r }: { q: Question; r: Response | null }) {
  if (!r) return <span className="muted">no answer</span>;
  const input = q.input;
  const num = (s: unknown) => {
    const f = Fraction.parse(s);
    return f ? <MathExpr e={toExpr(f, (input.kind !== 'order' && input.kind !== 'choice' && input.grid?.style) || 'mixed')} /> : <code>{String(s ?? '')}</code>;
  };
  if (input.kind === 'order' && 'ids' in r) {
    const byId = new Map(input.items.map((i) => [i.id, i.expr]));
    const sep = input.direction === 'asc' ? ' < ' : ' > ';
    const rich: Rich = (r.ids ?? []).flatMap((id, i) => (byId.has(id) ? (i ? [sep, byId.get(id)!] : [byId.get(id)!]) : []));
    return <MathText r={rich} />;
  }
  if (input.kind === 'choice' && 'id' in r) {
    return <MathText r={[input.left, ` ${input.options.find((o) => o.id === r.id)?.label ?? '?'} `, input.right]} />;
  }
  if ('value' in r) return num(r.value);
  if ('x' in r) return <span>({num(r.x)}, {num(r.y)})</span>;
  return <code>{JSON.stringify(r)}</code>;
}

const mark = (v: number | null) => (v === 1 ? <span className="mark good">✓</span> : v === 0 ? <span className="mark bad">✗</span> : <span className="mark">–</span>);

export function QuizReview() {
  const { id } = useParams();
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Review>('GET', `/api/parent/quiz/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  if (error) return <p className="warn">{error}</p>;
  if (!data) return <div className="loading">Loading…</div>;
  const { quiz, kid, questions } = data;

  return (
    <div className="parent-body">
      <Link to="/parent">← Dashboard</Link>
      <h1>{kid ? `${kid.name}’s quiz` : 'Quiz review'}</h1>
      <p className="muted">
        {quiz.finished_at ? fmtWhen(quiz.finished_at) : 'Not finished'} · {quiz.score ?? 0}/{quiz.total} on the first try · ⭐ {quiz.stars_earned} ·{' '}
        {fmtDuration(questions.reduce((s, q) => s + (q.timeMs ?? 0), 0))}
      </p>
      {questions.map((r, i) => {
        const q = r.question;
        const grid = q.input.kind !== 'order' && q.input.kind !== 'choice' ? q.input.grid : undefined;
        const overlay = [];
        if (q.input.kind === 'plot') {
          if (r.first && 'x' in r.first) overlay.push({ label: '1st', x: r.first.x, y: r.first.y, tone: 'mine' as const });
          if (r.retry && 'x' in r.retry) overlay.push({ label: '2nd', x: r.retry.x, y: r.retry.y, tone: 'retry' as const });
          if (q.answer.kind === 'pair') overlay.push({ label: '✓', x: q.answer.x, y: q.answer.y, tone: 'correct' as const });
        }
        return (
          <section key={r.id} className={`card review-q ${r.correctFirst ? 'right' : r.correctFinal ? 'fixed' : 'wrong'}`}>
            <div className="review-head">
              <span className="q-number">#{i + 1} · {r.label}</span>
              <span className="muted">{fmtDuration(r.timeMs)}</span>
            </div>
            <p className="prompt-small"><MathText r={q.prompt} /></p>
            {q.input.kind === 'choice' && <p className="prompt-small"><MathText r={[q.input.left, '  ?  ', q.input.right]} /></p>}
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
            <details>
              <summary>Explanation she saw{r.correctFinal ? ' (only shown when missed)' : ''}</summary>
              <div className="steps">{q.explanation.map((line, j) => <p key={j}><MathText r={line} /></p>)}</div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
