import { F, type Fraction } from '../fraction.ts';
import { decimalText, exprText, toExpr, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import type { Rng } from '../rng.ts';

const MINUS = '−';
/** −7 with a real minus sign. */
const sn = (n: number) => (n < 0 ? `${MINUS}${-n}` : String(n));
/** A number as it reads in a sentence: decimals for money and π work, mixed numbers otherwise. */
const say = (v: Fraction, style: 'decimal' | 'mixed' = 'mixed') => exprText(toExpr(v, style));
const money = (v: Fraction) => `$${v.toNumber().toFixed(2)}`;
const paren = (v: Fraction, style: 'decimal' | 'mixed') => (v.sign() < 0 ? `(${say(v, style)})` : say(v, style));
const nonZero = (rng: Rng, lo: number, hi: number) => {
  for (;;) {
    const v = rng.int(lo, hi);
    if (v !== 0) return v;
  }
};

/** "3x − 5", "−x + 2", "4x": a linear expression written the usual way. */
function linear(coef: number, constant: number, v = 'x'): string {
  const head = coef === 0 ? '' : coef === 1 ? v : coef === -1 ? `${MINUS}${v}` : `${sn(coef)}${v}`;
  if (!constant) return head || '0';
  if (!head) return sn(constant);
  return `${head} ${constant < 0 ? MINUS : '+'} ${Math.abs(constant)}`;
}

// ---- operations with negative numbers ---------------------------------------

type RatOp = '+' | '-' | '×' | '÷';

export interface RationalOpsParams {
  [k: string]: unknown;
  ops: RatOp[];
  numbers: 'integer' | 'rational';
}

export const rationalOps: GeneratorDef<RationalOpsParams> = {
  id: 'rationalOps',
  name: 'Operations with negative numbers',
  skill: 'Negative numbers',
  description: 'Add, subtract, multiply and divide positive and negative integers, fractions and decimals.',
  defaults: { ops: ['+', '-', '×', '÷'], numbers: 'integer' },
  fields: [
    {
      key: 'ops',
      label: 'Operations',
      type: 'multi',
      options: [
        { value: '+', label: 'Add (−7 + 4)' },
        { value: '-', label: 'Subtract (3 − (−5))' },
        { value: '×', label: 'Multiply (−6 × 4)' },
        { value: '÷', label: 'Divide (−24 ÷ (−3))' },
      ],
    },
    {
      key: 'numbers',
      label: 'Numbers',
      type: 'select',
      options: [
        { value: 'integer', label: 'Integers' },
        { value: 'rational', label: 'Fractions & decimals' },
      ],
    },
  ],
  presets: [
    { id: 'integers', label: 'All four operations, integers', params: { ops: ['+', '-', '×', '÷'], numbers: 'integer' } },
    { id: 'rational', label: 'Add & subtract fractions and decimals', params: { ops: ['+', '-'], numbers: 'rational' } },
    { id: 'rational-mul-div', label: 'Multiply & divide fractions and decimals', params: { ops: ['×', '÷'], numbers: 'rational' } },
  ],
  generate(p, rng) {
    const op = rng.pick(p.ops.length ? p.ops : (['+'] as RatOp[]));
    const style = p.numbers === 'rational' && rng.bool() ? 'decimal' : 'mixed';
    const pick = (): Fraction => {
      if (p.numbers === 'integer') return F(nonZero(rng, op === '×' || op === '÷' ? -12 : -25, op === '×' || op === '÷' ? 12 : 25));
      if (style === 'decimal') return F(nonZero(rng, -99, 99), 10);
      const d = rng.pick([2, 3, 4, 5, 6, 8]);
      return F(nonZero(rng, -3 * d, 3 * d), d);
    };
    let a = pick();
    let b = pick();
    if (op === '÷') a = a.mul(b); // answers come out even
    if (a.sign() > 0 && b.sign() > 0) (rng.bool() ? (a = a.neg()) : (b = b.neg())); // always at least one negative
    const v = op === '+' ? a.add(b) : op === '-' ? a.sub(b) : op === '×' ? a.mul(b) : a.div(b);
    const signRule =
      op === '×' || op === '÷'
        ? `Same signs give a positive answer; different signs give a negative answer.`
        : op === '-'
          ? `Subtracting a number is the same as adding its opposite: ${say(a, style)} − ${paren(b, style)} = ${say(a, style)} + ${paren(b.neg(), style)}`
          : `Think of a number line: start at ${say(a, style)} and move ${b.sign() > 0 ? 'right' : 'left'} ${say(b.abs(), style)}.`;
    return {
      prompt: [{ '+': 'Add', '-': 'Subtract', '×': 'Multiply', '÷': 'Divide' }[op], ':  ', { t: 'op', op, l: toExpr(a, style), r: toExpr(b, style) }],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString() },
      answerText: [toExpr(v, style)],
      hint: [op === '×' || op === '÷' ? 'Work with the numbers without signs first, then decide: same signs → positive, different signs → negative.' : 'Picture a number line, or change subtracting into adding the opposite.'],
      explanation: [[signRule], [exprText({ t: 'op', op, l: toExpr(a, style), r: toExpr(b, style) }), ' = ', toExpr(v, style)]],
    };
  },
};

