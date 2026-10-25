import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type DB } from '../src/server/db.ts';
import { buildApp } from '../src/server/app.ts';
import { createKid } from '../src/server/kids.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pickEntries } from '../src/server/quiz.ts';
import type { Answer } from '../src/shared/types.ts';
import { Fraction } from '../src/shared/fraction.ts';
import { richText } from '../src/shared/expr.ts';

let db: DB;
let app: Awaited<ReturnType<typeof buildApp>>;
let kidId: number;
let kidCookie: string;

const cookieOf = (res: { cookies: { name: string; value: string }[] }) => res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

beforeEach(async () => {
  db = openDb(':memory:');
  app = await buildApp({ db, pin: '4321', sessionSecret: 'x'.repeat(32) });
  kidId = createKid(db, 'Shannon', null, 6);
  kidCookie = cookieOf(await app.inject({ method: 'POST', url: '/api/kid/login', payload: { kidId } }));
});

// Kid requests carry the kid cookie unless another cookie is given.
const post = (url: string, payload?: object, cookie = kidCookie) =>
  app.inject({ method: 'POST', url, payload: payload ?? {}, headers: { cookie } });

const answerFor = (id: number) => JSON.parse(db.prepare('SELECT answer_json FROM quiz_questions WHERE id = ?').get(id)!.answer_json as string) as Answer;

const rightResponse = (a: Answer) => {
  if (a.kind === 'order') return { ids: a.ids };
  if (a.kind === 'choice') return { id: a.id };
  if (a.kind === 'number') return { value: a.form === 'decimal' ? String(Fraction.parse(a.value)!.toNumber()) : a.value };
  if (a.kind === 'multi') return { values: a.values };
  return { x: a.x, y: a.y };
};

const login = async () => {
  const res = await post('/api/parent/login', { pin: '4321' }, '');
  expect(res.statusCode).toBe(200);
  return cookieOf(res);
};

