import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, localDate } from '../api.ts';
import type { Answer, InputSpec, PublicQuestion } from '../../shared/types.ts';
import { exprValue, type Rich } from '../../shared/expr.ts';
import { ScratchPad } from '../components/ScratchPad.tsx';
import { MathText } from '../components/MathText.tsx';
import { MascotSays, type Mood } from '../components/Mascot.tsx';
import { QuestionInput, draftReady, draftToResponse, initialDraft, type Draft } from '../components/QuestionInput.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import { sounds } from '../sounds.ts';
import { burst } from '../celebrate.ts';
import { useModeFx } from '../components/ModeFx.tsx';

interface QuizData {
  quizId: number;
  allowRetry: boolean;
  challengeMode: boolean;
  questions: (PublicQuestion & { id: number; challenge?: string })[]; // challenge: the grade it's from
}

interface Feedback {
  correct: boolean;
  final: boolean;
  stars: number;
  hint?: Rich;
  explanation?: Rich[];
  answerText?: Rich;
  answer?: Answer;
}

export interface QuizResult {
  quizId: number;
  score: number;
  total: number;
  stars: number;
  newBadges: string[];
  streak: number;
  totalStars: number;
}

const PRAISE = ['Awesome!', 'You nailed it!', 'Math wizard! 🧙', 'Boom! Correct!', 'Fantastic!', 'Super smart!', 'Yes! Way to go!', 'Brilliant!'];
const RETRY_PRAISE = ['You fixed it! 💪', 'Great comeback!', 'Persistence pays off!'];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/** Number-line range covering the question's numbers, always including 0. */
function numberLineFor(input: InputSpec) {
  const exprs = input.kind === 'order' ? input.items.map((i) => i.expr) : input.kind === 'choice' && input.left && input.right ? [input.left, input.right] : null;
  if (!exprs) return undefined;
  const vals = exprs.map((e) => exprValue(e).toNumber());
  return { min: Math.min(-1, Math.floor(Math.min(...vals)) - 1), max: Math.max(1, Math.ceil(Math.max(...vals)) + 1) };
}

export function Quiz() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [praise, setPraise] = useState('');
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const fx = useModeFx();
  const started = useRef(false);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;
    api<QuizData>('POST', '/api/quiz', { challenge: params.get('challenge') === '1' })
      .then((q) => {
        setQuiz(q);
        setDraft(initialDraft(q.questions[0].input));
        shownAt.current = Date.now();
      })
      .catch((e) => (e instanceof ApiError && e.status === 401 ? navigate('/who', { replace: true }) : setError(e.message)));
  }, [navigate, params]);

  if (error) {
    return (
      <main className="page kid">
        <MascotSays mood="think">{error}</MascotSays>
        <Link className="btn btn-primary" to="/">Back home</Link>
      </main>
    );
  }
  if (!quiz) return <main className="page kid"><div className="loading">Getting your questions ready…</div></main>;

  const q = quiz.questions[idx];
  const isLast = idx === quiz.questions.length - 1;
  const locked = busy || (feedback?.final ?? false);
  const ready = draftReady(q.input, draft);

  const submit = async () => {
    if (!ready || locked) return;
    setBusy(true);
    try {
      const res = await api<Feedback>('POST', `/api/quiz/${quiz.quizId}/answer`, {
        questionId: q.id,
        response: draftToResponse(q.input, draft),
        timeMs: Date.now() - shownAt.current,
      });
      shownAt.current = Date.now();
      setFeedback(res);
      setStars((s) => s + res.stars);
      if (res.correct) {
        setPraise(pick(feedback ? RETRY_PRAISE : PRAISE));
        if (fx.enabled) fx.fire('win');
        else {
          sounds.correct();
          burst();
        }
      } else if (fx.enabled) {
        fx.fire('oops');
      } else if (res.final) {
        sounds.reveal();
      } else {
        sounds.tryAgain();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (isLast) {
      setBusy(true);
      try {
        const result = await api<QuizResult>('POST', `/api/quiz/${quiz.quizId}/finish`, { localDate: localDate(), localHour: new Date().getHours() });
        navigate('/results', { replace: true, state: result });
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setDraft(initialDraft(quiz.questions[n].input));
    setFeedback(null);
    shownAt.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let mood: Mood = 'idle';
  let message: ReactNode = null;
  if (feedback?.correct) {
    mood = 'cheer';
    message = <><strong>{praise}</strong> +{feedback.stars} ⭐</>;
  } else if (feedback && !feedback.final) {
    mood = 'encourage';
    message = <><strong>So close! Try once more.</strong><br /><MathText r={feedback.hint!} /></>;
  } else if (feedback) {
    mood = 'think';
    message = <><strong>Let’s work through it together.</strong></>;
  }

  return (
    <main className="page kid quiz">
      <header className="top-bar">
        <Link to="/" className="icon-btn" aria-label="Quit quiz">✕</Link>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={quiz.questions.length} aria-valuenow={idx + (feedback?.final ? 1 : 0)}>
          <div className="progress-fill" style={{ width: `${((idx + (feedback?.final ? 1 : 0)) / quiz.questions.length) * 100}%` }} />
        </div>
        <span className="star-count">⭐ {stars}</span>
        <SoundToggle />
      </header>

      <section className="card question" key={q.id}>
        <div className="q-number">Question {idx + 1} of {quiz.questions.length}</div>
        {q.challenge && <div className="challenge-ribbon">🚀 Challenge question · {q.challenge}</div>}
        <h1 className="prompt"><MathText r={q.prompt} /></h1>
        <QuestionInput input={q.input} draft={draft} onChange={setDraft} locked={locked} reveal={feedback?.final && !feedback.correct ? feedback.answer : undefined} onEnter={submit} />
      </section>

      {message && <MascotSays mood={mood}>{message}</MascotSays>}

      {feedback?.final && !feedback.correct && (
        <section className="card explain">
          <h2>How to solve it</h2>
          <div className="steps">
            {feedback.explanation!.map((line, i) => <p key={i}><MathText r={line} /></p>)}
          </div>
          <p className="answer-line">Answer: <MathText r={feedback.answerText!} /></p>
        </section>
      )}

      <ScratchPad key={`scratch-${q.id}`} numberLine={numberLineFor(q.input)} />
      {fx.overlay}

      <div className="action-bar">
        {feedback?.final ? (
          <button type="button" className="btn btn-big btn-primary" onClick={next} disabled={busy} autoFocus>
            {isLast ? 'See my results 🎉' : 'Next question →'}
          </button>
        ) : (
          <button type="button" className="btn btn-big btn-primary" onClick={submit} disabled={!ready || busy}>
            {feedback ? 'Check again' : 'Check my answer'}
          </button>
        )}
      </div>
    </main>
  );
}
