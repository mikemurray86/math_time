import type { DB } from './db.ts';
import { GENERATORS } from '../shared/registry.ts';

// Starter bank for a new child, based on the skills Shannon missed on recent tests.
const STARTERS: Array<[generator: string, preset: string, label: string, weight: number]> = [
  ['orderNumbers', 'mix-abs-improper', 'Order: negatives, improper fractions & absolute values', 3],
  ['orderNumbers', 'everything', 'Order: everything mixed, bunched near zero', 2],
  ['compareNumbers', 'mixed-forms', 'Compare: mixed forms with absolute value', 2],
  ['plotPoint', 'halves', 'Plot points: halves, all quadrants', 3],
  ['plotPoint', 'quarters-dec', 'Plot points: quarter decimals', 2],
  ['readPoint', 'quarters-frac', 'Name coordinates: quarter fractions', 2],
  ['distanceSameLine', 'cross-int', 'Distance: crossing an axis (whole numbers)', 3],
  ['distanceSameLine', 'cross-halves', 'Distance: crossing an axis (halves)', 2],
  ['absoluteValue', 'int-mix', 'Absolute value expressions', 1],
];

export function seedBank(db: DB, kidId: number) {
  const insert = db.prepare('INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight) VALUES (?, ?, ?, ?, ?, ?)');
  for (const [gen, presetId, label, weight] of STARTERS) {
    const preset = GENERATORS[gen].presets.find((p) => p.id === presetId)!;
    insert.run(kidId, gen, JSON.stringify(preset.params), label, 'Starter question', weight);
  }
}