describe('kid flow', () => {
  it('runs a quiz end to end with stars, retries, streak and badges', async () => {
    const quiz = (await post('/api/quiz')).json();
    expect(quiz.questions).toHaveLength(10);
    // answers never leave the server
    expect(JSON.stringify(quiz)).not.toMatch(/"answer"|explanation|hint/);

    const [q1, q2, q3, ...rest] = quiz.questions;
    let r = (await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q1.id, response: rightResponse(answerFor(q1.id)), timeMs: 5000 })).json();
    expect(r).toMatchObject({ correct: true, final: true, stars: 2 });

    // wrong then right on retry → 1 star
    r = (await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q2.id, response: { value: 'nope', ids: [], id: 'x', x: '99', y: '99' } })).json();
    expect(r.correct).toBe(false);
    expect(r.final).toBe(false);
    expect(r.hint.length).toBeGreaterThan(0);
    r = (await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q2.id, response: rightResponse(answerFor(q2.id)) })).json();
    expect(r).toMatchObject({ correct: true, final: true, stars: 1 });

    // wrong twice → explanation and answer revealed
    await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q3.id, response: {} });
    r = (await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q3.id, response: {} })).json();
    expect(r.final).toBe(true);
    expect(r.explanation.length).toBeGreaterThan(0);
    expect(r.answerText).toBeTruthy();
    expect((await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q3.id, response: {} })).statusCode).toBe(409);

    for (const q of rest) await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q.id, response: rightResponse(answerFor(q.id)) });

    const fin = (await post(`/api/quiz/${quiz.quizId}/finish`, { localDate: '2026-10-20' })).json();
    expect(fin).toMatchObject({ score: 8, total: 10, stars: 2 + 1 + 0 + 7 * 2, streak: 1 });
    expect(fin.newBadges).toContain('first_quiz');
    // finishing twice doesn't double count
    const again = (await post(`/api/quiz/${quiz.quizId}/finish`, { localDate: '2026-10-20' })).json();
    expect(again.totalStars).toBe(fin.totalStars);

    // next day continues the streak; skipped questions count as missed
    const q2b = (await post('/api/quiz')).json();
    const fin2 = (await post(`/api/quiz/${q2b.quizId}/finish`, { localDate: '2026-10-21' })).json();
    expect(fin2).toMatchObject({ score: 0, streak: 2 });
    // skipping a day resets it
    const q3b = (await post('/api/quiz')).json();
    expect((await post(`/api/quiz/${q3b.quizId}/finish`, { localDate: '2026-10-23' })).json().streak).toBe(1);

    const me = (await app.inject({ url: '/api/me', headers: { cookie: kidCookie } })).json();
    expect(me.stars).toBe(fin.totalStars);
  });

  it('lets her review her own quiz only after finishing it', async () => {
    const quiz = (await post('/api/quiz')).json();
    const review = (cookie = kidCookie) => app.inject({ url: `/api/quiz/${quiz.quizId}/review`, headers: { cookie } });
    expect((await review()).statusCode).toBe(409); // no peeking at answers mid-quiz
    const q = quiz.questions[0];
    await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q.id, response: rightResponse(answerFor(q.id)) });
    const fin = (await post(`/api/quiz/${quiz.quizId}/finish`, { localDate: '2026-10-24' })).json();
    expect(fin.quizId).toBe(quiz.quizId);
    const body = (await review()).json();
    expect(body.questions).toHaveLength(10);
    expect(body.questions[0]).toMatchObject({ correctFirst: 1, correctFinal: 1 });
    expect(body.questions[0].question.explanation.length).toBeGreaterThan(0);
    expect(body.questions[1]).toMatchObject({ first: null, correctFirst: 0 }); // skipped

    const cookie = await login();
    const leo = (await post('/api/parent/kids', { name: 'Leo' }, cookie)).json().id;
    const leoCookie = cookieOf(await post('/api/kid/login', { kidId: leo }, ''));
    expect((await review(leoCookie)).statusCode).toBe(404);
  });

  it('only lets her wear items she owns', async () => {
    const put = (payload: object) => app.inject({ method: 'PUT', url: '/api/avatar', payload, headers: { cookie: kidCookie } });
    expect((await put({ hat: 'hat-crown' })).statusCode).toBe(403);
    expect((await put({ color: 'color-mint' })).json().color).toBe('color-mint');
    expect((await put({ helperHat: 'hhat-crown' })).statusCode).toBe(403);
    expect((await put({ helperHat: 'hat-bow' })).statusCode).toBe(400); // avatar item in a helper slot
    expect((await put({ helper: 'helper-horse' })).json().helper).toBe('helper-horse'); // helpers are free
    expect((await put({ helper: 'helper-bear' })).json().helper).toBe('helper-bear');
    expect((await put({ helper: 'helper-dragon' })).statusCode).toBe(403); // the dragon and unicorn cost 750 stars
    expect((await put({ mode: 'mode-crazy' })).statusCode).toBe(403); // Crazy Mode costs 75 stars
  });

  it('spends stars to buy items, which are then owned for good', async () => {
    const put = (payload: object) => app.inject({ method: 'PUT', url: '/api/avatar', payload, headers: { cookie: kidCookie } });
    const buy = (itemId: string) => post('/api/shop/buy', { itemId });
    const me = () => app.inject({ url: '/api/me', headers: { cookie: kidCookie } }).then((r) => r.json());
    db.prepare('UPDATE kids SET stars = 30, stars_earned = 30 WHERE id = ?').run(kidId);

    expect((await buy('mode-crazy')).statusCode).toBe(409); // 75 stars, she has 30
    const bought = (await buy('hhat-party')).json(); // 8 stars
    expect(bought.stars).toBe(22);
    expect(bought.avatar.helperHat).toBe('hhat-party'); // worn right away
    expect(bought.owned).toContain('hhat-party');
    expect((await buy('hhat-party')).statusCode).toBe(409); // can't buy twice
    expect((await buy('hfur-arctic')).json().stars).toBe(7); // 15 stars

    // swapping owned items back and forth is free
    await put({ helperHat: 'hhat-none' });
    expect((await put({ helperHat: 'hhat-party' })).json().helperHat).toBe('hhat-party');
    const after = await me();
    expect(after).toMatchObject({ stars: 7, starsEarned: 30 }); // spending doesn't touch lifetime stars
    expect(after.owned).toEqual(expect.arrayContaining(['hhat-party', 'hfur-arctic', 'hhat-none', 'color-sky']));

    // other children don't share purchases
    const cookie = await login();
    const leo = (await post('/api/parent/kids', { name: 'Leo' }, cookie)).json().id;
    const leoCookie = cookieOf(await post('/api/kid/login', { kidId: leo }, ''));
    const leoMe = (await app.inject({ url: '/api/me', headers: { cookie: leoCookie } })).json();
    expect(leoMe.owned).not.toContain('hhat-party');
  });

  it('sells seasonal items only while their set is switched on', async () => {
    const buy = (itemId: string) => post('/api/shop/buy', { itemId });
    const me = () => app.inject({ url: '/api/me', headers: { cookie: kidCookie } }).then((r) => r.json());
    const setSeasons = (seasons: unknown) => app.inject({ method: 'PUT', url: '/api/parent/settings', headers: { cookie }, payload: { seasons } });
    const cookie = await login();
    db.prepare('UPDATE kids SET stars = 500 WHERE id = ?').run(kidId);

    expect((await me()).seasons).toEqual([]); // off by default
    expect((await buy('hat-witch')).statusCode).toBe(409);

    expect((await setSeasons(['halloween', 'bogus', 'halloween'])).json().seasons).toEqual(['halloween']);
    expect((await me()).seasons).toEqual(['halloween']);
    expect((await buy('hat-witch')).statusCode).toBe(200);
    expect((await buy('hat-acorn')).statusCode).toBe(409); // fall is still off

    // switching the set off keeps what she bought, and she can still wear it
    await setSeasons([]);
    await app.inject({ method: 'PUT', url: '/api/avatar', payload: { hat: 'hat-none' }, headers: { cookie: kidCookie } });
    const put = await app.inject({ method: 'PUT', url: '/api/avatar', payload: { hat: 'hat-witch' }, headers: { cookie: kidCookie } });
    expect(put.json().hat).toBe('hat-witch');
    expect((await me()).owned).toContain('hat-witch');
    expect((await buy('hhat-witch')).statusCode).toBe(409);

    // other settings saves leave the seasons alone
    await setSeasons(['fall']);
    await app.inject({ method: 'PUT', url: '/api/parent/settings', headers: { cookie }, payload: { quizLength: 5 } });
    expect((await me()).seasons).toEqual(['fall']);
  });

  it('explains an empty bank', async () => {
    db.exec('UPDATE bank_entries SET enabled = 0');
    const res = await post('/api/quiz');
    expect(res.statusCode).toBe(409);
  });
});

