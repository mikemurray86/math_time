import { tx, kvGet, type DB } from './db.ts';
import { getKid, saveRewards } from './kids.ts';
import { buildQuestion, GENERATORS, toPublic } from '../shared/registry.ts';
import { grade } from '../shared/grade.ts';
import { randomSeed } from '../shared/rng.ts';
import { BADGES, starsFor } from '../shared/rewards.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Settings {
  quizLength: number;
  allowRetry: boolean;
}

export const DEFAULT_SETTINGS: Settings = { quizLength: 10, allowRetry: true };

export const getSettings = (db: DB): Settings => ({ ...DEFAULT_SETTINGS, ...kvGet<Partial<Settings>>(db, 'settings', {}) });

const requireKid = (db: DB, kidId: number) => {
  const kid = getKid(db, kidId);
  if (!kid) throw new HttpError(401, 'Pick who is practicing first');
  return kid;
};

// ---- building a quiz ----------------------------------------------------

interface WeightedEntry {
  id: number;
  weight: number;
  missRate: number | null; // first-try miss rate over the last 10 answers
}

/**
 * Weighted pick: the parent's weight, scaled up for entries she's been
 * missing (×2 at 100% misses) and down for ones she's mastered (×0.5).
 */
export function pickEntries(entries: WeightedEntry[], n: number, random = Math.random): number[] {
  const eff = entries.map((e) => ({ id: e.id, w: Math.max(0, e.weight) * (0.5 + 1.5 * (e.missRate ?? 0.5)) }));
  const picks: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = picks[picks.length - 1];
    let pool = eff.filter((e) => e.w > 0 && (eff.length === 1 || e.id !== prev));
    if (!pool.length) pool = eff;
    const total = pool.reduce((s, e) => s + e.w, 0);
    let r = random() * total;
    const hit = pool.find((e) => (r -= e.w) < 0) ?? pool[pool.length - 1];
    picks.push(hit.id);
  }
  return picks;
}