// ---- proportions, percents of change, tax, tip and interest -----------------

type PropKind = 'constant' | 'discount' | 'tax' | 'tip' | 'change' | 'interest';

export interface ProportionParams {
  [k: string]: unknown;
  kinds: PropKind[];
}

export const proportions: GeneratorDef<ProportionParams> = {
  id: 'proportions',
  name: 'Proportions & percent problems',
  skill: 'Ratios & percents',
  description: 'Constant of proportionality, discounts, sales tax, tips, percent increase and decrease, and simple interest.',
  defaults: { kinds: ['constant', 'discount', 'tax', 'tip', 'change', 'interest'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'constant', label: 'Constant of proportionality (y = kx)' },
        { value: 'discount', label: 'Sale price after a discount' },
        { value: 'tax', label: 'Total with sales tax' },
        { value: 'tip', label: 'Tip on a bill' },
        { value: 'change', label: 'Percent increase or decrease' },
        { value: 'interest', label: 'Simple interest' },
      ],
    },
  ],
  presets: [
    { id: 'all', label: 'Proportions & percent word problems', params: { kinds: ['constant', 'discount', 'tax', 'tip', 'change', 'interest'] } },
    { id: 'money', label: 'Discounts, tax & tips', params: { kinds: ['discount', 'tax', 'tip'] } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['constant'] as PropKind[]));
    const dec = (v: Fraction): Expr => toExpr(v, 'decimal');

    if (kind === 'constant') {
      const k = rng.bool(0.6) ? F(rng.int(2, 12)) : F(rng.int(1, 9) * 2 + 1, 2);
      const x = rng.int(2, 10) * 2;
      const y = k.mul(F(x));
      return {
        prompt: [`y is proportional to x. When x = ${x}, y = ${say(y, 'decimal')}. What is the constant of proportionality k (so that y = kx)?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: k.toString() },
        answerText: [`k = `, dec(k)],
        hint: ['In y = kx, k is how much y you get for each 1 of x. Divide y by x.'],
        explanation: [[`k = y ÷ x = ${say(y, 'decimal')} ÷ ${x} = ${say(k, 'decimal')}`], [`So y = ${say(k, 'decimal')}x`]],
      };
    }

    if (kind === 'change') {
      const pct = rng.pick([10, 20, 25, 30, 40, 50, 75]);
      const start = F(rng.int(2, 20) * (100 / gcdInt(pct, 100)));
      const up = rng.bool();
      const end = start.mul(F(100 + (up ? pct : -pct), 100));
      const diff = end.sub(start).abs();
      const story = rng.pick([
        `The chess club had ${say(start)} members last year and has ${say(end)} this year.`,
        `A store sold ${say(start)} bikes in May and ${say(end)} in June.`,
        `A video had ${say(start)} likes on Monday and ${say(end)} on Tuesday.`,
      ]);
      return {
        prompt: [`${story} By what percent did it ${up ? 'go up' : 'go down'}? (Just the number, without %.)`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(pct) },
        answerText: [`${pct}%`],
        hint: ['Find how much it changed, then divide by where it started. Turn that into a percent.'],
        explanation: [[`Change: ${say(end)} − ${say(start)} = ${up ? '' : MINUS}${say(diff)}`], [`${say(diff)} ÷ ${say(start)} = ${say(diff.div(start), 'decimal')} = ${pct}%`], [`It ${up ? 'increased' : 'decreased'} by ${pct}%.`]],
      };
    }

    if (kind === 'interest') {
      const principal = F(rng.int(2, 40) * 50);
      const rate = rng.pick([2, 3, 4, 5, 6, 8]);
      const years = rng.int(2, 6);
      const interest = principal.mul(F(rate, 100)).mul(F(years));
      return {
        prompt: [`You put ${money(principal)} in a savings account that pays ${rate}% simple interest each year. How much interest do you earn in ${years} years (in dollars)?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: interest.toString(), form: 'decimal' },
        answerText: [money(interest)],
        hint: ['Simple interest = amount × rate × years. Write the rate as a decimal first.'],
        explanation: [[`${rate}% = ${say(F(rate, 100), 'decimal')}`], [`${money(principal)} × ${say(F(rate, 100), 'decimal')} = ${money(principal.mul(F(rate, 100)))} each year`], [`${money(principal.mul(F(rate, 100)))} × ${years} = ${money(interest)}`]],
      };
    }

    // discount, tax, tip: money amounts that come out to whole cents
    const pct = kind === 'tax' ? rng.pick([5, 6, 8, 10]) : kind === 'tip' ? rng.pick([15, 18, 20, 25]) : rng.pick([10, 20, 25, 30, 40, 50]);
    const price = F(rng.int(4, 60) * 5);
    const part = price.mul(F(pct, 100));
    const total = kind === 'discount' ? price.sub(part) : price.add(part);
    const what = {
      discount: [`A jacket costs ${money(price)} and is ${pct}% off. What is the sale price (in dollars)?`, 'discount', 'Subtract the discount from the price.'],
      tax: [`A video game costs ${money(price)}. Sales tax is ${pct}%. What is the total cost with tax (in dollars)?`, 'tax', 'Add the tax to the price.'],
      tip: [`A dinner bill is ${money(price)}. You leave a ${pct}% tip. How much do you pay in all (in dollars)?`, 'tip', 'Add the tip to the bill.'],
    }[kind];
    return {
      prompt: [what[0]],
      input: { kind: 'number' },
      answer: { kind: 'number', value: total.toString(), form: 'decimal' },
      answerText: [money(total)],
      hint: [`Find ${pct}% of ${money(price)} first. ${what[2]}`],
      explanation: [[`${pct}% of ${money(price)} = ${say(F(pct, 100), 'decimal')} × ${money(price)} = ${money(part)}`], [`${money(price)} ${kind === 'discount' ? MINUS : '+'} ${money(part)} = ${money(total)}`]],
    };
  },
};

