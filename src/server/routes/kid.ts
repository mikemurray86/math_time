import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DB } from '../db.ts';
import type { Auth } from '../auth.ts';
import { buyItem, checkCode, getKid, listKids, ownedItems, owns, saveAvatar } from '../kids.ts';
import { answerQuestion, createQuiz, finishQuiz, getSettings, HttpError, quizReview } from '../quiz.ts';
import { AVATAR_ITEMS, type Avatar, type Slot } from '../../shared/rewards.ts';

export function kidRoutes(app: FastifyInstance, db: DB, auth: Auth) {
  const currentKid = (req: FastifyRequest) => {
    const id = auth.kidId(req);
    const kid = id ? getKid(db, id) : null;
    if (!kid) throw new HttpError(401, 'Pick who is practicing first');
    return kid;
  };

  // The "Who's practicing?" picker: names and avatars only.
  app.get('/api/kids', async () => listKids(db).map(({ id, name, avatar, codeLength }) => ({ id, name, avatar, codeLength })));

  app.post<{ Body: { kidId?: number; code?: unknown } }>('/api/kid/login', async (req, reply) => {
    const kidId = Number(req.body?.kidId);
    if (!getKid(db, kidId)) throw new HttpError(404, 'Unknown player');
    const err = auth.kidLogin(req, reply, kidId, () => checkCode(db, kidId, req.body?.code));
    if (err) throw new HttpError(401, err);
    return { ok: true };
  });

  app.post('/api/kid/logout', async (_req, reply) => {
    auth.kidLogout(reply);
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const kid = currentKid(req);
    return {
      id: kid.id,
      name: kid.name,
      stars: kid.stars,
      starsEarned: kid.starsEarned,
      owned: ownedItems(db, kid.id),
      streak: kid.streak,
      bestStreak: kid.bestStreak,
      lastDate: kid.lastDate,
      avatar: kid.avatar,
      seasons: getSettings(db).seasons,
      badges: db.prepare('SELECT code, earned_at FROM kid_badges WHERE kid_id = ? ORDER BY earned_at').all(kid.id),
    };
  });

  app.put<{ Body: Partial<Avatar> }>('/api/avatar', async (req) => {
    const kid = currentKid(req);
    const next = { ...kid.avatar };
    for (const [slot, id] of Object.entries(req.body ?? {})) {
      const item = AVATAR_ITEMS.find((i) => i.id === id && i.slot === slot);
      if (!item) throw new HttpError(400, 'Unknown item');
      if (!owns(db, kid.id, item)) throw new HttpError(403, 'Buy this in the Star Store first');
      next[slot as Slot] = item.id;
    }
    saveAvatar(db, kid.id, next);
    return next;
  });

  // Spend stars on an item, then wear it right away.
  app.post<{ Body: { itemId?: string } }>('/api/shop/buy', async (req) => {
    const kid = currentKid(req);
    const item = AVATAR_ITEMS.find((i) => i.id === req.body?.itemId);
    if (!item) throw new HttpError(400, 'Unknown item');
    if (item.season && !getSettings(db).seasons.includes(item.season)) throw new HttpError(409, 'That one isn’t in the Star Store right now');
    const err = buyItem(db, kid, item);
    if (err) throw new HttpError(409, err);
    const avatar = { ...kid.avatar, [item.slot]: item.id };
    saveAvatar(db, kid.id, avatar);
    return { stars: getKid(db, kid.id)!.stars, avatar, owned: ownedItems(db, kid.id) };
  });

  app.post('/api/quiz', async (req) => createQuiz(db, currentKid(req).id));

  app.post<{ Params: { id: string }; Body: { questionId: number; response: unknown; timeMs: number } }>('/api/quiz/:id/answer', async (req) =>
    answerQuestion(db, currentKid(req).id, Number(req.params.id), Number(req.body?.questionId), req.body?.response, req.body?.timeMs),
  );

  app.post<{ Params: { id: string }; Body: { localDate?: string } }>('/api/quiz/:id/finish', async (req) => ({
    quizId: Number(req.params.id),
    ...finishQuiz(db, currentKid(req).id, Number(req.params.id), req.body?.localDate),
  }));

  // Answers and explanations, but only for the child's own quiz once it's finished.
  app.get<{ Params: { id: string } }>('/api/quiz/:id/review', async (req) => {
    const quiz = db.prepare('SELECT id, finished_at FROM quizzes WHERE id = ? AND kid_id = ?').get(Number(req.params.id), currentKid(req).id);
    if (!quiz) throw new HttpError(404, 'Quiz not found');
    if (!quiz.finished_at) throw new HttpError(409, 'Finish the quiz first!');
    return { questions: quizReview(db, quiz.id as number) };
  });
}
