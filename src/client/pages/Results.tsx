import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { ReviewCard, type ReviewQ } from '../components/ReviewCard.tsx';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { QuizResult } from './Quiz.tsx';
import { BADGES } from '../../shared/rewards.ts';
import { MascotSays } from '../components/Mascot.tsx';
import { sounds } from '../sounds.ts';
import { bigCelebration, burst } from '../celebrate.ts';
import { useCrazyFx } from '../components/CrazyFx.tsx';

export function Results() {
  const result = useLocation().state as QuizResult | null;
  const [shownStars, setShownStars] = useState(0);
  const crazy = useCrazyFx();
  const [review, setReview] = useState<ReviewQ[] | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (!result) return;
    const great = result.score / result.total >= 0.7;
    if (great && crazy.enabled) {
      crazy.fire('win');
    } else if (great) {
      sounds.fanfare();
      bigCelebration();
    } else {
      burst();
    }
    if (result.newBadges.length) setTimeout(sounds.badge, 1200);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setShownStars(Math.min(n, result.stars));
      if (n >= result.stars) clearInterval(t);
    }, 60);
    return () => clearInterval(t);
  }, [result]); // once per result, not again when Crazy Mode loads

  if (!result) return <Navigate to="/" replace />;
  const pct = Math.round((result.score / result.total) * 100);
  const msg =
    pct === 100 ? 'PERFECT! You are a math superstar!' : pct >= 80 ? 'Amazing work! You really know this stuff.' : pct >= 60 ? 'Nice job! Every quiz makes you stronger.' : 'Great effort! Practice is how brains grow. 🌱';

  return (
    <main className="page kid results">
      <section className="card result-card">
        <div className="score-ring" style={{ ['--pct' as string]: pct }}>
          <span className="score-big">{result.score}<small>/{result.total}</small></span>
        </div>
        <p className="result-sub">right on the first try</p>
        <div className="result-stats">
          <div className="result-stat"><span className="big">⭐ +{shownStars}</span><small>{result.totalStars} total</small></div>
          <div className="result-stat"><span className="big">🔥 {result.streak}</span><small>day streak</small></div>
        </div>
      </section>

      <MascotSays mood="cheer">{msg}</MascotSays>
      {crazy.overlay}

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
        <Link to="/quiz" className="btn btn-big btn-primary">Another quiz!</Link>
      </div>
    </main>
  );
}