const gcdInt = (a: number, b: number): number => (b ? gcdInt(b, a % b) : a);

// ---- two-step equations and inequalities -----------------------------------

type EqKind = 'twoStep' | 'distribute' | 'inequality';

export interface TwoStepParams {
  [k: string]: unknown;
  kinds: EqKind[];
}

export const twoStepEquations: GeneratorDef<TwoStepParams> = {
  id: 'twoStepEquations',
  name: 'Two-step equations & inequalities',
  skill: 'Expressions & equations',
  description: 'Solve px + q = r and p(x + q) = r with negative numbers, and two-step inequalities (including flipping the sign).',
  defaults: { kinds: ['twoStep', 'distribute', 'inequality'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'twoStep', label: 'px + q = r (3x − 5 = 16)' },
        { value: 'distribute', label: 'p(x + q) = r (4(x + 2) = 28)' },
        { value: 'inequality', label: 'Inequalities (−2x + 3 > 11)' },
      ],
    },
  ],
  presets: [
    { id: 'equations', label: 'Two-step equations', params: { kinds: ['twoStep', 'distribute'] } },
    { id: 'inequalities', label: 'Two-step inequalities', params: { kinds: ['inequality'] } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['twoStep'] as EqKind[]));
    const v = rng.pick(['x', 'n', 'y']);
    const coef = nonZero(rng, -9, 9) || 2;
    const a = Math.abs(coef) === 1 ? coef * 2 : coef;
    const x = nonZero(rng, -10, 10);
    const q = nonZero(rng, -20, 20);

    if (kind === 'distribute') {
      const r = a * (x + q);
      return {
        prompt: [`Solve for ${v}:  ${sn(a)}(${linear(1, q, v)}) = ${sn(r)}`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(x) },
        answerText: [`${v} = ${sn(x)}`],
        hint: [`Divide both sides by ${sn(a)} first, then undo the ${q > 0 ? 'adding' : 'subtracting'}.`],
        explanation: [[`Divide both sides by ${sn(a)}: ${linear(1, q, v)} = ${sn(x + q)}`], [`${q > 0 ? 'Subtract' : 'Add'} ${Math.abs(q)} on both sides: ${v} = ${sn(x)}`]],
      };
    }

    const r = a * x + q;
    if (kind === 'twoStep') {
      return {
        prompt: [`Solve for ${v}:  ${linear(a, q, v)} = ${sn(r)}`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(x) },
        answerText: [`${v} = ${sn(x)}`],
        hint: ['Undo the adding or subtracting first, then undo the multiplying.'],
        explanation: [[`${q > 0 ? 'Subtract' : 'Add'} ${Math.abs(q)} on both sides: ${linear(a, 0, v)} = ${sn(r - q)}`], [`Divide both sides by ${sn(a)}: ${v} = ${sn(x)}`]],
      };
    }

    // inequality: solve a·v + q (sign) r; dividing by a negative flips the sign
    const signs = ['<', '>', '≤', '≥'] as const;
    const flip: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
    const s = rng.pick(signs);
    const solved = a < 0 ? flip[s] : s;
    const right = `${v} ${solved} ${sn(x)}`;
    const wrong = [`${v} ${flip[solved]} ${sn(x)}`, `${v} ${solved} ${sn(-x)}`, `${v} ${solved} ${sn((r - q) - a)}`].filter((w) => w !== right);
    const options = rng.shuffle([right, ...[...new Set(wrong)].slice(0, 3)]).map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
    return {
      prompt: [`Solve:  ${linear(a, q, v)} ${s} ${sn(r)}`],
      input: { kind: 'choice', options },
      answer: { kind: 'choice', id: options.find((o) => o.label === right)!.id },
      answerText: [right],
      hint: [a < 0 ? 'Solve it like an equation, but watch out: dividing by a negative number flips the inequality sign!' : 'Solve it like an equation: undo the adding or subtracting, then undo the multiplying.'],
      explanation: [
        [`${q > 0 ? 'Subtract' : 'Add'} ${Math.abs(q)} on both sides: ${linear(a, 0, v)} ${s} ${sn(r - q)}`],
        [`Divide both sides by ${sn(a)}${a < 0 ? ', and flip the sign because it’s negative' : ''}: ${right}`],
      ],
    };
  },
};

