import { tx, kvGet, type DB } from './db.ts';
import { getKid, saveRewards, type Kid } from './kids.ts';
import { GRADE_SETS, gradeEntries, gradeEntryLabel } from './seed.ts';
import { buildQuestion, GENERATORS, toPublic } from '../shared/registry.ts';
import { grade } from '../shared/grade.ts';
import { randomSeed } from '../shared/rng.ts';
import { starsFor, type Season } from '../shared/rewards.ts';
import { awardBadges, badgesOf, isHoliday, storeBadges } from './badges.ts';

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
  seasons: Season[]; // seasonal Star Store sets that are switched on
  challenges: boolean; // next-grade challenge questions (automatic at 90% mastery, or by choosing challenge mode)
}

export const DEFAULT_SETTINGS: Settings = { quizLength: 10, allowRetry: true, seasons: [], challenges: true };

export const getSettings = (db: DB): Settings => ({ ...DEFAULT_SETTINGS, ...kvGet<Partial<Settings>>(db, 'settings', {}) });

const requireKid = (db: DB, kidId: number) => {
  const kid = getKid(db, kidId);
  if (!kid) throw new HttpError(401, 'Pick who is practicing first');
  return kid;
};

// ---- mastery and next-grade challenges ------------------------------------

/** A bank entry is mastered once at least 8 of its last 10 answers were right on the first try. */
export function mastery(db: DB, kidId: number) {
  const rows = db
    .prepare(
      `SELECT b.id, COUNT(r.correct_first) AS n, COALESCE(SUM(r.correct_first), 0) AS right
       FROM bank_entries b
       LEFT JOIN quiz_questions r ON r.id IN (
         SELECT q.id FROM quiz_questions q WHERE q.bank_entry_id = b.id AND q.correct_first IS NOT NULL
         ORDER BY q.answered_at DESC, q.id DESC LIMIT 10)
       WHERE b.kid_id = ? AND b.enabled = 1 AND b.weight > 0
       GROUP BY b.id`,
    )
    .all(kidId);
  const mastered = rows.filter((r) => Number(r.n) >= 10 && Number(r.right) >= 8).length;
  return { mastered, total: rows.length, pct: rows.length ? Math.round((mastered / rows.length) * 100) : 0 };
}

export const MASTERY_GOAL = 90;

/** Whether the next grade's questions are on offer, and whether they're mixed in automatically. */
export function challengeInfo(db: DB, kid: Kid) {
  const next = kid.grade ? GRADE_SETS[kid.grade + 1] : undefined;
  const m = mastery(db, kid.id);
  const available = getSettings(db).challenges && !!next;
  return { available, nextGrade: next?.label ?? null, mastery: m, auto: available && m.total > 0 && m.pct >= MASTERY_GOAL };
}

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

