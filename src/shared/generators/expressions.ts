import { F, type Fraction } from '../fraction.ts';
import { decimalText, exprText, toExpr, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import type { Rng } from '../rng.ts';

const SUP: Record<number, string> = { 2: '²', 3: '³' };

// ---- order of operations ------------------------------------------------

/** One worked expression: what's shown, each step of working it out, and the value. */
interface Worked {
  text: string;
  steps: string[];
  value: number;
}

type Template = (rng: Rng) => Worked | null;

const PARENS: Template[] = [
  (rng) => {
    const [a, b, c] = [rng.int(2, 20), rng.int(2, 9), rng.int(2, 9)];
    return { text: `${a} + ${b} × ${c}`, steps: [`Multiply first: ${b} × ${c} = ${b * c}`, `${a} + ${b * c} = ${a + b * c}`], value: a + b * c };
  },
  (rng) => {
    const [a, b, c] = [rng.int(2, 12), rng.int(2, 12), rng.int(2, 9)];
    return { text: `(${a} + ${b}) × ${c}`, steps: [`Parentheses first: ${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${(a + b) * c}`], value: (a + b) * c };
  },
  (rng) => {
    const [b, c] = [rng.int(2, 9), rng.int(2, 9)];
    const a = rng.int(b * c + 1, b * c + 30);
    return { text: `${a} − ${b} × ${c}`, steps: [`Multiply first: ${b} × ${c} = ${b * c}`, `${a} − ${b * c} = ${a - b * c}`], value: a - b * c };
  },
  (rng) => {
    const [d, q] = [rng.int(2, 9), rng.int(2, 9)];
    const [a, c] = [rng.int(2, 9), rng.int(2, 9)];
    const v = a * c + q;
    return { text: `${a} × ${c} + ${d * q} ÷ ${d}`, steps: [`Multiply and divide from left to right: ${a} × ${c} = ${a * c} and ${d * q} ÷ ${d} = ${q}`, `${a * c} + ${q} = ${v}`], value: v };
  },
  (rng) => {
    const c = rng.int(2, 6);
    const inner = c * rng.int(2, 8);
    const b = rng.int(1, 15);
    const a = inner + b;
    const v = inner / c;
    return { text: `(${a} − ${b}) ÷ ${c}`, steps: [`Parentheses first: ${a} − ${b} = ${inner}`, `${inner} ÷ ${c} = ${v}`], value: v };
  },
  (rng) => {
    const [a, b, c, d] = [rng.int(2, 6), rng.int(2, 9), rng.int(1, 9), rng.int(2, 20)];
    const v = a * (b + c) - d;
    if (v < 0) return null;
    return { text: `${a} × (${b} + ${c}) − ${d}`, steps: [`Parentheses first: ${b} + ${c} = ${b + c}`, `Multiply: ${a} × ${b + c} = ${a * (b + c)}`, `${a * (b + c)} − ${d} = ${v}`], value: v };
  },
];

const EXPONENTS: Template[] = [
  (rng) => {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
    return { text: `${a}² + ${b} × ${c}`, steps: [`Exponent first: ${a}² = ${a} × ${a} = ${a * a}`, `Multiply: ${b} × ${c} = ${b * c}`, `${a * a} + ${b * c} = ${a * a + b * c}`], value: a * a + b * c };
  },
  (rng) => {
    const [a, b] = [rng.int(1, 5), rng.int(1, 5)];
    const s = a + b;
    const c = rng.pick([2, 3, 4, 6].filter((x) => (s * s) % x === 0)) ?? 1;
    if (c === 1) return null;
    return { text: `(${a} + ${b})² ÷ ${c}`, steps: [`Parentheses first: ${a} + ${b} = ${s}`, `Exponent: ${s}² = ${s * s}`, `${s * s} ÷ ${c} = ${(s * s) / c}`], value: (s * s) / c };
  },
  (rng) => {
    const a = rng.int(2, 4);
    const [b, c] = [rng.int(2, 9), rng.int(2, 20)];
    const v = a ** 3 * b - c;
    if (v < 0) return null;
    return { text: `${a}³ × ${b} − ${c}`, steps: [`Exponent first: ${a}³ = ${a} × ${a} × ${a} = ${a ** 3}`, `Multiply: ${a ** 3} × ${b} = ${a ** 3 * b}`, `${a ** 3 * b} − ${c} = ${v}`], value: v };
  },
  (rng) => {
    const [a, b, c] = [rng.int(10, 40), rng.int(2, 6), rng.int(2, 5)];
    const v = a + b * c * c;
    return { text: `${a} + ${b} × ${c}²`, steps: [`Exponent first: ${c}² = ${c * c}`, `Multiply: ${b} × ${c * c} = ${b * c * c}`, `${a} + ${b * c * c} = ${v}`], value: v };
  },
  (rng) => {
    const [a, b] = [rng.int(3, 9), rng.int(2, 9)];
    const c = rng.int(1, a * a - 1);
    const v = (a * a - c) * b;
    return { text: `(${a}² − ${c}) × ${b}`, steps: [`Inside the parentheses, exponent first: ${a}² = ${a * a}`, `${a * a} − ${c} = ${a * a - c}`, `${a * a - c} × ${b} = ${v}`], value: v };
  },
];

export interface OrderOfOpsParams {
  [k: string]: unknown;
  kinds: ('parens' | 'exponents')[];
}

export const orderOfOps: GeneratorDef<OrderOfOpsParams> = {
  id: 'orderOfOps',
  name: 'Order of operations',
  skill: 'Expressions & equations',
  description: 'Evaluate expressions with parentheses, and with whole-number exponents.',
  defaults: { kinds: ['parens'] },
  fields: [
    {
      key: 'kinds',
      label: 'Expressions with',
      type: 'multi',
      options: [
        { value: 'parens', label: 'Parentheses, × ÷ + − (3 + 4 × 2)' },
        { value: 'exponents', label: 'Exponents too (5² + 3 × 4)' },
      ],
    },
  ],
  presets: [
    { id: 'parens', label: 'Parentheses & the four operations', params: { kinds: ['parens'] } },
    { id: 'exponents', label: 'With exponents', params: { kinds: ['exponents'] } },
  ],
  generate(p, rng) {
    const pool = (p.kinds.includes('parens') || !p.kinds.length ? PARENS : []).concat(p.kinds.includes('exponents') ? EXPONENTS : []);
    let w: Worked | null = null;
    while (!w) w = rng.pick(pool)(rng);
    return {
      prompt: ['Find the value:  ', w.text],
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(w.value) },
      answerText: [String(w.value)],
      hint: ['Parentheses first, then exponents, then × and ÷ from left to right, then + and − from left to right.'],
      explanation: w.steps.map((s) => [s]),
    };
  },
};

