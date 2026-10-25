import type { DB } from './db.ts';
import { GENERATORS } from '../shared/registry.ts';

type Starter = [generator: string, preset: string, label: string, weight: number];

/** Grade-level question sets a new child's bank can start from. Add a grade by adding an entry here. */
export const GRADE_SETS: Record<number, { label: string; entries: Starter[] }> = {
  4: {
    label: '4th grade',
    entries: [
      ['multiplyWhole', '3x1', 'Multiply: 3-digit × 1-digit', 2],
      ['multiplyWhole', '4x1', 'Multiply: 4-digit × 1-digit', 2],
      ['multiplyWhole', '2x2', 'Multiply: 2-digit × 2-digit', 3],
      ['divideWhole', '3-digit-r', 'Divide: 3-digit ÷ 1-digit with remainders', 3],
      ['divideWhole', '4-digit', 'Divide: 4-digit ÷ 1-digit', 2],
      ['placeValue', 'round-5', 'Rounding big numbers', 2],
      ['placeValue', 'value-6', 'Value of a digit', 1],
      ['fractionOps', 'equivalent', 'Equivalent fractions', 2],
      ['fractionOps', 'add-sub', 'Add & subtract fractions (same denominator)', 3],
      ['fractionOps', 'times', 'Whole number × fraction', 2],
      ['compareNumbers', 'positive-fractions', 'Compare fractions & decimals', 2],
      ['decimalFractions', 'hundredths', 'Decimals ↔ fractions', 2],
      ['areaPerimeter', 'mixed-12', 'Area & perimeter of rectangles', 2],
      ['factorsMultiples', 'all-100', 'Factors, multiples & primes', 1],
    ],
  },
  6: {
    label: '6th grade',
    entries: [
      ['orderNumbers', 'mix-abs-improper', 'Order: negatives, improper fractions & absolute values', 3],
      ['orderNumbers', 'everything', 'Order: everything mixed, bunched near zero', 2],
      ['compareNumbers', 'mixed-forms', 'Compare: mixed forms with absolute value', 2],
      ['plotPoint', 'halves', 'Plot points: halves, all quadrants', 3],
      ['plotPoint', 'quarters-dec', 'Plot points: quarter decimals', 2],
      ['readPoint', 'quarters-frac', 'Name coordinates: quarter fractions', 2],
      ['distanceSameLine', 'cross-int', 'Distance: crossing an axis (whole numbers)', 3],
      ['distanceSameLine', 'cross-halves', 'Distance: crossing an axis (halves)', 2],
      ['absoluteValue', 'int-mix', 'Absolute value expressions', 1],
    ],
  },
};

export const DEFAULT_GRADE = 6;

export const gradeSetList = () => Object.entries(GRADE_SETS).map(([grade, s]) => ({ grade: Number(grade), label: s.label, count: s.entries.length }));

/** Add a grade's question set to a child's bank. */
export function seedBank(db: DB, kidId: number, grade: number) {
  const set = GRADE_SETS[grade] ?? GRADE_SETS[DEFAULT_GRADE];
  const insert = db.prepare('INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight) VALUES (?, ?, ?, ?, ?, ?)');
  for (const [gen, presetId, label, weight] of set.entries) {
    const preset = GENERATORS[gen].presets.find((p) => p.id === presetId)!;
    insert.run(kidId, gen, JSON.stringify(preset.params), label, `${set.label} set`, weight);
  }
}