export function createQuiz(db: DB, kidId: number) {
  const settings = getSettings(db);
  const entries = db
    .prepare(
      `SELECT b.id, b.generator, b.params_json, b.weight,
              (SELECT AVG(1 - correct_first) FROM (
                 SELECT correct_first FROM quiz_questions q
                 WHERE q.bank_entry_id = b.id AND q.correct_first IS NOT NULL
                 ORDER BY q.answered_at DESC LIMIT 10)) AS miss_rate
       FROM bank_entries b WHERE b.kid_id = ? AND b.enabled = 1 AND b.weight > 0`,
    )
    .all(kidId)
    .filter((r) => GENERATORS[r.generator as string]);
  if (!entries.length) throw new HttpError(409, 'Your question bank is empty. Ask a grown-up to turn on some questions!');

  const byId = new Map(entries.map((e) => [e.id as number, e]));
  const ids = pickEntries(
    entries.map((e) => ({ id: e.id as number, weight: e.weight as number, missRate: e.miss_rate as number | null })),
    settings.quizLength,
  );

  return tx(db, () => {
    const quizId = Number(db.prepare('INSERT INTO quizzes (kid_id, total) VALUES (?, ?)').run(kidId, ids.length).lastInsertRowid);
    const insert = db.prepare(
      `INSERT INTO quiz_questions (quiz_id, position, bank_entry_id, generator, params_json, seed, answer_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const questions = ids.map((entryId, position) => {
      const e = byId.get(entryId)!;
      const seed = randomSeed();
      const q = buildQuestion(e.generator as string, JSON.parse(e.params_json as string), seed);
      const id = Number(insert.run(quizId, position, entryId, e.generator as string, e.params_json as string, seed, JSON.stringify(q.answer)).lastInsertRowid);
      return { id, ...toPublic(q) };
    });
    return { quizId, allowRetry: settings.allowRetry, questions };
  });
}

// ---- answering ----------------------------------------------------------

export function answerQuestion(db: DB, kidId: number, quizId: number, questionId: number, response: unknown, timeMs: unknown) {
  const row = db
    .prepare(
      `SELECT q.*, z.finished_at FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id
       WHERE q.id = ? AND q.quiz_id = ? AND z.kid_id = ?`,
    )
    .get(questionId, quizId, kidId);
  if (!row) throw new HttpError(404, 'Question not found');
  if (row.finished_at) throw new HttpError(409, 'This quiz is already finished');
  if (row.correct_final !== null) throw new HttpError(409, 'Already answered');

  const q = buildQuestion(row.generator as string, JSON.parse(row.params_json as string), row.seed as number);
  const correct = grade(q.answer, response);
  const ms = Math.min(Math.max(0, Math.round(Number(timeMs) || 0)), 60 * 60 * 1000);
  const firstTry = row.first_answer_json === null;
  const final = correct || !firstTry || !getSettings(db).allowRetry;
  const json = JSON.stringify(response ?? null).slice(0, 2000);

  if (firstTry) {
    db.prepare(
      `UPDATE quiz_questions SET first_answer_json = ?, correct_first = ?, correct_final = ?, time_ms = ?, answered_at = datetime('now') WHERE id = ?`,
    ).run(json, correct ? 1 : 0, final ? (correct ? 1 : 0) : null, ms, questionId);
  } else {
    db.prepare(
      `UPDATE quiz_questions SET retry_answer_json = ?, correct_final = ?, time_ms = COALESCE(time_ms, 0) + ?, answered_at = datetime('now') WHERE id = ?`,
    ).run(json, correct ? 1 : 0, ms, questionId);
  }

  const correctFirst = firstTry ? correct : row.correct_first === 1;
  return {
    correct,
    final,
    stars: final ? starsFor(correctFirst, correct) : 0,
    hint: final ? undefined : q.hint,
    explanation: final && !correct ? q.explanation : undefined,
    answerText: final && !correct ? q.answerText : undefined,
    answer: final && !correct ? q.answer : undefined,
  };
}

// ---- finishing, streaks and badges -------------------------------------

const dayNumber = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

export function finishQuiz(db: DB, kidId: number, quizId: number, localDate: unknown) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND kid_id = ?').get(quizId, kidId);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  const today = typeof localDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(localDate) && !Number.isNaN(dayNumber(localDate))
    ? localDate
    : new Date().toISOString().slice(0, 10);

  if (quiz.finished_at) {
    const r = requireKid(db, kidId);
    return { score: quiz.score, total: quiz.total, stars: quiz.stars_earned, newBadges: [], streak: r.streak, totalStars: r.stars };
  }

  return tx(db, () => {
    // Anything skipped counts as missed.
    db.prepare('UPDATE quiz_questions SET correct_first = COALESCE(correct_first, 0), correct_final = COALESCE(correct_final, 0) WHERE quiz_id = ?').run(quizId);
    const qs = db.prepare('SELECT correct_first, correct_final FROM quiz_questions WHERE quiz_id = ?').all(quizId);
    const score = qs.filter((q) => q.correct_first === 1).length;
    const stars = qs.reduce((s, q) => s + starsFor(q.correct_first === 1, q.correct_final === 1), 0);
    const comebacks = qs.filter((q) => q.correct_first === 0 && q.correct_final === 1).length;
    db.prepare(`UPDATE quizzes SET finished_at = datetime('now'), local_date = ?, score = ?, stars_earned = ? WHERE id = ?`).run(today, score, stars, quizId);

    const r = requireKid(db, kidId);
    if (r.lastDate !== today) {
      r.streak = r.lastDate && dayNumber(today) - dayNumber(r.lastDate) === 1 ? r.streak + 1 : 1;
      r.lastDate = today;
    }
    r.bestStreak = Math.max(r.bestStreak, r.streak);
    r.stars += stars;
    r.starsEarned += stars;
    saveRewards(db, r);

    const finished = Number(db.prepare('SELECT COUNT(*) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL').get(kidId)!.n);
    const runOf = (gens: string[]) => {
      const rows = db
        .prepare(
          `SELECT correct_first FROM quiz_questions
           WHERE quiz_id IN (SELECT id FROM quizzes WHERE kid_id = ?)
             AND generator IN (${gens.map(() => '?').join(',')}) AND answered_at IS NOT NULL
           ORDER BY answered_at DESC, id DESC LIMIT 10`,
        )
        .all(kidId, ...gens);
      return rows.length === 10 && rows.every((x) => x.correct_first === 1);
    };
    const earned: Record<string, boolean> = {
      first_quiz: finished >= 1,
      quiz_10: finished >= 10,
      quiz_25: finished >= 25,
      perfect: score === qs.length && qs.length > 0,
      streak_3: r.streak >= 3,
      streak_7: r.streak >= 7,
      streak_14: r.streak >= 14,
      stars_50: r.starsEarned >= 50,
      stars_200: r.starsEarned >= 200,
      plot_pro: runOf(['plotPoint', 'readPoint']),
      order_master: runOf(['orderNumbers', 'compareNumbers']),
      distance_whiz: runOf(['distanceSameLine']),
      comeback: comebacks >= 5,
    };
    const have = new Set(db.prepare('SELECT code FROM kid_badges WHERE kid_id = ?').all(kidId).map((b) => b.code as string));
    const insert = db.prepare('INSERT INTO kid_badges (kid_id, code) VALUES (?, ?)');
    const newBadges = BADGES.filter((b) => earned[b.code] && !have.has(b.code)).map((b) => {
      insert.run(kidId, b.code);
      return b.code;
    });

    return { score, total: qs.length, stars, newBadges, streak: r.streak, totalStars: r.stars };
  });
}

// ---- review ---------------------------------------------------------------

/** Every question of a quiz, rebuilt from its seed, with the child's answers. */
export function quizReview(db: DB, quizId: number) {
  const rows = db
    .prepare(
      `SELECT q.*, b.label FROM quiz_questions q LEFT JOIN bank_entries b ON b.id = q.bank_entry_id
       WHERE q.quiz_id = ? ORDER BY q.position`,
    )
    .all(quizId);
  return rows.map((r) => ({
    id: r.id,
    label: r.label ?? GENERATORS[r.generator as string]?.name ?? r.generator,
    question: buildQuestion(r.generator as string, JSON.parse(r.params_json as string), r.seed as number),
    first: r.first_answer_json ? JSON.parse(r.first_answer_json as string) : null,
    retry: r.retry_answer_json ? JSON.parse(r.retry_answer_json as string) : null,
    correctFirst: r.correct_first,
    correctFinal: r.correct_final,
    timeMs: r.time_ms,
  }));
}
