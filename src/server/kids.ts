import { createHash, timingSafeEqual } from 'node:crypto';
import { tx, type DB } from './db.ts';
import { DEFAULT_GRADE, GRADE_SETS, seedBank } from './seed.ts';
import { AVATAR_ITEMS, DEFAULT_AVATAR, upgradeAvatar, type Avatar, type AvatarItem } from '../shared/rewards.ts';
import { isValidCode } from '../shared/pictures.ts';

export interface Kid {
  id: number;
  name: string;
  grade: number | null;
  codeLength: number; // 0 = no picture code
  avatar: Avatar;
  stars: number; // spendable balance
  starsEarned: number; // lifetime from quizzes, for badges
  streak: number;
  bestStreak: number;
  lastDate: string | null;
}

const toKid = (r: Record<string, unknown>): Kid => ({
  id: r.id as number,
  name: r.name as string,
  grade: (r.grade as number | null) ?? null,
  codeLength: r.code_hash ? (r.code_length as number) : 0,
  avatar: { ...DEFAULT_AVATAR, ...upgradeAvatar(JSON.parse(r.avatar_json as string)) },
  stars: r.stars as number,
  starsEarned: r.stars_earned as number,
  streak: r.streak as number,
  bestStreak: r.best_streak as number,
  lastDate: (r.last_date as string | null) ?? null,
});

const hashCode = (id: number, code: number[]) => createHash('sha256').update(`math-time:${id}:${code.join('-')}`).digest('hex');

export function getKid(db: DB, id: number): Kid | null {
  const r = db.prepare('SELECT * FROM kids WHERE id = ?').get(id);
  return r ? toKid(r) : null;
}

export const listKids = (db: DB): Kid[] => db.prepare('SELECT * FROM kids ORDER BY name COLLATE NOCASE').all().map(toKid);

export function checkCode(db: DB, id: number, code: unknown): boolean {
  const r = db.prepare('SELECT code_hash FROM kids WHERE id = ?').get(id);
  if (!r) return false;
  if (!r.code_hash) return true;
  if (!isValidCode(code)) return false;
  return timingSafeEqual(Buffer.from(hashCode(id, code)), Buffer.from(r.code_hash as string));
}

export function setCode(db: DB, id: number, code: number[] | null) {
  db.prepare('UPDATE kids SET code_hash = ?, code_length = ? WHERE id = ?').run(code ? hashCode(id, code) : null, code?.length ?? 0, id);
}

export const validGrade = (g: unknown): number | null => (GRADE_SETS[Number(g)] ? Number(g) : null);

/** New child, starting from their grade's question set or a copy of a sibling's bank. */
export function createKid(db: DB, name: string, code: number[] | null, grade: number = DEFAULT_GRADE, copyBankFrom?: number): number {
  return tx(db, () => {
    const id = Number(db.prepare('INSERT INTO kids (name, grade) VALUES (?, ?)').run(name, grade).lastInsertRowid);
    // Alternate the free colors so siblings look different on the picker.
    saveAvatar(db, id, { ...DEFAULT_AVATAR, color: id % 2 ? 'color-sky' : 'color-mint' });
    setCode(db, id, code);
    if (copyBankFrom && getKid(db, copyBankFrom)) {
      db.prepare(
        `INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight, enabled)
         SELECT ?, generator, params_json, label, note, weight, enabled FROM bank_entries WHERE kid_id = ? ORDER BY id`,
      ).run(id, copyBankFrom);
    } else {
      seedBank(db, id, grade);
    }
    return id;
  });
}

export function saveRewards(db: DB, kid: Pick<Kid, 'id' | 'stars' | 'starsEarned' | 'streak' | 'bestStreak' | 'lastDate'>) {
  db.prepare('UPDATE kids SET stars = ?, stars_earned = ?, streak = ?, best_streak = ?, last_date = ? WHERE id = ?').run(
    kid.stars, kid.starsEarned, kid.streak, kid.bestStreak, kid.lastDate, kid.id,
  );
}

/** Items the child can wear: everything free plus what they've bought. */
export function ownedItems(db: DB, id: number): string[] {
  const bought = new Set(db.prepare('SELECT item_id FROM kid_items WHERE kid_id = ?').all(id).map((r) => r.item_id as string));
  return AVATAR_ITEMS.filter((i) => i.stars === 0 || bought.has(i.id)).map((i) => i.id);
}

export const owns = (db: DB, id: number, item: AvatarItem) =>
  item.stars === 0 || !!db.prepare('SELECT 1 FROM kid_items WHERE kid_id = ? AND item_id = ?').get(id, item.id);

/** Spend stars on an item; returns an error message or null. */
export function buyItem(db: DB, kid: Kid, item: AvatarItem): string | null {
  return tx(db, () => {
    if (owns(db, kid.id, item)) return 'You already have this!';
    const res = db.prepare('UPDATE kids SET stars = stars - ? WHERE id = ? AND stars >= ?').run(item.stars, kid.id, item.stars);
    if (!res.changes) return 'Not enough stars yet. Keep practicing!';
    db.prepare('INSERT INTO kid_items (kid_id, item_id) VALUES (?, ?)').run(kid.id, item.id);
    return null;
  });
}

export function saveAvatar(db: DB, id: number, avatar: Avatar) {
  db.prepare('UPDATE kids SET avatar_json = ? WHERE id = ?').run(JSON.stringify(avatar), id);
}
