import { F, type Fraction } from '../fraction.ts';
import { toExpr, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import type { Rng } from '../rng.ts';

// Shown exactly as written (unlike toExpr, which simplifies).
const frac = (n: number, d: number): Expr => ({ t: 'frac', neg: false, n, d });
const int = (v: number): Expr => ({ t: 'int', v });
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const show = (v: Fraction): Expr => toExpr(v, 'mixed');
const asWritten = (v: Fraction): Expr => (v.isInt() ? int(v.n) : frac(v.n, v.d));

/** A proper fraction in lowest terms with denominator d. */
const proper = (rng: Rng, d: number): Fraction => {
  for (;;) {
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return F(n, d);
  }
};
/** Two different denominators whose common denominator stays friendly (at most maxLcd). */
const unlikeDens = (rng: Rng, maxDen: number, maxLcd: number): [number, number] => {
  for (;;) {
    const a = rng.int(2, maxDen);
    const b = rng.int(2, maxDen);
    if (a !== b && lcm(a, b) <= maxLcd) return [a, b];
  }
};
/** "and simplify" steps when the answer isn't already in simplest form. */
const simplified = (n: number, d: number): Rich[] => {
  const v = F(n, d);
  const steps: Rich[] = [];
  if (v.d !== d) steps.push(['Simplify: ', frac(n, d), ' = ', asWritten(v)]);
  if (!v.isInt() && Math.abs(v.n) > v.d) steps.push(['As a mixed number: ', show(v)]);
  return steps;
};

type Op = 'add' | 'sub' | 'mixed' | 'mul' | 'mixedMul' | 'unitDiv' | 'div';

export interface FractionCalcParams {
  [k: string]: unknown;
  ops: Op[];
  maxDen: number;
}

export const fractionCalc: GeneratorDef<FractionCalcParams> = {
  id: 'fractionCalc',
  name: 'Fraction operations',
  skill: 'Fractions',
  description: 'Add and subtract fractions with unlike denominators, multiply fractions, and divide with fractions.',
  defaults: { ops: ['add', 'sub'], maxDen: 12 },
  fields: [
    {
      key: 'ops',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'add', label: 'Add, unlike denominators (1/3 + 1/4)' },
        { value: 'sub', label: 'Subtract, unlike denominators (5/6 − 1/4)' },
        { value: 'mixed', label: 'Add & subtract mixed numbers (2 1/2 + 1 2/3)' },
        { value: 'mul', label: 'Fraction × fraction (2/3 × 3/5)' },
        { value: 'mixedMul', label: 'Mixed number × fraction (2 1/2 × 2/3)' },
        { value: 'unitDiv', label: 'Unit fraction and whole number (1/3 ÷ 4, 5 ÷ 1/2)' },
        { value: 'div', label: 'Fraction ÷ fraction (3/4 ÷ 1/8)' },
      ],
    },
    { key: 'maxDen', label: 'Largest denominator', type: 'int', min: 4, max: 12 },
  ],
  presets: [
    { id: 'add-sub', label: 'Add & subtract, unlike denominators', params: { ops: ['add', 'sub'], maxDen: 12 } },
    { id: 'mixed', label: 'Add & subtract mixed numbers', params: { ops: ['mixed'], maxDen: 8 } },
    { id: 'multiply', label: 'Multiply fractions & mixed numbers', params: { ops: ['mul', 'mixedMul'], maxDen: 10 } },
    { id: 'unit-divide', label: 'Divide unit fractions & whole numbers', params: { ops: ['unitDiv'], maxDen: 10 } },
    { id: 'divide', label: 'Divide fractions & mixed numbers', params: { ops: ['div'], maxDen: 12 } },
  ],
  generate(p, rng) {
    const op = rng.pick(p.ops.length ? p.ops : (['add'] as Op[]));
    const answer = (v: Fraction) => ({ kind: 'number' as const, value: v.toString() });

    if (op === 'add' || op === 'sub' || op === 'mixed') {
      const [d1, d2] = op === 'mixed' ? unlikeDens(rng, Math.min(p.maxDen, 8), 24) : unlikeDens(rng, p.maxDen, 36);
      let a = proper(rng, d1);
      let b = proper(rng, d2);
      const sub = op === 'sub' || (op === 'mixed' && rng.bool());
      if (op === 'mixed') {
        a = a.add(F(rng.int(sub ? 2 : 1, 6)));
        b = b.add(F(rng.int(1, sub ? Math.floor(a.toNumber()) - 1 : 5)));
      }
      if (sub && a.cmp(b) <= 0) [a, b] = [b, a];
      if (a.eq(b)) a = a.add(F(1));
      const l = lcm(a.d, b.d);
      const [na, nb] = [a.n * (l / a.d), b.n * (l / b.d)];
      const total = sub ? na - nb : na + nb;
      const v = F(total, l);
      const symbol = sub ? '−' : '+';
      const shown = (x: Fraction) => (op === 'mixed' ? show(x) : asWritten(x));
      return {
        prompt: [sub ? 'Subtract:  ' : 'Add:  ', { t: 'op', op: sub ? '-' : '+', l: shown(a), r: shown(b) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [show(v)],
        hint: [
          op === 'mixed'
            ? 'Turn the mixed numbers into improper fractions (or work with the wholes and fractions separately), then find a common denominator.'
            : `Find a common denominator: a number both ${a.d} and ${b.d} go into.`,
        ],
        explanation: [
          ...(op === 'mixed' ? [['As improper fractions: ', asWritten(a), ` ${symbol} `, asWritten(b)] as Rich] : []),
          [`The least common denominator of ${a.d} and ${b.d} is ${l}.`],
          ['Rewrite: ', frac(na, l), ` ${symbol} `, frac(nb, l), ' = ', frac(total, l)],
          ...simplified(total, l),
        ],
      };
    }

    if (op === 'mul' || op === 'mixedMul') {
      const a = op === 'mixedMul' ? proper(rng, rng.int(2, Math.min(p.maxDen, 6))).add(F(rng.int(1, 4))) : proper(rng, rng.int(2, p.maxDen));
      const b = proper(rng, rng.int(2, p.maxDen));
      const v = a.mul(b);
      return {
        prompt: ['Multiply:  ', { t: 'op', op: '×', l: op === 'mixedMul' ? show(a) : asWritten(a), r: asWritten(b) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [show(v)],
        hint: [op === 'mixedMul' ? 'Change the mixed number to an improper fraction first. Then multiply the tops and multiply the bottoms.' : 'Multiply the numerators together and the denominators together.'],
        explanation: [
          ...(op === 'mixedMul' ? [[show(a), ' = ', asWritten(a)] as Rich] : []),
          [`Numerators: ${a.n} × ${b.n} = ${a.n * b.n}.  Denominators: ${a.d} × ${b.d} = ${a.d * b.d}`],
          [asWritten(a), ' × ', asWritten(b), ' = ', frac(a.n * b.n, a.d * b.d)],
          ...simplified(a.n * b.n, a.d * b.d),
        ],
      };
    }

    if (op === 'unitDiv') {
      const unit = F(1, rng.int(2, p.maxDen));
      const whole = rng.int(2, 9);
      const unitFirst = rng.bool();
      const v = unitFirst ? unit.div(F(whole)) : F(whole).div(unit);
      return {
        prompt: ['Divide:  ', { t: 'op', op: '÷', l: unitFirst ? asWritten(unit) : int(whole), r: unitFirst ? int(whole) : asWritten(unit) }],
        input: { kind: 'number' },
        answer: answer(v),
        answerText: [show(v)],
        hint: [unitFirst ? `Split ${unit.toString()} into ${whole} equal parts. How big is each part?` : `How many ${unit.toString()}s fit into ${whole}?`],
        explanation: unitFirst
          ? [[`Sharing `, asWritten(unit), ` into ${whole} equal parts makes each part `, asWritten(v)], [asWritten(unit), ` ÷ ${whole} = `, asWritten(unit), ' × ', frac(1, whole), ' = ', asWritten(v)]]
          : [[`Each whole holds ${unit.d} pieces of size `, asWritten(unit), '.'], [`${whole} wholes hold ${whole} × ${unit.d} = ${v.n} of them, so ${whole} ÷ `, asWritten(unit), ` = ${v.n}`]],
      };
    }

    // div: keep, change, flip
    const mixedFirst = rng.bool(0.3);
    const a = mixedFirst ? proper(rng, rng.int(2, 6)).add(F(rng.int(1, 3))) : proper(rng, rng.int(2, p.maxDen));
    let b = proper(rng, rng.int(2, p.maxDen));
    if (b.eq(a)) b = F(1, b.d + 1);
    const v = a.div(b);
    const flip = frac(b.d, b.n);
    return {
      prompt: ['Divide:  ', { t: 'op', op: '÷', l: mixedFirst ? show(a) : asWritten(a), r: asWritten(b) }],
      input: { kind: 'number' },
      answer: answer(v),
      answerText: [show(v)],
      hint: ['Keep the first fraction, change ÷ to ×, and flip the second fraction (use its reciprocal).'],
      explanation: [
        ...(mixedFirst ? [[show(a), ' = ', asWritten(a)] as Rich] : []),
        ['Multiply by the reciprocal: ', asWritten(a), ' ÷ ', asWritten(b), ' = ', asWritten(a), ' × ', flip],
        [`= `, frac(a.n * b.d, a.d * b.n)],
        ...simplified(a.n * b.d, a.d * b.n),
      ],
    };
  },
};