// ---- simplifying expressions ---------------------------------------------------

type SimplifyKind = 'combine' | 'distribute' | 'both';

export interface SimplifyParams {
  [k: string]: unknown;
  kinds: SimplifyKind[];
}

export const simplifyExpressions: GeneratorDef<SimplifyParams> = {
  id: 'simplifyExpressions',
  name: 'Simplify expressions',
  skill: 'Expressions & equations',
  description: 'Combine like terms and use the distributive property, including negatives, and write the result as ax + b.',
  defaults: { kinds: ['combine', 'distribute', 'both'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'combine', label: 'Combine like terms (4x + 7 − 2x − 3)' },
        { value: 'distribute', label: 'Distribute (−3(x − 4))' },
        { value: 'both', label: 'Both (2(x + 3) − 5x)' },
      ],
    },
  ],
  presets: [{ id: 'all', label: 'Combine like terms & distribute', params: { kinds: ['combine', 'distribute', 'both'] } }],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['combine'] as SimplifyKind[]));
    const term = (c: number, first: boolean, v = 'x') => {
      const body = Math.abs(c) === 1 && v ? v : `${Math.abs(c)}${v}`;
      return first ? `${c < 0 ? MINUS : ''}${body}` : ` ${c < 0 ? MINUS : '+'} ${body}`;
    };
    let text: string;
    let coef: number;
    let constant: number;
    let steps: string[];
    if (kind === 'combine') {
      const [a, b, d] = [nonZero(rng, -9, 9), nonZero(rng, -12, 12), nonZero(rng, -12, 12)];
      let c = nonZero(rng, -9, 9);
      if (a + c === 0) c = c > 0 ? c + 1 : c - 1; // keep an x term in the answer
      text = term(a, true) + term(b, false, '') + term(c, false) + term(d, false, '');
      [coef, constant] = [a + c, b + d];
      steps = [`x terms: ${sn(a)}x and ${sn(c)}x make ${sn(a + c)}x`, `Numbers: ${sn(b)} and ${sn(d)} make ${sn(b + d)}`];
    } else if (kind === 'distribute') {
      const [a, b] = [nonZero(rng, -9, 9), nonZero(rng, -12, 12)];
      text = `${sn(a)}(${linear(1, b)})`;
      [coef, constant] = [a, a * b];
      steps = [`Multiply ${sn(a)} by each term inside: ${sn(a)} × x = ${sn(a)}x and ${sn(a)} × ${sn(b)} = ${sn(a * b)}`];
    } else {
      const [a, b] = [nonZero(rng, 2, 6), nonZero(rng, -9, 9)];
      let c = nonZero(rng, -9, 9);
      if (a + c === 0) c -= 1;
      text = `${a}(${linear(1, b)})${term(c, false)}`;
      [coef, constant] = [a + c, a * b];
      steps = [`Distribute: ${a}(${linear(1, b)}) = ${linear(a, a * b)}`, `Combine the x terms: ${a}x and ${sn(c)}x make ${sn(a + c)}x`];
    }
    const result = linear(coef, constant);
    return {
      prompt: [`Simplify:  ${text}.  Write it as  (number)x + (number).`],
      input: { kind: 'multi', fields: ['Number in front of x', 'Number on its own'] },
      answer: { kind: 'multi', values: [String(coef), String(constant)] },
      answerText: [result],
      hint: ['Like terms have the same variable part. Distribute first, then add the x terms together and the plain numbers together. Use a negative number when the term is subtracted.'],
      explanation: [...steps.map((s) => [s]), [`${text} = ${result}`]],
    };
  },
};