describe('parent area', () => {
  it('requires the PIN and rate limits guesses', async () => {
    expect((await app.inject('/api/parent/dashboard')).statusCode).toBe(401);
    for (let i = 0; i < 5; i++) expect((await post('/api/parent/login', { pin: '0000' }, '')).statusCode).toBe(401);
    const locked = await post('/api/parent/login', { pin: '4321' }, '');
    expect(locked.json().error).toMatch(/Too many/);
  });

  it('manages the bank and reviews quizzes', async () => {
    const cookie = await login();
    const get = (url: string) => app.inject({ url, headers: { cookie } });

    const gens = (await get('/api/parent/generators')).json();
    expect(gens.map((g: { id: string }) => g.id)).toContain('plotPoint');

    const preview = (await post('/api/parent/preview', { generator: 'plotPoint', params: { range: 999, coordType: 'quarter' } }, cookie)).json();
    expect(preview.params.range).toBe(5); // invalid select falls back to default
    expect(preview.samples).toHaveLength(3);

    const { id } = (await post('/api/parent/bank', { kidId, generator: 'distanceSameLine', params: { crossAxis: 'never' }, label: 'Test #4', note: 'Oct test', weight: 9 }, cookie)).json();
    const bank = (await get(`/api/parent/bank?kid=${kidId}`)).json();
    const added = bank.find((b: { id: number }) => b.id === id);
    expect(added).toMatchObject({ label: 'Test #4', weight: 5, enabled: true });
    expect(added.params.crossAxis).toBe('never');

    await app.inject({ method: 'PUT', url: '/api/parent/settings', headers: { cookie }, payload: { quizLength: 4 } });
    const quiz = (await post('/api/quiz')).json();
    expect(quiz.questions).toHaveLength(4);
    await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: quiz.questions[0].id, response: { value: '1' } });
    await post(`/api/quiz/${quiz.quizId}/finish`, {});

    const dash = (await get(`/api/parent/dashboard?kid=${kidId}`)).json();
    expect(dash.quizzes).toHaveLength(1);
    expect(dash.kid.name).toBe('Shannon');
    const review = (await get(`/api/parent/quiz/${quiz.quizId}`)).json();
    expect(review.kid.name).toBe('Shannon');
    expect(review.questions).toHaveLength(4);
    expect(review.questions[0].first).toEqual({ value: '1' });
    expect(review.questions[0].question.explanation.length).toBeGreaterThan(0);
  });
});

