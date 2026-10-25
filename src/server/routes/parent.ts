import type { FastifyInstance } from 'fastify';
import { kvSet, type DB } from '../db.ts';
import type { Auth } from '../auth.ts';
import { createKid, getKid, listKids, setCode, validGrade } from '../kids.ts';
import { DEFAULT_GRADE, gradeSetList, seedBank } from '../seed.ts';
import { DEFAULT_SETTINGS, getSettings, HttpError, quizReview, type Settings } from '../quiz.ts';
import { GENERATORS, buildQuestion, generatorCatalog, sanitizeParams } from '../../shared/registry.ts';
import { randomSeed } from '../../shared/rng.ts';
import { isValidCode } from '../../shared/pictures.ts';

interface BankBody {
  kidId?: number;
  generator: string;
  params: unknown;
  label: string;
  note?: string;
  weight?: number;
  enabled?: boolean;
}

interface KidBody {
  name?: string;
  code?: number[] | null; // null clears the picture code
  grade?: number;
  copyBankFrom?: number;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clampWeight = (v: unknown) => Math.min(5, Math.max(0, Math.round(Number(v ?? 2)) || 0));

function validEntry(body: BankBody) {
  const gen = GENERATORS[body?.generator];
  if (!gen) throw new HttpError(400, 'Unknown problem type');
  const label = str(body.label, 120) || gen.name;
  return { gen, params: sanitizeParams(gen, body.params), label, note: str(body.note, 500), weight: clampWeight(body.weight) };
}

function validCode(code: unknown): number[] | null {
  if (code === null || code === undefined) return null;
  if (!isValidCode(code)) throw new HttpError(400, 'A picture code is 3 to 6 pictures');
  return code;
}

export function parentRoutes(app: FastifyInstance, db: DB, auth: Auth) {
  app.post<{ Body: { pin?: string } }>('/api/parent/login', async (req, reply) => {
    const err = auth.login(req, reply, req.body?.pin);
    if (err) throw new HttpError(401, err);
    return { ok: true };
  });

  app.post('/api/parent/logout', async (_req, reply) => {
    auth.logout(reply);
    return { ok: true };
  });

  app.get('/api/parent/session', async (req) => ({ parent: auth.isParent(req) }));

  // Everything below needs the parent cookie.
  app.register(async (p) => {
    p.addHook('onRequest', async (req) => {
      if (!auth.isParent(req)) throw new HttpError(401, 'Parent login required');
    });

    const kidParam = (raw: unknown) => {
      const kid = getKid(db, Number(raw));
      if (!kid) throw new HttpError(404, 'Unknown child');
      return kid;
    };

    // ---- children ----

    p.get('/api/parent/kids', async () =>
      listKids(db).map((k) => ({
        ...k,
        quizzes: Number(db.prepare('SELECT COUNT(*) AS n FROM quizzes WHERE kid_id = ? AND finished_at IS NOT NULL').get(k.id)!.n),
        lastQuiz: db.prepare('SELECT MAX(finished_at) AS t FROM quizzes WHERE kid_id = ?').get(k.id)!.t,
      })),
    );

    p.post<{ Body: KidBody }>('/api/parent/kids', async (req) => {
      const name = str(req.body?.name, 40);
      if (!name) throw new HttpError(400, 'Name is required');
      const copyFrom = req.body?.copyBankFrom ? kidParam(req.body.copyBankFrom).id : undefined;
      const grade = req.body?.grade === undefined ? DEFAULT_GRADE : validGrade(req.body.grade);
      if (!grade) throw new HttpError(400, 'Unknown grade');
      return { id: createKid(db, name, validCode(req.body?.code), grade, copyFrom) };
    });

    p.put<{ Params: { id: string }; Body: KidBody }>('/api/parent/kids/:id', async (req) => {
      const kid = kidParam(req.params.id);
      if (req.body?.name !== undefined) {
        const name = str(req.body.name, 40);
        if (!name) throw new HttpError(400, 'Name is required');
        db.prepare('UPDATE kids SET name = ? WHERE id = ?').run(name, kid.id);
      }
      if (req.body?.code !== undefined) setCode(db, kid.id, validCode(req.body.code));
      if (req.body?.grade !== undefined) {
        const grade = validGrade(req.body.grade);
        if (!grade) throw new HttpError(400, 'Unknown grade');
        db.prepare('UPDATE kids SET grade = ? WHERE id = ?').run(grade, kid.id); // the bank stays as it is
      }
      return getKid(db, kid.id);
    });

    // Hand out (or take back) stars; they never go below zero.
    p.post<{ Params: { id: string }; Body: { delta?: number } }>('/api/parent/kids/:id/stars', async (req) => {
      const kid = kidParam(req.params.id);
      const delta = Math.round(Number(req.body?.delta));
      if (!Number.isFinite(delta) || Math.abs(delta) > 10000) throw new HttpError(400, 'Pick a number of stars between -10000 and 10000');
      db.prepare('UPDATE kids SET stars = MAX(0, stars + ?) WHERE id = ?').run(delta, kid.id);
      return getKid(db, kid.id);
    });

    p.delete<{ Params: { id: string } }>('/api/parent/kids/:id', async (req) => {
      db.prepare('DELETE FROM kids WHERE id = ?').run(kidParam(req.params.id).id);
      return { ok: true };
    });

    // ---- progress ----

    p.get<{ Querystring: { kid?: string } }>('/api/parent/dashboard', async (req) => {
      const kid = kidParam(req.query.kid);
      const quizzes = db
        .prepare(
          `SELECT z.id, z.started_at, z.finished_at, z.local_date, z.score, z.total, z.stars_earned,
                  (SELECT SUM(time_ms) FROM quiz_questions q WHERE q.quiz_id = z.id) AS time_ms
           FROM quizzes z WHERE z.kid_id = ? AND z.finished_at IS NOT NULL ORDER BY z.finished_at DESC LIMIT 100`,
        )
        .all(kid.id);
      const entryStats = db
        .prepare(
          `SELECT b.id, b.label, b.generator, b.enabled,
                  COUNT(q.id) AS attempts,
                  SUM(q.correct_first) AS first_right,
                  SUM(q.correct_final) AS final_right,
                  AVG(q.time_ms) AS avg_ms
           FROM bank_entries b
           LEFT JOIN quiz_questions q ON q.bank_entry_id = b.id AND q.answered_at >= datetime('now', '-30 days') AND q.correct_first IS NOT NULL
           WHERE b.kid_id = ?
           GROUP BY b.id ORDER BY b.id`,
        )
        .all(kid.id)
        .map((r) => ({ ...r, skill: GENERATORS[r.generator as string]?.skill ?? r.generator }));
      return {
        kid,
        quizzes,
        entryStats,
        badges: db.prepare('SELECT code, earned_at FROM kid_badges WHERE kid_id = ? ORDER BY earned_at DESC').all(kid.id),
      };
    });

    p.get<{ Params: { id: string } }>('/api/parent/quiz/:id', async (req) => {
      const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(Number(req.params.id));
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      const questions = quizReview(db, quiz.id as number);
      return { quiz, kid: getKid(db, quiz.kid_id as number), questions };
    });

    // ---- question banks ----

    p.get('/api/parent/generators', async () => generatorCatalog());

    p.get('/api/parent/grade-sets', async () => gradeSetList());

    // Append a whole grade's question set to a child's bank.
    p.post<{ Body: { kidId?: number; grade?: number } }>('/api/parent/bank/grade-set', async (req) => {
      const kid = kidParam(req.body?.kidId);
      const grade = validGrade(req.body?.grade);
      if (!grade) throw new HttpError(400, 'Unknown grade');
      seedBank(db, kid.id, grade);
      return { ok: true };
    });

    p.post<{ Body: { generator: string; params: unknown } }>('/api/parent/preview', async (req) => {
      const gen = GENERATORS[req.body?.generator];
      if (!gen) throw new HttpError(400, 'Unknown problem type');
      const params = sanitizeParams(gen, req.body.params);
      return { params, samples: [0, 1, 2].map(() => buildQuestion(gen.id, params, randomSeed())) };
    });

    p.get<{ Querystring: { kid?: string } }>('/api/parent/bank', async (req) =>
      db
        .prepare('SELECT * FROM bank_entries WHERE kid_id = ? ORDER BY id')
        .all(kidParam(req.query.kid).id)
        .map((r) => ({ ...r, params: JSON.parse(r.params_json as string), enabled: r.enabled === 1 })),
    );

    p.post<{ Body: BankBody }>('/api/parent/bank', async (req) => {
      const kid = kidParam(req.body?.kidId);
      const e = validEntry(req.body);
      const res = db
        .prepare('INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(kid.id, e.gen.id, JSON.stringify(e.params), e.label, e.note, e.weight, req.body.enabled === false ? 0 : 1);
      return { id: Number(res.lastInsertRowid) };
    });

    p.put<{ Params: { id: string }; Body: BankBody }>('/api/parent/bank/:id', async (req) => {
      const e = validEntry(req.body);
      const res = db
        .prepare('UPDATE bank_entries SET generator = ?, params_json = ?, label = ?, note = ?, weight = ?, enabled = ? WHERE id = ?')
        .run(e.gen.id, JSON.stringify(e.params), e.label, e.note, e.weight, req.body.enabled === false ? 0 : 1, Number(req.params.id));
      if (!res.changes) throw new HttpError(404, 'Not found');
      return { ok: true };
    });

    p.post<{ Params: { id: string }; Body: { kidId?: number } }>('/api/parent/bank/:id/copy', async (req) => {
      const kid = kidParam(req.body?.kidId);
      const res = db
        .prepare(
          `INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight, enabled)
           SELECT ?, generator, params_json, label, note, weight, enabled FROM bank_entries WHERE id = ?`,
        )
        .run(kid.id, Number(req.params.id));
      if (!res.changes) throw new HttpError(404, 'Not found');
      return { id: Number(res.lastInsertRowid) };
    });

    p.delete<{ Params: { id: string } }>('/api/parent/bank/:id', async (req) => {
      db.prepare('DELETE FROM bank_entries WHERE id = ?').run(Number(req.params.id));
      return { ok: true };
    });

    // ---- settings (shared by all children) ----

    p.get('/api/parent/settings', async () => getSettings(db));

    p.put<{ Body: Partial<Settings> }>('/api/parent/settings', async (req) => {
      const b = req.body ?? {};
      const next: Settings = {
        quizLength: Math.min(30, Math.max(3, Math.round(Number(b.quizLength ?? DEFAULT_SETTINGS.quizLength)) || DEFAULT_SETTINGS.quizLength)),
        allowRetry: b.allowRetry === undefined ? getSettings(db).allowRetry : !!b.allowRetry,
      };
      kvSet(db, 'settings', next);
      return next;
    });
  });
}