// ---- circles ---------------------------------------------------------------------

export interface CircleParams {
  [k: string]: unknown;
  asks: ('area' | 'circumference')[];
}

export const circles: GeneratorDef<CircleParams> = {
  id: 'circles',
  name: 'Circles',
  skill: 'Geometry',
  description: 'Area and circumference of a circle from its radius or diameter, using π ≈ 3.14.',
  defaults: { asks: ['area', 'circumference'] },
  fields: [
    {
      key: 'asks',
      label: 'Find the',
      type: 'multi',
      options: [
        { value: 'area', label: 'Area (πr²)' },
        { value: 'circumference', label: 'Circumference (πd)' },
      ],
    },
  ],
  presets: [{ id: 'both', label: 'Area & circumference', params: { asks: ['area', 'circumference'] } }],
  generate(p, rng) {
    const ask = rng.pick(p.asks.length ? p.asks : (['area'] as const));
    const pi = F(314, 100);
    const r = rng.int(1, 15);
    const giveDiameter = rng.bool();
    const unit = rng.pick(['cm', 'in', 'm', 'ft']);
    const given = giveDiameter ? `a diameter of ${2 * r} ${unit}` : `a radius of ${r} ${unit}`;
    const v = ask === 'area' ? pi.mul(F(r * r)) : pi.mul(F(2 * r));
    return {
      prompt: [`A circle has ${given}. What is its ${ask === 'area' ? `area (in square ${unit})` : `circumference (in ${unit})`}? Use 3.14 for π.`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString(), form: 'decimal' },
      answerText: [`${decimalText(v)} ${ask === 'area' ? `square ${unit}` : unit}`],
      hint: [ask === 'area' ? 'Area = π × radius × radius. The radius is half the diameter.' : 'Circumference = π × diameter. The diameter is twice the radius.'],
      explanation:
        ask === 'area'
          ? [...(giveDiameter ? [[`Radius = ${2 * r} ÷ 2 = ${r}`]] : []), [`r² = ${r} × ${r} = ${r * r}`], [`3.14 × ${r * r} = ${decimalText(v)}`]]
          : [...(giveDiameter ? [] : [[`Diameter = 2 × ${r} = ${2 * r}`]]), [`3.14 × ${2 * r} = ${decimalText(v)}`]],
    };
  },
};

// ---- angles ------------------------------------------------------------------------

type AngleKind = 'complementary' | 'supplementary' | 'vertical' | 'triangle';

export interface AngleParams {
  [k: string]: unknown;
  kinds: AngleKind[];
}