describe('custom templates', () => {
  it('saves a parent-written question, quizzes on it, and keeps old reviews when it is edited', async () => {
    const cookie = await login();
    const get = (url: string) => app.inject({ url, headers: { cookie } });
    const params = {
      text: 'Pens cost {p} each. How much do {n} pens cost?',
      vars: [{ name: 'p', type: 'whole', min: 2, max: 9 }, { name: 'n', type: 'whole', min: 2, max: 9 }],
      answers: [{ formula: 'p * n', suffix: 'dollars' }],
    };
    const bad = await post('/api/parent/preview', { generator: 'custom', params: { ...params, answers: [{ formula: 'p * q' }] } }, cookie);
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toMatch(/“q” isn’t defined/);
    expect((await post('/api/parent/bank', { kidId, generator: 'custom', params: { ...params, text: '' } }, cookie)).statusCode).toBe(400);

    const preview = (await post('/api/parent/preview', { generator: 'custom', params }, cookie)).json();
    expect(preview.samples).toHaveLength(3);
    db.prepare('UPDATE bank_entries SET enabled = 0 WHERE kid_id = ?').run(kidId);
    const { id } = (await post('/api/parent/bank', { kidId, generator: 'custom', params, label: 'Pens', note: 'Unit 2 test' }, cookie)).json();

    await app.inject({ method: 'PUT', url: '/api/parent/settings', headers: { cookie }, payload: { quizLength: 3 } });
    const quiz = (await post('/api/quiz')).json();
    expect(richText(quiz.questions[0].prompt)).toMatch(/^Pens cost \d each\. How much do \d pens cost\?$/);
    const r = (await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: quiz.questions[0].id, response: rightResponse(answerFor(quiz.questions[0].id)) })).json();
    expect(r).toMatchObject({ correct: true, stars: 2 });
    await post(`/api/quiz/${quiz.quizId}/finish`, {});

    await app.inject({ method: 'PUT', url: `/api/parent/bank/${id}`, headers: { cookie }, payload: { generator: 'custom', params: { ...params, text: 'Changed {p} {n}' }, label: 'Pens' } });
    const review = (await get(`/api/parent/quiz/${quiz.quizId}`)).json();
    expect(richText(review.questions[0].question.prompt)).toMatch(/^Pens cost/);
  });
});

