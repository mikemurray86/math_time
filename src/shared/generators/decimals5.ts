import { F, type Fraction } from '../fraction.ts';
import { decimalText, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import type { Rng } from '../rng.ts';

const int = (v: number): Expr => ({ t: 'int', v });
const dec = (v: Fraction): Expr => (v.isInt() ? int(v.n) : { t: 'dec', text: decimalText(v), v: v.toString() });
const txt = (v: Fraction) => decimalText(v);
/** A decimal with exactly `places` places (the last one never 0), between lo and hi. */
const randDec = (rng: Rng, lo: number, hi: number, places: number) => {
  const m = 10 ** places;
  for (;;) {
    const k = rng.int(lo * m, hi * m);
    if (places === 0 || k % 10 !== 0) return F(k, m);
  }
};
const placesOf = (v: Fraction) => (decimalText(v).split('.')[1] ?? '').length;

type DecOp = 'add' | 'sub' | 'mul' | 'div' | 'powers10' | 'round';

export interface DecimalOpsParams {
  [k: string]: unknown;
  ops: DecOp[];
  size: 'small' | 'big';
}

export const decimalOps: GeneratorDef<DecimalOpsParams> = {
  id: 'decimalOps',
  name: 'Decimal operations',
  skill: 'Decimals',
  description: 'Add, subtract, multiply and divide decimals, multiply and divide by 10, 100 and 1,000, and round decimals.',
  defaults: { ops: ['add', 'sub', 'mul', 'div'], size: 'small' },
  fields: [
    {
      key: 'ops',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'add', label: 'Add (4.7 + 12.35)' },
        { value: 'sub', label: 'Subtract (8.2 − 3.45)' },
        { value: 'mul', label: 'Multiply (2.4 × 3, 0.6 × 0.7)' },
        { value: 'div', label: 'Divide (7.2 ÷ 4, 3 ÷ 0.5)' },
        { value: 'powers10', label: '× or ÷ by 10, 100, 1,000' },
        { value: 'round', label: 'Round to a whole, tenth or hundredth' },
      ],
    },
    {
      key: 'size',
      label: 'Number size',
      type: 'select',
      options: [
        { value: 'small', label: 'Smaller (to hundredths, 5th grade)' },
        { value: 'big', label: 'Bigger, multi-digit (6th grade)' },
      ],
    },
  ],
  presets: [
    { id: 'add-sub', label: 'Add & subtract decimals', params: { ops: ['add', 'sub'], size: 'small' } },
    { id: 'mul-div', label: 'Multiply & divide decimals', params: { ops: ['mul', 'div'], size: 'small' } },
    { id: 'powers10-round', label: 'Powers of 10 & rounding', params: { ops: ['powers10', 'round'], size: 'small' } },
    { id: 'multi-digit', label: 'All four operations, multi-digit', params: { ops: ['add', 'sub', 'mul', 'div'], size: 'big' } },
  ],
  generate(p, rng) {
    const op = rng.pick(p.ops.length ? p.ops : (['add'] as DecOp[]));
    const big = p.size === 'big';
    const answer = (v: Fraction) => ({ kind: 'number' as const, value: v.toString(), form: 'decimal' as const });

    if (op === 'add' || op === 'sub') {
      let a = randDec(rng, 1, big ? 500 : 50, rng.int(1, 2));
      let b = randDec(rng, 1, big ? 500 : 50, rng.int(1, 2));
      if (op === 'sub' && a.cmp(b) < 0) [a, b] = [b, a];
      if (a.eq(b)) a = a.add(F(1));
      const v = op === 'add' ? a.add(b) : a.sub(b);
      const places = Math.max(placesOf(a), placesOf(b));
      const pad = (x: Fraction) => x.toNumber().toFixed(places);
      return {
        prompt: [op === 'add' ? 'Add:  ' : 'Subtract:  ', { t: 'op', op: op === 'add' ? '+' : '-', l: dec(a), r: dec(b) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [dec(v)],
        hint: ['Line up the decimal points. Fill empty places with zeros, then work from the right like whole numbers.'],
        explanation: [
          [`Line up the decimal points: ${pad(a)} and ${pad(b)}`],
          [`${pad(a)} ${op === 'add' ? '+' : '−'} ${pad(b)} = ${txt(v)}`],
        ],
      };
    }

    if (op === 'mul') {
      const a = big ? randDec(rng, 1, 60, rng.int(1, 2)) : randDec(rng, 0, 9, 1);
      const b = rng.bool(0.5) ? F(rng.int(2, big ? 25 : 9)) : randDec(rng, 0, big ? 9 : 2, 1);
      const v = a.mul(b);
      const [wa, wb] = [a.mul(F(10 ** placesOf(a))).n, b.mul(F(10 ** placesOf(b))).n];
      const places = placesOf(a) + placesOf(b);
      return {
        prompt: ['Multiply:  ', { t: 'op', op: '×', l: dec(a), r: dec(b) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [dec(v)],
        hint: ['Multiply as if there were no decimal points. Then count the decimal places in both numbers and put that many in the answer.'],
        explanation: [
          [`Ignore the decimal points: ${wa} × ${wb} = ${wa * wb}`],
          [`${txt(a)} has ${placesOf(a)} decimal place${placesOf(a) === 1 ? '' : 's'} and ${txt(b)} has ${placesOf(b)}, so the answer has ${places}.`],
          [`${txt(a)} × ${txt(b)} = ${txt(v)}`],
        ],
      };
    }

    if (op === 'div') {
      if (rng.bool(0.5)) {
        // decimal ÷ whole number
        const d = rng.int(2, big ? 25 : 9);
        const q = randDec(rng, 0, big ? 40 : 9, rng.int(1, 2));
        const a = q.mul(F(d));
        return {
          prompt: ['Divide:  ', { t: 'op', op: '÷', l: dec(a), r: int(d) }],
          input: { kind: 'number' },
          answer: answer(q),
          answerText: [dec(q)],
          hint: ['Divide like whole numbers, and put the decimal point in the answer right above the one in the number you’re dividing.'],
          explanation: [[`${txt(a)} ÷ ${d} = ${txt(q)}`], [`Check: ${txt(q)} × ${d} = ${txt(a)} ✓`]],
        };
      }
      // dividing by a decimal: shift both decimal points
      const d = rng.pick(big ? [F(1, 2), F(1, 4), F(3, 10), F(6, 5), F(5, 2), F(3, 20)] : [F(1, 2), F(1, 10), F(1, 5), F(3, 10)]);
      const q = F(rng.int(2, big ? 60 : 20));
      const a = q.mul(d);
      const shift = 10 ** placesOf(d);
      return {
        prompt: ['Divide:  ', { t: 'op', op: '÷', l: dec(a), r: dec(d) }],
        input: { kind: 'number' },
        answer: answer(q),
        answerText: [dec(q)],
        hint: ['Make the number you divide by a whole number: move both decimal points the same number of places to the right.'],
        explanation: [
          [`Multiply both numbers by ${shift}: ${txt(a)} ÷ ${txt(d)} becomes ${txt(a.mul(F(shift)))} ÷ ${txt(d.mul(F(shift)))}`],
          [`${txt(a.mul(F(shift)))} ÷ ${txt(d.mul(F(shift)))} = ${txt(q)}`],
        ],
      };
    }

    if (op === 'powers10') {
      const a = randDec(rng, 0, 99, rng.int(1, 2));
      const k = rng.int(1, 3);
      const power = 10 ** k;
      const times = rng.bool();
      const v = times ? a.mul(F(power)) : a.div(F(power));
      const name = power.toLocaleString('en-US');
      return {
        prompt: [times ? 'Multiply:  ' : 'Divide:  ', { t: 'op', op: times ? '×' : '÷', l: dec(a), r: int(power) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [dec(v)],
        hint: [`${name} has ${k} zero${k > 1 ? 's' : ''}. ${times ? 'Multiplying' : 'Dividing'} moves the decimal point ${k} place${k > 1 ? 's' : ''} to the ${times ? 'right' : 'left'}.`],
        explanation: [
          [`${name} = 10${['', '', '²', '³'][k]}, so the decimal point moves ${k} place${k > 1 ? 's' : ''} to the ${times ? 'right' : 'left'}.`],
          [`${txt(a)} ${times ? '×' : '÷'} ${name} = ${txt(v)}`],
        ],
      };
    }

    // round
    const to = rng.pick([0, 1, 2]);
    const a = randDec(rng, 0, 99, to + 1 + rng.int(0, 1));
    const m = 10 ** to;
    const v = F(Math.round(a.toNumber() * m + 1e-9), m);
    const placeName = ['whole number', 'tenth', 'hundredth'][to];
    const next = decimalText(a).split('.')[1][to];
    return {
      prompt: [`Round `, dec(a), ` to the nearest ${placeName}.`],
      input: { kind: 'number' },
      answer: answer(v),
      answerText: [dec(v)],
      hint: [`Look at the digit just to the right of the ${placeName === 'whole number' ? 'ones' : `${placeName}s`} place. 5 or more rounds up; 4 or less stays.`],
      explanation: [
        [`The digit after the ${placeName === 'whole number' ? 'ones' : `${placeName}s`} place is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep it the same'}.`],
        [`${txt(a)} rounds to ${txt(v)}`],
      ],
    };
  },
};