export function createQuiz(db: DB, kidId: number, opts: { challenge?: boolean } = {}) {
  const settings = getSettings(db);
  const kid = requireKid(db, kidId);
  const info = challengeInfo(db, kid);
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
  // Next-grade challenges: about 1 in 5 once she's mastered her bank, plus 2 more if she picked challenge mode.
  const auto = info.auto ? Math.max(1, Math.round(settings.quizLength * 0.2)) : 0;
  const chosen = opts.challenge && info.available ? 2 : 0;
  const ids = pickEntries(
    entries.map((e) => ({ id: e.id as number, weight: e.weight as number, missRate: e.miss_rate as number | null })),
    settings.quizLength - auto,
  );
  type Slot = { generator: string; paramsJson: string; entryId: number | null };
  const slots: Slot[] = ids.map((id) => ({ generator: byId.get(id)!.generator as string, paramsJson: byId.get(id)!.params_json as string, entryId: id }));
  if (auto + chosen > 0) {
    const next = gradeEntries(kid.grade! + 1).filter((e) => GENERATORS[e.generator]);
    const picks = pickEntries(next.map((e, i) => ({ id: i, weight: e.weight, missRate: null })), auto + chosen);
    for (const i of picks) {
      const slot = { generator: next[i].generator, paramsJson: JSON.stringify(next[i].params), entryId: null };
      slots.splice(Math.floor(Math.random() * (slots.length + 1)), 0, slot);
    }
  }

  return tx(db, () => {
    const quizId = Number(db.prepare('INSERT INTO quizzes (kid_id, total) VALUES (?, ?)').run(kidId, slots.length).lastInsertRowid);
    const insert = db.prepare(
      `INSERT INTO quiz_questions (quiz_id, position, bank_entry_id, generator, params_json, seed, answer_json, challenge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const questions = slots.map((s, position) => {
      const seed = randomSeed();
      const q = buildQuestion(s.generator, JSON.parse(s.paramsJson), seed);
      const challenge = s.entryId === null;
      const id = Number(insert.run(quizId, position, s.entryId, s.generator, s.paramsJson, seed, JSON.stringify(q.answer), challenge ? 1 : 0).lastInsertRowid);
      return { id, ...toPublic(q), ...(challenge ? { challenge: info.nextGrade } : {}) };
    });
    return { quizId, allowRetry: settings.allowRetry, challengeMode: chosen > 0, questions };
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
const dayString = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** Topic badges and the question types that count toward each. */
const TOPIC_BADGES: Record<string, string[]> = {
  plot_pro: ['plotPoint', 'readPoint'],
  order_master: ['orderNumbers', 'compareNumbers'],
  distance_whiz: ['distanceSameLine'],
  abs_ace: ['absoluteValue'],
  factor_finder: ['factorsMultiples', 'gcfLcm'],
  fraction_hero: ['fractionOps', 'decimalFractions', 'fractionCalc'],
  shape_shifter: ['areaPerimeter', 'volume', 'polygonArea'],
  number_ninja: ['multiplyWhole', 'divideWhole', 'placeValue'],
  decimal_dynamo: ['decimalOps'],
  ratio_ranger: ['ratios', 'percent'],
  equation_explorer: ['orderOfOps', 'equations'],
  data_detective: ['statistics'],
};

export function finishQuiz(db: DB, kidId: number, quizId: number, localDate: unknown, localHour?: unknown) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND kid_id = ?').get(quizId, kidId);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  const today = typeof localDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(localDate) && !Number.isNaN(dayNumber(localDate))
    ? localDate
    : new Date().toISOString().slice(0, 10);
  const hour = Number.isInteger(localHour) && (localHour as number) >= 0 && (localHour as number) <= 23 ? (localHour as number) : null;

  if (quiz.finished_at) {
    const r = requireKid(db, kidId);
    return { score: quiz.score, total: quiz.total, stars: quiz.stars_earned, newBadges: [], streak: r.streak, totalStars: r.stars };
  }

  return tx(db, () => {
    // Anything skipped counts as missed.
    db.prepare('UPDATE quiz_questions SET correct_first = COALESCE(correct_first, 0), correct_final = COALESCE(correct_final, 0) WHERE quiz_id = ?').run(quizId);
    const qs = db.prepare('SELECT correct_first, correct_final, time_ms, challenge FROM quiz_questions WHERE quiz_id = ?').all(quizId);
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

    const count = (sql: string, ...args: (string | number)[]) => Number(db.prepare(sql).get(...args)!.n);
    const finished = count('SELECT COUNT(*) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL', kidId);
    const perfect = score === qs.length && qs.length > 0;
    const perfects = count('SELECT COUNT(*) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL AND total > 0 AND score = total', kidId);
    const fixes = count(
      `SELECT COUNT(*) AS n FROM quiz_questions WHERE correct_first = 0 AND correct_final = 1
         AND quiz_id IN (SELECT id FROM quizzes WHERE kid_id = ?)`,
      kidId,
    );
    const quizzesOn = (day: string) => count('SELECT COUNT(*) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL AND local_date = ?', kidId, day);
    const daysThisMonth = count(
      'SELECT COUNT(DISTINCT local_date) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL AND local_date LIKE ?',
      kidId,
      `${today.slice(0, 7)}-%`,
    );

    // Speed: average time per question on a perfect quiz, against her earlier perfect quizzes.
    const avgMs = qs.reduce((s, q) => s + ((q.time_ms as number | null) ?? 0), 0) / (qs.length || 1);
    const bestBefore = db
      .prepare(
        `SELECT MIN(avg) AS best FROM (
           SELECT AVG(q.time_ms) AS avg FROM quizzes z JOIN quiz_questions q ON q.quiz_id = z.id
           WHERE z.kid_id = ? AND z.id != ? AND z.finished_at IS NOT NULL AND z.total > 0 AND z.score = z.total
           GROUP BY z.id)`,
      )
      .get(kidId, quizId)!.best as number | null;

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
    const topics = Object.fromEntries(Object.entries(TOPIC_BADGES).map(([code, gens]) => [code, runOf(gens)]));
    // All-Rounder: every topic in her bank, so long as there are at least three
    const inBank = new Set(db.prepare('SELECT DISTINCT generator FROM bank_entries WHERE kid_id = ? AND enabled = 1 AND weight > 0').all(kidId).map((r) => r.generator as string));
    const have = badgesOf(db, kidId);
    const myTopics = Object.keys(TOPIC_BADGES).filter((code) => TOPIC_BADGES[code].some((g) => inBank.has(g)));

    const earned: Record<string, boolean> = {
      first_quiz: finished >= 1,
      quiz_10: finished >= 10,
      quiz_25: finished >= 25,
      quiz_50: finished >= 50,
      quiz_100: finished >= 100,
      quiz_250: finished >= 250,
      perfect,
      perfect_5: perfects >= 5,
      perfect_25: perfects >= 25,
      streak_3: r.streak >= 3,
      streak_7: r.streak >= 7,
      streak_14: r.streak >= 14,
      streak_30: r.streak >= 30,
      streak_60: r.streak >= 60,
      streak_100: r.streak >= 100,
      stars_50: r.starsEarned >= 50,
      stars_200: r.starsEarned >= 200,
      stars_500: r.starsEarned >= 500,
      stars_1000: r.starsEarned >= 1000,
      stars_2500: r.starsEarned >= 2500,
      ...topics,
      grade_jumper: qs.some((q) => q.challenge === 1 && q.correct_first === 1),
      all_rounder: myTopics.length >= 3 && myTopics.every((code) => have.has(code) || topics[code]),
      comeback: comebacks >= 5,
      never_give_up: fixes >= 50,
      early_bird: hour !== null && hour >= 4 && hour < 8,
      night_owl: hour !== null && (hour >= 20 || hour < 4),
      weekend_warrior: new Date(`${today}T00:00:00Z`).getUTCDay() === 0 && quizzesOn(dayString(dayNumber(today) - 1)) > 0,
      double_dip: quizzesOn(today) >= 3,
      monthly_regular: daysThisMonth >= 20,
      lightning: perfect && avgMs > 0 && avgMs < 20_000,
      personal_best: perfect && avgMs > 0 && bestBefore !== null && avgMs < bestBefore,
      ...storeBadges(db, kidId, r.stars),
      holiday_spirit: isHoliday(today),
    };
    const newBadges = awardBadges(db, kidId, earned);

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
    label: r.challenge
      ? `🚀 Challenge · ${gradeEntryLabel(r.generator as string, r.params_json as string) ?? GENERATORS[r.generator as string]?.name ?? r.generator}`
      : (r.label ?? GENERATORS[r.generator as string]?.name ?? r.generator),
    question: buildQuestion(r.generator as string, JSON.parse(r.params_json as string), r.seed as number),
    first: r.first_answer_json ? JSON.parse(r.first_answer_json as string) : null,
    retry: r.retry_answer_json ? JSON.parse(r.retry_answer_json as string) : null,
    correctFirst: r.correct_first,
    correctFinal: r.correct_final,
    timeMs: r.time_ms,
  }));
}
