import { groupDigits, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import type { Rng } from '../rng.ts';

const int = (v: number): Expr => ({ t: 'int', v });
const n = (v: number) => groupDigits(v);
const withDigits = (rng: Rng, d: number) => rng.int(10 ** (d - 1), 10 ** d - 1);

// ---- multiplication ----------------------------------------------------

export interface MultiplyParams {
  [k: string]: unknown;
  shape: '2x1' | '3x1' | '4x1' | '2x2';
}

export const multiplyWhole: GeneratorDef<MultiplyParams> = {
  id: 'multiplyWhole',
  name: 'Multi-digit multiplication',
  skill: 'Multiplication & division',
  description: 'Multiply up to a 4-digit number by a 1-digit number, or two 2-digit numbers.',
  defaults: { shape: '3x1' },
  fields: [
    {
      key: 'shape',
      label: 'Size',
      type: 'select',
      options: [
        { value: '2x1', label: '2-digit × 1-digit' },
        { value: '3x1', label: '3-digit × 1-digit' },
        { value: '4x1', label: '4-digit × 1-digit' },
        { value: '2x2', label: '2-digit × 2-digit' },
      ],
    },
  ],
  presets: [
    { id: '3x1', label: '3-digit × 1-digit', params: { shape: '3x1' } },
    { id: '4x1', label: '4-digit × 1-digit', params: { shape: '4x1' } },
    { id: '2x2', label: '2-digit × 2-digit', params: { shape: '2x2' } },
  ],
  generate(p, rng) {
    const [da, db] = p.shape.split('x').map(Number);
    const a = withDigits(rng, da);
    const b = db === 1 ? rng.int(3, 9) : rng.int(12, 99);
    const product = a * b;
    // Break the number with more digits into place-value parts.
    const [big, small] = db === 1 ? [a, b] : [b, a];
    const parts = String(big)
      .split('')
      .map((d, i, arr) => Number(d) * 10 ** (arr.length - 1 - i))
      .filter((v) => v > 0);
    const explanation: Rich[] = [
      [`Break ${n(big)} into place values: ${parts.map(n).join(' + ')}`],
      ...parts.map((part): Rich => [`${n(part)} × ${n(small)} = ${n(part * small)}`]),
      [`Add the partial products: ${parts.map((part) => n(part * small)).join(' + ')} = ${n(product)}`],
    ];
    return {
      prompt: ['Multiply:  ', { t: 'op', op: '×', l: int(a), r: int(b) }],
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(product) },
      answerText: [int(product)],
      hint: ['Break one number into tens and ones (or thousands, hundreds, tens and ones), multiply each part, then add them up.'],
      explanation,
    };
  },
};

// ---- division with remainders --------------------------------------------

export interface DivideParams {
  [k: string]: unknown;
  dividendDigits: number;
  remainder: 'always' | 'never' | 'either';
}

export const divideWhole: GeneratorDef<DivideParams> = {
  id: 'divideWhole',
  name: 'Long division',
  skill: 'Multiplication & division',
  description: 'Divide up to a 4-digit number by a 1-digit number, with or without a remainder.',
  defaults: { dividendDigits: 3, remainder: 'either' },
  fields: [
    { key: 'dividendDigits', label: 'Digits in the number being divided', type: 'int', min: 2, max: 4 },
    {
      key: 'remainder',
      label: 'Remainders',
      type: 'select',
      options: [
        { value: 'never', label: 'Never (divides evenly)' },
        { value: 'always', label: 'Always' },
        { value: 'either', label: 'Sometimes' },
      ],
    },
  ],
  presets: [
    { id: '3-digit-r', label: '3-digit ÷ 1-digit, with remainders', params: { dividendDigits: 3, remainder: 'either' } },
    { id: '4-digit', label: '4-digit ÷ 1-digit, divides evenly', params: { dividendDigits: 4, remainder: 'never' } },
    { id: '4-digit-r', label: '4-digit ÷ 1-digit, with remainders', params: { dividendDigits: 4, remainder: 'always' } },
  ],
  generate(p, rng) {
    const lo = 10 ** (p.dividendDigits - 1);
    const hi = 10 ** p.dividendDigits - 1;
    const d = rng.int(3, 9);
    const wantR = p.remainder === 'always' || (p.remainder === 'either' && rng.bool(0.7));
    const r = wantR ? rng.int(1, d - 1) : 0;
    const q = rng.int(Math.ceil((lo - r) / d), Math.floor((hi - r) / d));
    const dividend = d * q + r;
    const withR = p.remainder !== 'never';
    const prompt: Rich = ['Divide:  ', { t: 'op', op: '÷', l: int(dividend), r: int(d) }];
    const explanation: Rich[] = [
      [`How many groups of ${d} fit in ${n(dividend)}? ${d} × ${n(q)} = ${n(d * q)}`],
      [`${n(dividend)} − ${n(d * q)} = ${r}, so the remainder is ${r}.`],
      [`Check: ${d} × ${n(q)} + ${r} = ${n(dividend)} ✓`],
    ];
    if (withR) {
      return {
        prompt,
        input: { kind: 'multi', fields: ['Quotient', 'Remainder'] },
        answer: { kind: 'multi', values: [String(q), String(r)] },
        answerText: [`${n(q)} R ${r}`],
        hint: [`The remainder is what’s left over, so it must be smaller than ${d}. Put 0 if nothing is left.`],
        explanation,
      };
    }
    return {
      prompt,
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(q) },
      answerText: [int(q)],
      hint: [`Think: ${d} times what number makes ${n(dividend)}? Divide one place at a time, starting from the left.`],
      explanation: explanation.slice(0, 1).concat([[`Check: ${d} × ${n(q)} = ${n(dividend)} ✓`]]),
    };
  },
};

