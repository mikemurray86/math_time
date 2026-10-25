import { exprValue, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import { decimalExpr, makeNumber, numberFormOptions, type NumberForm } from './common.ts';

export interface OrderParams {
  [k: string]: unknown;
  count: number;
  forms: NumberForm[];
  range: number;
  maxDen: number;
  direction: 'asc' | 'desc' | 'either';
  closeness: 'spread' | 'close';
  positiveOnly: boolean;
}

export const orderNumbers: GeneratorDef<OrderParams> = {
  id: 'orderNumbers',
  name: 'Order numbers',
  skill: 'Ordering numbers',
  description: 'Drag a mix of negatives, fractions, decimals and absolute values into order.',
  defaults: { count: 5, forms: ['integer', 'improper', 'abs'], range: 6, maxDen: 6, direction: 'asc', closeness: 'spread', positiveOnly: false },
  fields: [
    { key: 'count', label: 'How many numbers', type: 'int', min: 3, max: 7 },
    { key: 'forms', label: 'Kinds of numbers (each one appears at least once)', type: 'multi', options: numberFormOptions },
    { key: 'range', label: 'Largest size (±)', type: 'int', min: 2, max: 20 },
    { key: 'maxDen', label: 'Largest denominator', type: 'int', min: 2, max: 12 },
    {
      key: 'direction',
      label: 'Order',
      type: 'select',
      options: [
        { value: 'asc', label: 'Least to greatest' },
        { value: 'desc', label: 'Greatest to least' },
        { value: 'either', label: 'Mix it up' },
      ],
    },
    {
      key: 'closeness',
      label: 'How close the numbers are',
      type: 'select',
      options: [
        { value: 'spread', label: 'Spread out (easier)' },
        { value: 'close', label: 'Bunched near zero (harder)' },
      ],
    },
    { key: 'positiveOnly', label: 'Positive numbers only (no negatives)', type: 'bool' },
  ],
  presets: [
    { id: 'mix-abs-improper', label: 'Negatives, improper fractions & absolute values (5)', params: { count: 5, forms: ['integer', 'improper', 'abs'], range: 6, maxDen: 6, direction: 'asc', closeness: 'spread', positiveOnly: false } },
    { id: 'everything', label: 'Everything mixed (6, bunched)', params: { count: 6, forms: ['integer', 'fraction', 'improper', 'mixed', 'decimal', 'abs'], range: 5, maxDen: 8, direction: 'either', closeness: 'close', positiveOnly: false } },
    { id: 'positive-fractions', label: 'Positive fractions & decimals (4), no negatives', params: { count: 4, forms: ['fraction', 'mixed', 'decimal'], range: 3, maxDen: 12, direction: 'asc', closeness: 'close', positiveOnly: true } },
    { id: 'fractions-decimals', label: 'Fractions & decimals (4)', params: { count: 4, forms: ['fraction', 'improper', 'decimal'], range: 4, maxDen: 8, direction: 'asc', closeness: 'close', positiveOnly: false } },
  ],
  generate(p, rng) {
    const forms = p.forms.length ? p.forms : (['integer'] as NumberForm[]);
    const [lo, hi] = p.positiveOnly
      ? [0, p.closeness === 'close' ? Math.min(p.range, 3) : p.range]
      : p.closeness === 'close' ? ((c) => [c - 2, c + 2])(rng.int(-1, 1)) : [-p.range, p.range];
    const direction = p.direction === 'either' ? rng.pick(['asc', 'desc'] as const) : p.direction;

    let exprs: Expr[] = [];
    for (let attempt = 0; attempt < 200; attempt++) {
      const seq = rng.shuffle(forms).slice(0, p.count);
      while (seq.length < p.count) seq.push(rng.pick(forms));
      exprs = seq.map((f) => makeNumber(rng, f, lo, hi, p.maxDen));
      const values = exprs.map(exprValue);
      const distinct = values.every((v, i) => values.findIndex((w) => w.eq(v)) === i);
      const signs = new Set(values.map((v) => v.sign()));
      const mixedSigns = p.positiveOnly ? !signs.has(-1) && !signs.has(0) : p.count < 3 || (signs.has(-1) && signs.has(1));
      if (distinct && mixedSigns) break;
    }

    const items = exprs.map((expr, i) => ({ id: String.fromCharCode(97 + i), expr }));
    const sorted = [...items].sort((a, b) => exprValue(a.expr).cmp(exprValue(b.expr)) * (direction === 'asc' ? 1 : -1));
    let shown = rng.shuffle(items);
    while (shown.every((it, i) => it.id === sorted[i].id)) shown = rng.shuffle(items);

    const sep = direction === 'asc' ? '  <  ' : '  >  ';
    const orderLine: Rich = sorted.flatMap((it, i) => (i ? [sep, it.expr] : [it.expr]));
    return {
      prompt: [`Put these numbers in order from ${direction === 'asc' ? 'least to greatest' : 'greatest to least'}.`],
      input: { kind: 'order', direction, items: shown },
      answer: { kind: 'order', ids: sorted.map((s) => s.id) },
      answerText: orderLine,
      hint: ['Change each number to a decimal first. Absolute value is distance from 0, so |x| is never negative, but −|x| is!'],
      explanation: [
        ['Write each number as a decimal:'],
        ...sorted.map((it): Rich => ['   ', it.expr, '  =  ', decimalExpr(exprValue(it.expr))]),
        [direction === 'asc' ? 'Smallest (most negative) to largest:' : 'Largest to smallest (most negative):'],
        orderLine,
      ],
    };
  },
};
