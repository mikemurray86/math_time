import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.ts';
import { ReviewCard, type ReviewQ } from '../../components/ReviewCard.tsx';
import { fmtDuration, fmtWhen } from './format.ts';

interface Review {
  quiz: { id: number; finished_at: string | null; score: number | null; total: number; stars_earned: number };
  kid: { name: string } | null;
  questions: ReviewQ[];
}

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
      {questions.map((r, i) => (
        <ReviewCard
          key={r.id}
          r={r}
          index={i}
          meta={fmtDuration(r.timeMs)}
          explainLabel={`Explanation${r.correctFinal ? ' (only shown during the quiz when missed)' : ''}`}
        />
      ))}
    </div>
  );
}