// ---- equations and evaluating expressions -----------------------------

const num = (v: Fraction, style: 'decimal' | 'mixed'): Expr => toExpr(v, style);
const say = (v: Fraction, style: 'decimal' | 'mixed') => (style === 'decimal' ? decimalText(v) : exprText(toExpr(v, 'mixed')));

type EqKind = 'add' | 'sub' | 'mul' | 'div' | 'evaluate';

export interface EquationParams {
  [k: string]: unknown;
  kinds: EqKind[];
  numbers: 'whole' | 'decimal' | 'fraction';
}

export const equations: GeneratorDef<EquationParams> = {
  id: 'equations',
  name: 'Equations & expressions',
  skill: 'Expressions & equations',
  description: 'Solve one-step equations (x + p = q, px = q), and evaluate expressions for a given value of x.',
  defaults: { kinds: ['add', 'sub', 'mul', 'div'], numbers: 'whole' },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'add', label: 'x + p = q' },
        { value: 'sub', label: 'x − p = q' },
        { value: 'mul', label: 'px = q' },
        { value: 'div', label: 'x ÷ p = q' },
        { value: 'evaluate', label: 'Evaluate (3x + 5 when x = 4)' },
      ],
    },
    {
      key: 'numbers',
      label: 'Numbers in equations',
      type: 'select',
      options: [
        { value: 'whole', label: 'Whole numbers' },
        { value: 'decimal', label: 'Decimals' },
        { value: 'fraction', label: 'Fractions' },
      ],
    },
  ],
  presets: [
    { id: 'one-step', label: 'One-step equations, whole numbers', params: { kinds: ['add', 'sub', 'mul', 'div'], numbers: 'whole' } },
    { id: 'one-step-rational', label: 'One-step equations, decimals', params: { kinds: ['add', 'sub', 'mul'], numbers: 'decimal' } },
    { id: 'one-step-fractions', label: 'One-step equations, fractions', params: { kinds: ['add', 'sub', 'mul'], numbers: 'fraction' } },
    { id: 'evaluate', label: 'Evaluate expressions', params: { kinds: ['evaluate'], numbers: 'whole' } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['add'] as EqKind[]));
    const variable = rng.pick(['x', 'y', 'n', 'a', 'm']);

    if (kind === 'evaluate') {
      const x = rng.int(2, 9);
      const [a, b] = [rng.int(2, 9), rng.int(1, 12)];
      const forms: [string, string[], number][] = [
        [`${a}${variable} + ${b}`, [`${a} × ${x} = ${a * x}`, `${a * x} + ${b} = ${a * x + b}`], a * x + b],
        [`${a}(${variable} + ${b})`, [`${x} + ${b} = ${x + b}`, `${a} × ${x + b} = ${a * (x + b)}`], a * (x + b)],
        [`${variable}² + ${b}`, [`${x}² = ${x * x}`, `${x * x} + ${b} = ${x * x + b}`], x * x + b],
      ];
      if (a * x > b) forms.push([`${a}${variable} − ${b}`, [`${a} × ${x} = ${a * x}`, `${a * x} − ${b} = ${a * x - b}`], a * x - b]);
      const [text, steps, value] = rng.pick(forms);
      return {
        prompt: [`Find the value of  ${text}  when ${variable} = ${x}.`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(value) },
        answerText: [String(value)],
        hint: [`Replace ${variable} with ${x}, then use the order of operations.`],
        explanation: [[`Put ${x} in for ${variable}.`], ...steps.map((s): Rich => [s])],
      };
    }

    const style = p.numbers === 'decimal' ? 'decimal' : 'mixed';
    const pick = (): Fraction => {
      if (p.numbers === 'whole') return F(rng.int(2, kind === 'mul' || kind === 'div' ? 12 : 50));
      if (p.numbers === 'decimal') return F(rng.int(2, 99), 10).add(F(rng.int(0, 1) * rng.int(1, 9), 100));
      const d = rng.int(2, 8);
      return F(rng.int(1, 3 * d), d);
    };
    let k = pick();
    if (kind === 'mul' && p.numbers === 'decimal') k = F(rng.int(2, 9));
    if (kind === 'div' && p.numbers !== 'whole') k = F(rng.int(2, 9));
    const n = (v: Fraction) => num(v, style);
    const s = (v: Fraction) => say(v, style);

    // Pick the pieces so every number in the equation, and the answer, is positive.
    let x: Fraction;
    let q: Fraction;
    let left: Rich;
    let undo: string;
    if (kind === 'add') {
      x = pick();
      q = x.add(k);
      left = [`${variable} + `, n(k)];
      undo = `Subtract ${s(k)} from both sides: ${s(q)} − ${s(k)} = ${s(x)}`;
    } else if (kind === 'sub') {
      q = pick();
      x = q.add(k);
      left = [`${variable} − `, n(k)];
      undo = `Add ${s(k)} to both sides: ${s(q)} + ${s(k)} = ${s(x)}`;
    } else if (kind === 'mul') {
      x = pick();
      q = x.mul(k);
      left = k.isInt() ? [`${s(k)}${variable}`] : [n(k), ` × ${variable}`];
      undo = `Divide both sides by ${s(k)}: ${s(q)} ÷ ${s(k)} = ${s(x)}`;
    } else {
      q = pick();
      x = q.mul(k);
      left = [`${variable} ÷ ${s(k)}`];
      undo = `Multiply both sides by ${s(k)}: ${s(q)} × ${s(k)} = ${s(x)}`;
    }
    return {
      prompt: ['Solve for ', variable, ':  ', ...left, ' = ', n(q)],
      input: { kind: 'number' },
      answer: { kind: 'number', value: x.toString() },
      answerText: [`${variable} = `, n(x)],
      hint: ['Do the opposite operation to both sides to get the variable by itself.'],
      explanation: [[undo], [`${variable} = `, n(x)], [`Check: put ${s(x)} back in and both sides match ✓`]],
    };
  },
};
