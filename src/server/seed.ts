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
  5: {
    label: '5th grade',
    entries: [
      ['multiplyWhole', '3x2', 'Multiply: 3-digit × 2-digit', 2],
      ['multiplyWhole', '4x2', 'Multiply: 4-digit × 2-digit', 1],
      ['divideWhole', '2-digit-divisor', 'Divide: 4-digit ÷ 2-digit', 3],
      ['decimalOps', 'add-sub', 'Add & subtract decimals', 3],
      ['decimalOps', 'mul-div', 'Multiply & divide decimals', 3],
      ['decimalOps', 'powers10-round', 'Powers of 10 & rounding decimals', 2],
      ['fractionCalc', 'add-sub', 'Add & subtract fractions (unlike denominators)', 3],
      ['fractionCalc', 'mixed', 'Add & subtract mixed numbers', 2],
      ['fractionCalc', 'multiply', 'Multiply fractions & mixed numbers', 3],
      ['fractionCalc', 'unit-divide', 'Divide unit fractions & whole numbers', 2],
      ['orderOfOps', 'parens', 'Order of operations', 2],
      ['volume', 'whole', 'Volume of a box', 2],
      ['plotPoint', 'q1-integers', 'Plot points: first quadrant', 1],
      ['readPoint', 'q1-integers', 'Name coordinates: first quadrant', 1],
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
      ['fractionCalc', 'divide', 'Divide fractions & mixed numbers', 3],
      ['decimalOps', 'multi-digit', 'Multi-digit decimals: all four operations', 2],
      ['gcfLcm', 'all', 'GCF, LCM & factoring out the GCF', 2],
      ['ratios', 'all', 'Ratios, unit rates & using rates', 3],
      ['percent', 'all', 'Percents', 3],
      ['orderOfOps', 'exponents', 'Order of operations with exponents', 2],
      ['equations', 'evaluate', 'Evaluate expressions', 2],
      ['equations', 'one-step', 'One-step equations', 3],
      ['equations', 'one-step-rational', 'One-step equations with decimals', 2],
      ['polygonArea', 'all', 'Area of triangles & polygons', 2],
      ['volume', 'halves', 'Volume with fractional edges', 1],
      ['statistics', 'all', 'Mean, median, mode & range', 2],
    ],
  },
  7: {
    label: '7th grade',
    entries: [
      ['rationalOps', 'integers', 'Negative numbers: all four operations', 3],
      ['rationalOps', 'rational', 'Add & subtract negative fractions and decimals', 2],
      ['rationalOps', 'rational-mul-div', 'Multiply & divide negative fractions and decimals', 2],
      ['proportions', 'all', 'Proportions & percent problems', 3],
      ['simplifyExpressions', 'all', 'Simplify expressions', 2],
      ['twoStepEquations', 'equations', 'Two-step equations', 3],
      ['twoStepEquations', 'inequalities', 'Two-step inequalities', 2],
      ['circles', 'both', 'Area & circumference of circles', 2],
      ['angles', 'all', 'Angle relationships', 2],
      ['probability', 'all', 'Probability', 2],
    ],
  },
};

export const DEFAULT_GRADE = 6;

/** A grade's entries with their preset params filled in. */
export const gradeEntries = (grade: number) =>
  (GRADE_SETS[grade]?.entries ?? []).map(([generator, presetId, label, weight]) => ({
    generator,
    params: GENERATORS[generator].presets.find((p) => p.id === presetId)!.params,
    label,
    weight,
  }));

const key = (generator: string, paramsJson: string) => `${generator} ${paramsJson}`;
const bankKeys = (db: DB, kidId: number) =>
  new Set(db.prepare('SELECT generator, params_json FROM bank_entries WHERE kid_id = ?').all(kidId).map((r) => key(r.generator as string, r.params_json as string)));

/** Each grade set, and (for a child) how many of its entries aren't in their bank yet. */
export function gradeSetList(db?: DB, kidId?: number) {
  const have = db && kidId ? bankKeys(db, kidId) : new Set<string>();
  return Object.entries(GRADE_SETS).map(([grade, s]) => ({
    grade: Number(grade),
    label: s.label,
    count: s.entries.length,
    missing: gradeEntries(Number(grade)).filter((e) => !have.has(key(e.generator, JSON.stringify(e.params)))).length,
  }));
}

/** Add a grade's question set to a child's bank, skipping entries they already have. Returns how many were added. */
export function seedBank(db: DB, kidId: number, grade: number): number {
  const set = GRADE_SETS[grade] ? grade : DEFAULT_GRADE;
  const have = bankKeys(db, kidId);
  const insert = db.prepare('INSERT INTO bank_entries (kid_id, generator, params_json, label, note, weight) VALUES (?, ?, ?, ?, ?, ?)');
  let added = 0;
  for (const e of gradeEntries(set)) {
    const json = JSON.stringify(e.params);
    if (have.has(key(e.generator, json))) continue;
    insert.run(kidId, e.generator, json, e.label, `${GRADE_SETS[set].label} set`, e.weight);
    added++;
  }
  return added;
}

/** "6th grade: Percents" for a question made from a grade set's entry (used for challenge questions). */
export function gradeEntryLabel(generator: string, paramsJson: string): string | null {
  for (const grade of Object.keys(GRADE_SETS).map(Number)) {
    const e = gradeEntries(grade).find((x) => x.generator === generator && JSON.stringify(x.params) === paramsJson);
    if (e) return `${GRADE_SETS[grade].label}: ${e.label}`;
  }
  return null;
}
