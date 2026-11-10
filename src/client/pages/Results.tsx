import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.ts';
import { ReviewCard, type ReviewQ } from '../components/ReviewCard.tsx';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { QuizResult } from './Quiz.tsx';
import { BADGES } from '../../shared/rewards.ts';
import { MascotSays } from '../components/Mascot.tsx';
import { sounds } from '../sounds.ts';
import { bigCelebration, burst } from '../celebrate.ts';
import { useModeFx } from '../components/ModeFx.tsx';
import { MicDrop, MIC_DROP_IMPACT_MS, showMicDrop } from '../components/MicDrop.tsx';

export function Results() {
  const result = useLocation().state as QuizResult | null;
  const [shownStars, setShownStars] = useState(0);
  const fx = useModeFx();
  const [review, setReview] = useState<ReviewQ[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  // Every question right on the first try, in any mode (a Time Attack with no misses or skips counts).
  const perfect = !!result && result.total > 0 && result.score === result.total;
  const [micDrop, setMicDrop] = useState(() => perfect && showMicDrop());
  const endMicDrop = useCallback(() => setMicDrop(false), []);

  useEffect(() => {
    if (!result) return;
    const great = result.timeAttack ? result.timeAttack.newBest || result.score >= 10 : result.score / result.total >= 0.7;
    // With a mic drop, the confetti waits for the mic to hit the floor.
    const delay = micDrop ? MIC_DROP_IMPACT_MS : 0;
    const celebrate = setTimeout(() => {
      if ((great || perfect) && fx.enabled) {
        fx.fire('win');
      } else if (micDrop) {
        bigCelebration();
      } else if (great || perfect) {
        sounds.fanfare();
        bigCelebration();
      } else {
        burst();
      }
    }, delay);
    const badge = result.newBadges.length ? setTimeout(sounds.badge, micDrop ? 3200 : 1200) : undefined;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setShownStars(Math.min(n, result.stars));
      if (n >= result.stars) clearInterval(t);
    }, 60);
    return () => {
      clearInterval(t);
      clearTimeout(celebrate);
      clearTimeout(badge);
    };
  }, [result]); // once per result, not again when Crazy Mode loads

  if (!result) return <Navigate to="/" replace />;
  const ta = result.timeAttack;
  const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
  const msg = ta
    ? ta.newBest && ta.best !== null
      ? `NEW HIGH SCORE! You beat your old record of ${ta.best}!`
      : ta.newBest
        ? 'Your first high score! Now try to beat it.'
        : ta.best !== null && ta.best - result.score <= 3
          ? `So close to your record of ${ta.best}! One more go?`
          : 'Great run! Every Time Attack makes you faster.'
    : pct === 100 ? 'PERFECT! You are a math superstar!' : pct >= 80 ? 'Amazing work! You really know this stuff.' : pct >= 60 ? 'Nice job! Every quiz makes you stronger.' : 'Great effort! Practice is how brains grow. 🌱';

  return (
    <main className="page kid results">
      <section className="card result-card">
        {ta?.newBest && <div className="ta-record">🏆 New high score!</div>}
        <div className="score-ring" style={{ ['--pct' as string]: ta ? Math.min(100, ta.best ? (result.score / Math.max(ta.best, result.score)) * 100 : 100) : pct }}>
          <span className="score-big">{result.score}{!ta && <small>/{result.total}</small>}</span>
        </div>
        <p className="result-sub">
          {ta ? `right in ${ta.minutes} minute${ta.minutes === 1 ? '' : 's'} · ${result.total} answered (${pct}%)` : 'right on the first try'}
        </p>
        {ta && <p className="result-sub">High score for {ta.minutes} min: <strong>{ta.newBest ? result.score : ta.best}</strong></p>}
        <div className="result-stats">
          <div className="result-stat"><span className="big">⭐ +{shownStars}</span><small>{result.totalStars} total</small></div>
          <div className="result-stat"><span className="big">🔥 {result.streak}</span><small>day streak</small></div>
        </div>
      </section>

      <MascotSays mood="cheer">{perfect && ta ? `Not a single miss! ${msg}` : msg}</MascotSays>
      {micDrop && <MicDrop onDone={endMicDrop} />}
      {fx.overlay}

      {result.newBadges.length > 0 && (
        <section className="card new-badges">
          <h2>New badge{result.newBadges.length > 1 ? 's' : ''}!</h2>
          <ul className="badge-shelf">
            {result.newBadges.map((code) => {
              const b = BADGES.find((x) => x.code === code)!;
              return (
                <li key={code} className="earned pop">
                  <span className="badge-emoji">{b.emoji}</span>
                  <span className="badge-name">{b.name}</span>
                  <span className="badge-desc">{b.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card review-intro">
        <h2>Review my answers</h2>
        <p className="muted">See every question, what you answered, and how to solve the ones you missed.</p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (!review) setReview((await api<{ questions: ReviewQ[] }>('GET', `/api/quiz/${result.quizId}/review`)).questions);
            setShowReview(!showReview);
          }}
        >
          {showReview ? 'Hide my answers' : '🔍 Show my answers'}
        </button>
      </section>
      {showReview &&
        review?.map((r, i) => (
          <ReviewCard
            key={r.id}
            r={r}
            index={i}
            meta={r.correctFirst ? '⭐⭐' : r.correctFinal ? '⭐' : ''}
            explainLabel="How to solve it"
            explainOpen={!r.correctFirst}
          />
        ))}

      <div className="action-bar two">
        <Link to="/" className="btn btn-big">Home</Link>
        {ta ? (
          <Link to={`/time-attack?min=${ta.minutes}`} className="btn btn-big btn-primary">Go again! ⏱️</Link>
        ) : (
          <Link to="/quiz" className="btn btn-big btn-primary">Another quiz!</Link>
        )}
      </div>
    </main>
  );
}
