import { F } from '../fraction.ts';
import { decimalText, toExpr, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

// Show fractions exactly as written (2/4 stays 2/4), unlike toExpr which simplifies.
const frac = (n: number, d: number): Expr => ({ t: 'frac', neg: false, n, d });
const mixed = (w: number, n: number, d: number): Expr => ({ t: 'mixed', neg: false, w, n, d });
const int = (v: number): Expr => ({ t: 'int', v });

type FracOp = 'add' | 'sub' | 'mixedAdd' | 'times' | 'equivalent';

export interface FractionOpsParams {
  [k: string]: unknown;
  ops: FracOp[];
  maxDen: number;
}

export const fractionOps: GeneratorDef<FractionOpsParams> = {
  id: 'fractionOps',
  name: 'Fraction skills',
  skill: 'Fractions',
  description: 'Equivalent fractions, adding and subtracting with like denominators, mixed numbers, and whole number × fraction.',
  defaults: { ops: ['add', 'sub', 'equivalent'], maxDen: 12 },
  fields: [
    {
      key: 'ops',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'equivalent', label: 'Equivalent fractions (2/3 = ?/12)' },
        { value: 'add', label: 'Add, same denominator (2/8 + 3/8)' },
        { value: 'sub', label: 'Subtract, same denominator (7/10 − 4/10)' },
        { value: 'mixedAdd', label: 'Add mixed numbers (1 2/5 + 2 1/5)' },
        { value: 'times', label: 'Whole number × fraction (4 × 2/3)' },
      ],
    },
    { key: 'maxDen', label: 'Largest denominator', type: 'int', min: 4, max: 12 },
  ],
  presets: [
    { id: 'equivalent', label: 'Equivalent fractions', params: { ops: ['equivalent'], maxDen: 12 } },
    { id: 'add-sub', label: 'Add & subtract, same denominator', params: { ops: ['add', 'sub', 'mixedAdd'], maxDen: 12 } },
    { id: 'times', label: 'Whole number × fraction', params: { ops: ['times'], maxDen: 10 } },
  ],
  generate(p, rng) {
    const op = rng.pick(p.ops.length ? p.ops : (['add'] as FracOp[]));
    const d = rng.int(3, p.maxDen);
    const answerFrom = (n: number, den: number) => {
      const v = F(n, den);
      return { value: v.toString(), text: [toExpr(v, 'mixed')] as Rich };
    };

    if (op === 'equivalent') {
      const base = rng.pick([2, 3, 4, 5, 6].filter((x) => x <= p.maxDen));
      const a = rng.int(1, base - 1);
      const k = rng.int(2, Math.max(2, Math.floor(12 / base)));
      const big = base * k;
      return {
        prompt: ['Fill in the missing number:  ', frac(a, base), `  =  ? / ${big}`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(a * k) },
        answerText: [frac(a * k, big)],
        hint: [`What do you multiply ${base} by to get ${big}? Multiply the top by the same number.`],
        explanation: [[`${base} × ${k} = ${big}`], ['Multiply the numerator by the same number: ', `${a} × ${k} = ${a * k}`], [frac(a, base), ' = ', frac(a * k, big)]],
      };
    }

    if (op === 'times') {
      const whole = rng.int(2, 9);
      const a = rng.int(1, d - 1);
      const ans = answerFrom(whole * a, d);
      return {
        prompt: ['Multiply:  ', { t: 'op', op: '×', l: int(whole), r: frac(a, d) }],
        input: { kind: 'number' },
        answer: { kind: 'number', value: ans.value },
        answerText: ans.text,
        hint: ['Multiply the whole number by the numerator. The denominator stays the same.'],
        explanation: [[`${whole} × `, frac(a, d), ' = ', frac(whole * a, d)], ['As a mixed number: ', toExpr(F(whole * a, d), 'mixed')]],
      };
    }

    if (op === 'mixedAdd') {
      const [w1, w2] = [rng.int(1, 5), rng.int(1, 5)];
      const a = rng.int(1, d - 2);
      const b = rng.int(1, d - 1 - a); // fractional parts add to less than 1
      const ans = answerFrom((w1 + w2) * d + a + b, d);
      return {
        prompt: ['Add:  ', { t: 'op', op: '+', l: mixed(w1, a, d), r: mixed(w2, b, d) }],
        input: { kind: 'number' },
        answer: { kind: 'number', value: ans.value },
        answerText: ans.text,
        hint: ['Add the whole numbers, then add the fractions.'],
        explanation: [[`Whole numbers: ${w1} + ${w2} = ${w1 + w2}`], ['Fractions: ', frac(a, d), ' + ', frac(b, d), ' = ', frac(a + b, d)], ['Together: ', mixed(w1 + w2, a + b, d)]],
      };
    }

    // add / sub with like denominators
    const a = op === 'sub' ? rng.int(2, d - 1) : rng.int(1, d - 1);
    const b = op === 'sub' ? rng.int(1, a - 1) : rng.int(1, d - 1);
    const result = op === 'add' ? a + b : a - b;
    const ans = answerFrom(result, d);
    if (F(result, d).toString() !== `${result}/${d}`) ans.text = [frac(result, d), ' = ', ...ans.text];
    return {
      prompt: [op === 'add' ? 'Add:  ' : 'Subtract:  ', { t: 'op', op: op === 'add' ? '+' : '-', l: frac(a, d), r: frac(b, d) }],
      input: { kind: 'number' },
      answer: { kind: 'number', value: ans.value },
      answerText: ans.text,
      hint: ['When the denominators match, only the numerators change. Keep the denominator the same.'],
      explanation: [
        ['The denominators are the same, so ', op === 'add' ? 'add' : 'subtract', ' the numerators:'],
        [`${a} ${op === 'add' ? '+' : '−'} ${b} = ${result}`, ', so the answer is ', frac(result, d)],
        ...(F(result, d).toString() !== `${result}/${d}` ? [['That equals ', toExpr(F(result, d), 'mixed')] as Rich] : []),
      ],
    };
  },
};