export const angles: GeneratorDef<AngleParams> = {
  id: 'angles',
  name: 'Angle relationships',
  skill: 'Geometry',
  description: 'Complementary, supplementary and vertical angles, and the missing angle of a triangle.',
  defaults: { kinds: ['complementary', 'supplementary', 'vertical', 'triangle'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'complementary', label: 'Complementary (add to 90°)' },
        { value: 'supplementary', label: 'Supplementary (add to 180°)' },
        { value: 'vertical', label: 'Vertical angles (equal)' },
        { value: 'triangle', label: 'Missing angle in a triangle' },
      ],
    },
  ],
  presets: [{ id: 'all', label: 'Angle relationships', params: { kinds: ['complementary', 'supplementary', 'vertical', 'triangle'] } }],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['supplementary'] as AngleKind[]));
    if (kind === 'triangle') {
      const a = rng.int(20, 100);
      const b = rng.int(15, 160 - a);
      const c = 180 - a - b;
      return {
        prompt: [`Two angles of a triangle are ${a}° and ${b}°. What is the third angle (in degrees)?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(c) },
        answerText: [`${c}°`],
        hint: ['The three angles of any triangle add up to 180°.'],
        explanation: [[`${a} + ${b} = ${a + b}`], [`180 − ${a + b} = ${c}`], [`The third angle is ${c}°.`]],
      };
    }
    if (kind === 'vertical') {
      const a = rng.int(20, 160);
      return {
        prompt: [`Two lines cross. One of the angles they make is ${a}°. What is the angle directly across from it (its vertical angle), in degrees?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(a) },
        answerText: [`${a}°`],
        hint: ['Vertical angles are across from each other where two lines cross. They are always equal.'],
        explanation: [[`Vertical angles are equal, so it is ${a}° too.`], [`(The angles next to it are 180 − ${a} = ${180 - a}°.)`]],
      };
    }
    const total = kind === 'complementary' ? 90 : 180;
    const a = rng.int(10, total - 10);
    return {
      prompt: [`Two angles are ${kind}. One is ${a}°. What is the other one (in degrees)?`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(total - a) },
      answerText: [`${total - a}°`],
      hint: [`${kind === 'complementary' ? 'Complementary' : 'Supplementary'} angles add up to ${total}°.`],
      explanation: [[`${total} − ${a} = ${total - a}`], [`The other angle is ${total - a}°.`]],
    };
  },
};

// ---- probability ----------------------------------------------------------------------

type ProbKind = 'single' | 'not' | 'expected';

export interface ProbabilityParams {
  [k: string]: unknown;
  kinds: ProbKind[];
}

const COLORS = ['red', 'blue', 'green', 'yellow'];

export const probability: GeneratorDef<ProbabilityParams> = {
  id: 'probability',
  name: 'Probability',
  skill: 'Statistics',
  description: 'Probability of an event as a fraction, the probability it doesn’t happen, and expected counts over many tries.',
  defaults: { kinds: ['single', 'not', 'expected'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'single', label: 'Probability of picking a color' },
        { value: 'not', label: 'Probability of NOT picking a color' },
        { value: 'expected', label: 'About how many times in many tries' },
      ],
    },
  ],
  presets: [{ id: 'all', label: 'Simple probability', params: { kinds: ['single', 'not', 'expected'] } }],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['single'] as ProbKind[]));
    const colors = rng.shuffle(COLORS).slice(0, 3);
    const counts = colors.map(() => rng.int(1, 9));
    const total = counts.reduce((a, b) => a + b, 0);
    const bag = colors.map((c, i) => `${counts[i]} ${c}`).join(', ');
    const target = rng.int(0, 2);
    const pr = F(counts[target], total);
    const prompt = `A bag has ${bag} marbles. You pick one without looking.`;
    if (kind === 'expected') {
      const tries = total * rng.int(2, 10);
      const expect = pr.mul(F(tries));
      return {
        prompt: [`${prompt} You put it back and do this ${tries} times. About how many times should you expect to pick ${colors[target]}?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: expect.toString() },
        answerText: [String(expect.n)],
        hint: ['Find the probability of picking that color, then multiply by the number of tries.'],
        explanation: [[`P(${colors[target]}) = `, toExpr(F(counts[target], total), 'fraction'), ` (${counts[target]} out of ${total})`], [`${tries} × ${counts[target]}/${total} = ${expect.n}`]],
      };
    }
    const not = kind === 'not';
    const v = not ? F(1).sub(pr) : pr;
    const raw = not ? total - counts[target] : counts[target];
    return {
      prompt: [`${prompt} What is the probability that it is ${not ? 'NOT ' : ''}${colors[target]}? (Write it as a fraction.)`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString() },
      answerText: [toExpr(v, 'fraction')],
      hint: [not ? `Count the marbles that are not ${colors[target]}, out of all the marbles.` : `Probability = how many ${colors[target]} ÷ how many marbles in all.`],
      explanation: [
        [`There are ${total} marbles in all.`],
        [`${raw} of them ${not ? `are not ${colors[target]}` : `are ${colors[target]}`}, so the probability is `, { t: 'frac', neg: false, n: raw, d: total }],
        ...(F(raw, total).d !== total ? [['Simplified: ', toExpr(v, 'fraction')] as Rich] : []),
      ],
    };
  },
};