describe('multiple children', () => {
  it('needs a picked child for kid endpoints', async () => {
    expect((await post('/api/quiz', {}, '')).statusCode).toBe(401);
    expect((await app.inject('/api/me')).statusCode).toBe(401);
  });

  it('checks picture codes, rate limits guesses, and lists kids without secrets', async () => {
    const cookie = await login();
    const { id } = (await post('/api/parent/kids', { name: 'Leo', code: [0, 4, 2] }, cookie)).json();
    const kids = (await app.inject('/api/kids')).json();
    expect(kids.map((k: { name: string }) => k.name)).toEqual(['Leo', 'Shannon']);
    expect(kids.find((k: { id: number }) => k.id === id)).toEqual({ id, name: 'Leo', avatar: expect.any(Object), codeLength: 3 });
    expect(JSON.stringify(kids)).not.toMatch(/hash/);

    expect((await post('/api/kid/login', { kidId: id }, '')).statusCode).toBe(401);
    expect((await post('/api/kid/login', { kidId: id, code: [0, 4, 3] }, '')).statusCode).toBe(401);
    expect((await post('/api/kid/login', { kidId: id, code: [0, 4, 2] }, '')).statusCode).toBe(200);
    for (let i = 0; i < 5; i++) await post('/api/kid/login', { kidId: id, code: [1, 1, 1] }, '');
    expect((await post('/api/kid/login', { kidId: id, code: [0, 4, 2] }, '')).json().error).toMatch(/Too many/);

    // parent can clear the code
    await app.inject({ method: 'PUT', url: `/api/parent/kids/${id}`, headers: { cookie }, payload: { code: null } });
    expect((await app.inject('/api/kids')).json().find((k: { id: number }) => k.id === id).codeLength).toBe(0);
  });

  it('starts a new child with their grade’s question set', async () => {
    const cookie = await login();
    const get = (url: string) => app.inject({ url, headers: { cookie } }).then((r) => r.json());
    expect((await get('/api/parent/grade-sets')).map((g: { grade: number }) => g.grade)).toEqual([4, 6]);

    const ava = (await post('/api/parent/kids', { name: 'Ava', grade: 4 }, cookie)).json().id;
    const bank = await get(`/api/parent/bank?kid=${ava}`);
    expect(bank.map((b: { generator: string }) => b.generator)).toContain('divideWhole');
    expect(bank.map((b: { generator: string }) => b.generator)).not.toContain('plotPoint');
    expect((await get('/api/parent/kids')).find((k: { id: number }) => k.id === ava).grade).toBe(4);
    expect((await post('/api/parent/kids', { name: 'X', grade: 9 }, cookie)).statusCode).toBe(400);

    // a 4th grader's quiz has no negative numbers anywhere
    const avaCookie = cookieOf(await post('/api/kid/login', { kidId: ava }, ''));
    const quiz = (await post('/api/quiz', {}, avaCookie)).json();
    expect(JSON.stringify(quiz)).not.toMatch(/"neg":true|"v":-|"text":"-/);

    // add the 6th grade set later, and change the grade without touching the bank
    await post('/api/parent/bank/grade-set', { kidId: ava, grade: 6 }, cookie);
    const bigger = await get(`/api/parent/bank?kid=${ava}`);
    expect(bigger.length).toBeGreaterThan(bank.length);
    expect(bigger.map((b: { generator: string }) => b.generator)).toContain('plotPoint');
    await app.inject({ method: 'PUT', url: `/api/parent/kids/${ava}`, headers: { cookie }, payload: { grade: 6 } });
    expect((await get(`/api/parent/bank?kid=${ava}`)).length).toBe(bigger.length);
  });

  it('lets parents add and remove stars, never below zero', async () => {
    const cookie = await login();
    const stars = (delta: unknown, c = cookie) => app.inject({ method: 'POST', url: `/api/parent/kids/${kidId}/stars`, headers: { cookie: c }, payload: { delta } });
    expect((await stars(50)).json().stars).toBe(50);
    expect((await stars(-10)).json().stars).toBe(40);
    expect((await stars(-500)).json().stars).toBe(0);
    expect((await stars('lots')).statusCode).toBe(400);
    expect((await stars(5, kidCookie)).statusCode).toBe(401); // kids can't give themselves stars
  });

  it('keeps each child’s quizzes, rewards and bank separate', async () => {
    const cookie = await login();
    const leo = (await post('/api/parent/kids', { name: 'Leo', copyBankFrom: kidId }, cookie)).json().id;
    const leoCookie = cookieOf(await post('/api/kid/login', { kidId: leo }, ''));
    const shannonBank = (await app.inject({ url: `/api/parent/bank?kid=${kidId}`, headers: { cookie } })).json();
    const leoBank = (await app.inject({ url: `/api/parent/bank?kid=${leo}`, headers: { cookie } })).json();
    expect(leoBank.map((b: { label: string }) => b.label)).toEqual(shannonBank.map((b: { label: string }) => b.label));

    // Leo can't answer or finish Shannon's quiz
    const quiz = (await post('/api/quiz')).json();
    expect((await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: quiz.questions[0].id, response: {} }, leoCookie)).statusCode).toBe(404);
    expect((await post(`/api/quiz/${quiz.quizId}/finish`, {}, leoCookie)).statusCode).toBe(404);

    const q = quiz.questions[0];
    await post(`/api/quiz/${quiz.quizId}/answer`, { questionId: q.id, response: rightResponse(answerFor(q.id)) });
    await post(`/api/quiz/${quiz.quizId}/finish`, { localDate: '2026-10-24' });
    const me = (cookie: string) => app.inject({ url: '/api/me', headers: { cookie } }).then((r) => r.json());
    expect((await me(kidCookie)).stars).toBe(2);
    expect((await me(leoCookie))).toMatchObject({ name: 'Leo', stars: 0, streak: 0, badges: [] });

    // copying one entry to Leo, and an empty bank for Leo blocks quizzes with a friendly message
    await post(`/api/parent/bank/${shannonBank[0].id}/copy`, { kidId: leo }, cookie);
    expect((await app.inject({ url: `/api/parent/bank?kid=${leo}`, headers: { cookie } })).json()).toHaveLength(leoBank.length + 1);
    db.prepare('UPDATE bank_entries SET enabled = 0 WHERE kid_id = ?').run(leo);
    expect((await post('/api/quiz', {}, leoCookie)).statusCode).toBe(409);
    expect((await post('/api/quiz')).statusCode).toBe(200);

    // deleting a child removes their data
    await app.inject({ method: 'DELETE', url: `/api/parent/kids/${leo}`, headers: { cookie } });
    expect(db.prepare('SELECT COUNT(*) AS n FROM bank_entries WHERE kid_id = ?').get(leo)!.n).toBe(0);
    expect((await app.inject({ url: '/api/me', headers: { cookie: leoCookie } })).statusCode).toBe(401);
  });
});