// ---- decimals and fractions ---------------------------------------------

type DecOp = 'toFraction' | 'toDecimal';

export interface DecimalFractionParams {
  [k: string]: unknown;
  ops: DecOp[];
  hundredths: boolean;
  wholes: boolean;
}

export const decimalFractions: GeneratorDef<DecimalFractionParams> = {
  id: 'decimalFractions',
  name: 'Decimals & fractions',
  skill: 'Fractions',
  description: 'Write tenths and hundredths as decimals or fractions.',
  defaults: { ops: ['toFraction', 'toDecimal'], hundredths: true, wholes: false },
  fields: [
    {
      key: 'ops',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'toFraction', label: 'Decimal → fraction (0.7 = 7/10)' },
        { value: 'toDecimal', label: 'Fraction → decimal (35/100 = 0.35)' },
      ],
    },
    { key: 'hundredths', label: 'Include hundredths', type: 'bool' },
    { key: 'wholes', label: 'Include whole numbers (3.07)', type: 'bool' },
  ],
  presets: [
    { id: 'tenths', label: 'Tenths only', params: { ops: ['toFraction', 'toDecimal'], hundredths: false, wholes: false } },
    { id: 'hundredths', label: 'Tenths & hundredths', params: { ops: ['toFraction', 'toDecimal'], hundredths: true, wholes: false } },
    { id: 'wholes', label: 'With whole numbers (3.07)', params: { ops: ['toFraction', 'toDecimal'], hundredths: true, wholes: true } },
  ],
  generate(p, rng) {
    const op = rng.pick(p.ops.length ? p.ops : (['toFraction'] as DecOp[]));
    const den = p.hundredths && rng.bool(0.6) ? 100 : 10;
    const num = rng.int(1, den - 1);
    const whole = p.wholes && rng.bool(0.5) ? rng.int(1, 9) : 0;
    const v = F(whole * den + num, den);
    const dec = decimalText(v);
    const fracExpr: Expr = whole ? mixed(whole, num, den) : frac(num, den);
    const placeName = den === 10 ? 'tenths' : 'hundredths';
    if (op === 'toFraction') {
      return {
        prompt: ['Write ', { t: 'dec', text: dec, v: v.toString() }, ' as a fraction.'],
        input: { kind: 'number' },
        answer: { kind: 'number', value: v.toString(), form: 'fraction' },
        answerText: [fracExpr],
        hint: [`Count the decimal places: one place is tenths (/10), two places is hundredths (/100).`],
        explanation: [[`${dec} has ${den === 10 ? 'one decimal place' : 'two decimal places'}, so it’s ${placeName}.`], [`${dec} = `, fracExpr]],
      };
    }
    return {
      prompt: ['Write ', fracExpr, ' as a decimal.'],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString(), form: 'decimal' },
      answerText: [{ t: 'dec', text: dec, v: v.toString() }],
      hint: [`Tenths use one place after the decimal point; hundredths use two (so 7/100 is 0.07).`],
      explanation: [[fracExpr, ` is ${whole ? `${whole} and ` : ''}${num} ${placeName}.`], [`Written as a decimal: ${dec}`]],
    };
  },
};