// ---- place value and rounding -------------------------------------------

export interface PlaceValueParams {
  [k: string]: unknown;
  digits: number;
  task: 'value' | 'round' | 'mixed';
}

const PLACES = ['ones', 'ten', 'hundred', 'thousand', 'ten thousand', 'hundred thousand'];

export const placeValue: GeneratorDef<PlaceValueParams> = {
  id: 'placeValue',
  name: 'Place value & rounding',
  skill: 'Place value',
  description: 'Find the value of a digit, or round a big number to the nearest 10, 100, 1,000 and more.',
  defaults: { digits: 5, task: 'mixed' },
  fields: [
    { key: 'digits', label: 'Digits in the number', type: 'int', min: 3, max: 6 },
    {
      key: 'task',
      label: 'Question type',
      type: 'select',
      options: [
        { value: 'value', label: 'Value of a digit' },
        { value: 'round', label: 'Rounding' },
        { value: 'mixed', label: 'Both' },
      ],
    },
  ],
  presets: [
    { id: 'round-5', label: 'Rounding 5-digit numbers', params: { digits: 5, task: 'round' } },
    { id: 'value-6', label: 'Value of a digit (up to 6 digits)', params: { digits: 6, task: 'value' } },
    { id: 'mixed-4', label: 'Both, 4-digit numbers', params: { digits: 4, task: 'mixed' } },
  ],
  generate(p, rng) {
    const task = p.task === 'mixed' ? rng.pick(['value', 'round'] as const) : p.task;
    if (task === 'value') {
      for (;;) {
        const num = withDigits(rng, p.digits);
        const s = String(num);
        // Pick a digit that appears only once and isn't zero, so the question is unambiguous.
        const choices = s.split('').map((c, i) => ({ c, pos: s.length - 1 - i })).filter((x) => x.c !== '0' && s.split(x.c).length === 2 && x.pos > 0);
        if (!choices.length) continue;
        const { c, pos } = rng.pick(choices);
        const value = Number(c) * 10 ** pos;
        return {
          prompt: [`What is the value of the digit ${c} in `, int(num), '?'],
          input: { kind: 'number' },
          answer: { kind: 'number', value: String(value) },
          answerText: [int(value)],
          hint: ['Each place is worth 10 times the place to its right: ones, tens, hundreds, thousands…'],
          explanation: [[`The ${c} is in the ${PLACES[pos]}s place.`], [`${c} × ${n(10 ** pos)} = ${n(value)}`]],
        };
      }
    }
    const num = withDigits(rng, p.digits);
    const pos = rng.int(1, p.digits - 1);
    const unit = 10 ** pos;
    const rounded = Math.round(num / unit) * unit;
    const lookDigit = Math.floor(num / (unit / 10)) % 10;
    return {
      prompt: ['Round ', int(num), ` to the nearest ${PLACES[pos]}.`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(rounded) },
      answerText: [int(rounded)],
      hint: ['Look at the digit just to the right of the place you’re rounding to. 5 or more rounds up; 4 or less rounds down.'],
      explanation: [
        [`The digit to the right of the ${PLACES[pos]}s place is ${lookDigit}.`],
        [lookDigit >= 5 ? `${lookDigit} is 5 or more, so round up.` : `${lookDigit} is less than 5, so round down.`],
        [`${n(num)} rounds to ${n(rounded)}.`],
      ],
    };
  },
};