describe('helper looks saved before there were several helpers', () => {
  it('are upgraded when read', async () => {
    db.prepare('UPDATE kids SET avatar_json = ? WHERE id = ?').run(JSON.stringify({ color: 'color-mint', pipFur: 'pipfur-orange', pipHat: 'piphat-top', pipExtra: 'pipextra-bowtie' }), kidId);
    const me = (await app.inject({ url: '/api/me', headers: { cookie: kidCookie } })).json();
    expect(me.avatar).toEqual({ color: 'color-mint', hat: 'hat-none', face: 'face-smile', extra: 'extra-none', helper: 'helper-fox', helperFur: 'hfur-classic', helperHat: 'hhat-top', helperExtra: 'hextra-bowtie', mode: 'mode-normal' });
  });
});

describe('migration to multiple children', () => {
  it('moves single-child data to Shannon', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'mt-')), 'old.db');
    const old = new DatabaseSync(file);
    old.exec(readFileSync('src/server/migrations/001_init.sql', 'utf8'));
    old.exec(`CREATE TABLE schema_migrations (name TEXT PRIMARY KEY); INSERT INTO schema_migrations VALUES ('001_init.sql');
      INSERT INTO bank_entries (generator, params_json, label) VALUES ('plotPoint', '{}', 'Plot');
      INSERT INTO quizzes (total, finished_at, score) VALUES (5, datetime('now'), 4);
      INSERT INTO badges (code) VALUES ('first_quiz');
      INSERT INTO kv VALUES ('rewards', '{"stars":12,"streak":3,"bestStreak":4,"lastDate":"2026-10-20"}');
      INSERT INTO kv VALUES ('avatar', '{"color":"color-peach","pipHat":"piphat-top"}');
      INSERT INTO kv VALUES ('settings', '{"kidName":"","quizLength":8,"allowRetry":true}');`);
    old.close();

    const db2 = openDb(file);
    const kids = db2.prepare('SELECT * FROM kids').all();
    expect(kids).toHaveLength(1);
    expect(kids[0]).toMatchObject({ name: 'Shannon', stars: 12, streak: 3, best_streak: 4, last_date: '2026-10-20', code_hash: null });
    expect(JSON.parse(kids[0].avatar_json as string).color).toBe('color-peach');
    // what she was already wearing counts as bought, and old stars count as earned
    expect(db2.prepare('SELECT item_id FROM kid_items ORDER BY item_id').all().map((r) => r.item_id)).toEqual(expect.arrayContaining(['color-peach', 'hhat-top']));
    expect(kids[0].stars_earned).toBe(12);
    expect(kids[0].grade).toBe(6);
    expect(db2.prepare('SELECT kid_id FROM bank_entries').get()!.kid_id).toBe(kids[0].id);
    expect(db2.prepare('SELECT kid_id FROM quizzes').get()!.kid_id).toBe(kids[0].id);
    expect(db2.prepare('SELECT code FROM kid_badges').all()).toEqual([{ code: 'first_quiz' }]);
    expect(JSON.parse(db2.prepare("SELECT value FROM kv WHERE key = 'settings'").get()!.value as string)).toEqual({ quizLength: 8, allowRetry: true });
  });

  it('creates no child on a fresh install', () => {
    expect(openDb(':memory:').prepare('SELECT COUNT(*) AS n FROM kids').get()!.n).toBe(0);
  });
});

describe('pickEntries', () => {
  it('never repeats back to back and favors missed entries', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const picks = pickEntries([{ id: 1, weight: 2, missRate: 1 }, { id: 2, weight: 2, missRate: 0 }, { id: 3, weight: 2, missRate: null }], 3000, rand);
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    const count = (id: number) => picks.filter((p) => p === id).length;
    expect(count(1)).toBeGreaterThan(count(3));
    expect(count(3)).toBeGreaterThan(count(2));
  });

  it('skips zero-weight entries', () => {
    expect(new Set(pickEntries([{ id: 1, weight: 0, missRate: 1 }, { id: 2, weight: 1, missRate: 0 }], 20))).toEqual(new Set([2]));
  });
});
