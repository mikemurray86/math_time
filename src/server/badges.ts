import type { DB } from './db.ts';
import { AVATAR_ITEMS, BADGES, SEASONS } from '../shared/rewards.ts';

export const badgesOf = (db: DB, kidId: number) =>
  new Set(db.prepare('SELECT code FROM kid_badges WHERE kid_id = ?').all(kidId).map((b) => b.code as string));

/** Records whichever of `earned` the child doesn't have yet; returns those codes. */
export function awardBadges(db: DB, kidId: number, earned: Record<string, boolean>): string[] {
  const have = badgesOf(db, kidId);
  const insert = db.prepare('INSERT INTO kid_badges (kid_id, code) VALUES (?, ?)');
  return BADGES.filter((b) => earned[b.code] && !have.has(b.code)).map((b) => {
    insert.run(kidId, b.code);
    return b.code;
  });
}

/** Star Store badges, checked after a purchase and after every quiz. */
export function storeBadges(db: DB, kidId: number, stars: number): Record<string, boolean> {
  const bought = new Set(db.prepare('SELECT item_id FROM kid_items WHERE kid_id = ?').all(kidId).map((r) => r.item_id as string));
  return {
    fashionista: bought.size >= 15,
    holiday_collector: SEASONS.some((s) => AVATAR_ITEMS.filter((i) => i.season === s.id).every((i) => bought.has(i.id))),
    dragon_tamer: bought.has('helper-dragon'),
    unicorn_friend: bought.has('helper-unicorn'),
    saver: stars >= 500,
  };
}

/** Thanksgiving (the fourth Thursday of November) or Christmas Day, for a YYYY-MM-DD date. */
export function isHoliday(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  if (m === 12) return d === 25;
  if (m !== 11) return false;
  const firstThursday = 1 + ((4 - new Date(Date.UTC(y, 10, 1)).getUTCDay() + 7) % 7);
  return d === firstThursday + 21;
}
