import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, localDate } from '../api.ts';
import type { Answer, PublicQuestion } from '../../shared/types.ts';
import type { Rich } from '../../shared/expr.ts';
import { TIME_ATTACK_DEFAULT, TIME_ATTACK_MINUTES } from '../../shared/timeAttack.ts';
import { MathText } from '../components/MathText.tsx';
import { MascotSays } from '../components/Mascot.tsx';
import { QuestionInput, draftReady, draftToResponse, initialDraft, type Draft } from '../components/QuestionInput.tsx';
import { ScratchPad } from '../components/ScratchPad.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import { sounds } from '../sounds.ts';
import { burst } from '../celebrate.ts';
import type { QuizResult } from './Quiz.tsx';

type Q = PublicQuestion & { id: number; challenge?: string };

interface Start {
  quizId: number;
  minutes: number;
  remainingMs: number;
  best: number | null;
  question: Q;
}

interface Feedback {
  correct: boolean;
  stars: number;
  answerText?: Rich;
  answer?: Answer;
  next?: Q; // missing once the clock has run out
  remainingMs?: number;
}

const PRAISE = ['Yes!', 'Nice!', 'Zoom!', 'Got it!', 'Speedy!', 'Boom!', 'Correct!'];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function TimeAttack() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const minutes = TIME_ATTACK_MINUTES.includes(Number(params.get('min'))) ? Number(params.get('min')) : TIME_ATTACK_DEFAULT;
  const [run, setRun] = useState<Start | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [praise, setPraise] = useState('');
  const [busy, setBusy] = useState(false);
  const [right, setRight] = useState(0);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => performance.now());
  const deadline = useRef(0); // performance.now() when time runs out, synced from the server
  const shownAt = useRef(Date.now());
  const finishing = useRef(false);
  const started = useRef(false);

  const show = (next: Q) => {
    setQ(next);
    setDraft(initialDraft(next.input));
    setFeedback(null);
    shownAt.current = Date.now();
  };

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;
    api<Start>('POST', '/api/time-attack', { minutes })
      .then((s) => {
        deadline.current = performance.now() + s.remainingMs;
        setRun(s);
        show(s.question);
      })
      .catch((e) => (e instanceof ApiError && e.status === 401 ? navigate('/who', { replace: true }) : setError(e.message)));
  }, [navigate, minutes]);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, [run]);

  const remaining = run ? deadline.current - now : 0;
  const timeUp = !!run && remaining <= 0;

  const finish = useCallback(async () => {
    if (!run || finishing.current) return;
    finishing.current = true;
    try {
      const result = await api<QuizResult>('POST', `/api/quiz/${run.quizId}/finish`, { localDate: localDate(), localHour: new Date().getHours() });
      navigate('/results', { replace: true, state: result });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [run, navigate]);

  // Time's up: wrap up as soon as any answer in flight has come back.
  useEffect(() => {
    if (timeUp && !busy) void finish();
  }, [timeUp, busy, finish]);

  const answer = async (response: unknown, skip = false) => {
    if (!run || !q || busy || feedback || timeUp) return;
    setBusy(true);
    try {
      const res = await api<Feedback>('POST', `/api/quiz/${run.quizId}/answer`, { questionId: q.id, response, timeMs: Date.now() - shownAt.current });
      if (res.remainingMs !== undefined) deadline.current = performance.now() + res.remainingMs;
      if (res.correct) {
        setRight((n) => n + 1);
        setPraise(pick(PRAISE));
        sounds.correct();
        burst();
        setFeedback(res);
        setTimeout(() => res.next && show(res.next), 650);
      } else if (skip) {
        if (res.next) show(res.next);
      } else {
        sounds.reveal();
        setFeedback(res);
      }
      if (!res.next) deadline.current = 0; // the server says time's up
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) deadline.current = 0;
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="page kid">
        <MascotSays mood="think">{error}</MascotSays>
        <Link className="btn btn-primary" to="/">Back home</Link>
      </main>
    );
  }
  if (!run || !q) return <main className="page kid"><div className="loading">Starting the clock…</div></main>;
  if (timeUp) return <main className="page kid"><div className="loading">⏰ Time’s up! Counting your answers…</div></main>;

  const quit = (e: React.MouseEvent) => {
    if (!confirm('Stop this Time Attack? It won’t count toward your high score.')) e.preventDefault();
  };
  const ready = draftReady(q.input, draft);
  const locked = busy || !!feedback;
  const pct = Math.max(0, Math.min(100, (remaining / (run.minutes * 60_000)) * 100));

  return (
    <main className="page kid quiz time-attack">
      <header className="top-bar">
        <Link to="/" className="icon-btn" aria-label="Stop Time Attack" onClick={quit}>✕</Link>
        <div className={`ta-clock ${remaining < 10_000 ? 'hurry' : ''}`} role="timer" aria-label={`${clock(remaining)} left`}>
          ⏱️ {clock(remaining)}
        </div>
        <div className="progress ta-bar" aria-hidden>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="star-count">✅ {right}</span>
        <SoundToggle />
      </header>

      <section className="card question" key={q.id}>
        <div className="q-number">
          Time Attack · {right} right{run.best !== null && <> · high score {run.best}</>}{right > (run.best ?? 0) && run.best !== null && ' 🏆'}
        </div>
        {q.challenge && <div className="challenge-ribbon">🚀 Challenge question · {q.challenge}</div>}
        <h1 className="prompt"><MathText r={q.prompt} /></h1>
        <QuestionInput
          input={q.input}
          draft={draft}
          onChange={setDraft}
          locked={locked}
          reveal={feedback && !feedback.correct ? feedback.answer : undefined}
          onEnter={() => ready && answer(draftToResponse(q.input, draft))}
        />
      </section>

      {feedback?.correct && <MascotSays mood="cheer"><strong>{praise}</strong> +{feedback.stars} ⭐</MascotSays>}
      {feedback && !feedback.correct && (
        <MascotSays mood="think">
          Not quite. The answer was <strong><MathText r={feedback.answerText!} /></strong>
        </MascotSays>
      )}

      <ScratchPad key={`scratch-${q.id}`} />

      <div className="action-bar two">
        {feedback && !feedback.correct ? (
          <button type="button" className="btn btn-big btn-primary" onClick={() => (feedback.next ? show(feedback.next) : (deadline.current = 0))} autoFocus>
            Next question →
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-big" onClick={() => answer(null, true)} disabled={locked}>Skip ⏭️</button>
            <button type="button" className="btn btn-big btn-primary" onClick={() => answer(draftToResponse(q.input, draft))} disabled={!ready || locked}>
              Check ✔️
            </button>
          </>
        )}
      </div>
    </main>
  );
}
