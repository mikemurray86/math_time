import { F, type Fraction } from '../fraction.ts';
import { decimalText, toExpr, type Expr } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const money = (v: Fraction) => `$${v.toNumber().toFixed(2)}`;
const dec = (v: Fraction): Expr => toExpr(v, 'decimal');

// ---- ratios and rates -------------------------------------------------------

const THINGS: [string, string][] = [
  ['red marbles', 'blue marbles'],
  ['cups of flour', 'cups of sugar'],
  ['boys', 'girls'],
  ['cats', 'dogs'],
  ['scoops of lemonade mix', 'cups of water'],
];
const RATES: { per: string; one: string; what: string; money: boolean }[] = [
  { per: 'notebooks', one: 'notebook', what: 'cost', money: true },
  { per: 'pounds of apples', one: 'pound of apples', what: 'cost', money: true },
  { per: 'hours', one: 'hour', what: 'miles driven', money: false },
  { per: 'minutes', one: 'minute', what: 'pages read', money: false },
  { per: 'boxes', one: 'box', what: 'cookies', money: false },
];

type RatioKind = 'equivalent' | 'unitRate' | 'scale';

export interface RatioParams {
  [k: string]: unknown;
  kinds: RatioKind[];
}

export const ratios: GeneratorDef<RatioParams> = {
  id: 'ratios',
  name: 'Ratios & rates',
  skill: 'Ratios & percents',
  description: 'Equivalent ratios, unit rates and unit prices, and using a rate to find a new amount.',
  defaults: { kinds: ['equivalent', 'unitRate', 'scale'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'equivalent', label: 'Equivalent ratios (3 : 5 = ? : 20)' },
        { value: 'unitRate', label: 'Unit rate ($12 for 4 → ? for 1)' },
        { value: 'scale', label: 'Use a rate ($12 for 4 → ? for 7)' },
      ],
    },
  ],
  presets: [
    { id: 'all', label: 'Equivalent ratios, unit rates & using rates', params: { kinds: ['equivalent', 'unitRate', 'scale'] } },
    { id: 'equivalent', label: 'Equivalent ratios', params: { kinds: ['equivalent'] } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['equivalent'] as RatioKind[]));

    if (kind === 'equivalent') {
      let [a, b] = [rng.int(1, 9), rng.int(2, 12)];
      const g = gcd(a, b);
      [a, b] = [a / g, b / g];
      if (a === b) b += 1;
      const k = rng.int(2, 9);
      const [things1, things2] = rng.pick(THINGS);
      const askFirst = rng.bool();
      const known = askFirst ? b * k : a * k;
      const ans = askFirst ? a * k : b * k;
      return {
        prompt: [
          `The ratio of ${things1} to ${things2} is ${a} : ${b}. `,
          askFirst ? `If there are ${known} ${things2}, how many ${things1} are there?` : `If there are ${known} ${things1}, how many ${things2} are there?`,
        ],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(ans) },
        answerText: [String(ans)],
        hint: [`What did ${askFirst ? b : a} get multiplied by to make ${known}? Multiply the other part by the same number.`],
        explanation: [[`${askFirst ? b : a} × ${k} = ${known}`], [`So ${askFirst ? a : b} × ${k} = ${ans}`], [`${a} : ${b} = ${a * k} : ${b * k}`]],
      };
    }

    const r = rng.pick(RATES);
    const n = rng.int(2, 9);
    const unit = r.money ? F(rng.int(50, 900), 100) : F(rng.int(3, 60));
    const total = unit.mul(F(n));
    const amt = (v: Fraction) => (r.money ? money(v) : decimalText(v));
    const given = r.money ? `${n} ${r.per} cost ${amt(total)}` : `there are ${amt(total)} ${r.what} in ${n} ${r.per}`;
    const cap = given[0].toUpperCase() + given.slice(1);

    if (kind === 'unitRate') {
      return {
        prompt: [`${cap}. ${r.money ? `How much does 1 ${r.one} cost (in dollars)` : `How many ${r.what} is that per ${r.one}`}?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: unit.toString(), form: 'decimal' },
        answerText: [r.money ? money(unit) : dec(unit)],
        hint: ['A unit rate is the amount for just 1. Divide the total by how many.'],
        explanation: [[`${amt(total)} ÷ ${n} = ${amt(unit)}`], [`That’s ${amt(unit)} for each 1.`]],
      };
    }

    let m = rng.int(2, 12);
    if (m === n) m += 1;
    const v = unit.mul(F(m));
    return {
      prompt: [`${cap}. At the same rate, ${r.money ? `how much do ${m} ${r.per} cost (in dollars)` : `how many ${r.what} is that in ${m} ${r.per}`}?`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString(), form: 'decimal' },
      answerText: [r.money ? money(v) : dec(v)],
      hint: ['Find the amount for 1 first (the unit rate), then multiply.'],
      explanation: [[`For 1: ${amt(total)} ÷ ${n} = ${amt(unit)}`], [`For ${m}: ${amt(unit)} × ${m} = ${amt(v)}`]],
    };
  },
};

// ---- percents -----------------------------------------------------------------

type PercentKind = 'of' | 'whole' | 'convert';

export interface PercentParams {
  [k: string]: unknown;
  kinds: PercentKind[];
}

const NICE = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];

export const percent: GeneratorDef<PercentParams> = {
  id: 'percent',
  name: 'Percents',
  skill: 'Ratios & percents',
  description: 'Find a percent of a number, find the whole from a part and a percent, and write percents as fractions or decimals.',
  defaults: { kinds: ['of', 'whole', 'convert'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'of', label: 'Percent of a number (30% of 80)' },
        { value: 'whole', label: 'Find the whole (12 is 25% of ?)' },
        { value: 'convert', label: 'Percent ↔ fraction or decimal' },
      ],
    },
  ],
  presets: [
    { id: 'all', label: 'Percent of a number, the whole & converting', params: { kinds: ['of', 'whole', 'convert'] } },
    { id: 'of', label: 'Percent of a number', params: { kinds: ['of'] } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['of'] as PercentKind[]));
    const pct = rng.pick(NICE);
    const asFrac = F(pct, 100);

    if (kind === 'convert') {
      const toDecimal = rng.bool();
      return toDecimal
        ? {
            prompt: [`Write ${pct}% as a decimal.`],
            input: { kind: 'number' },
            answer: { kind: 'number', value: asFrac.toString(), form: 'decimal' },
            answerText: [dec(asFrac)],
            hint: ['Percent means “out of 100.” Divide by 100: move the decimal point two places left.'],
            explanation: [[`${pct}% = ${pct}/100 = ${decimalText(asFrac)}`]],
          }
        : {
            prompt: [`Write ${pct}% as a fraction in simplest form.`],
            input: { kind: 'number' },
            answer: { kind: 'number', value: asFrac.toString(), form: 'fraction' },
            answerText: [toExpr(asFrac, 'fraction')],
            hint: ['Percent means “out of 100.” Write it over 100, then simplify.'],
            explanation: [[`${pct}% = `, { t: 'frac', neg: false, n: pct, d: 100 }], ['Simplify: ', toExpr(asFrac, 'fraction')]],
          };
    }

    // a whole that makes the part a whole number
    const whole = asFrac.d * rng.int(1, Math.max(1, Math.floor(200 / asFrac.d)));
    const part = asFrac.mul(F(whole));
    const tenPct = F(whole, 10);
    if (kind === 'of') {
      return {
        prompt: [`What is ${pct}% of ${whole}?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: part.toString() },
        answerText: [dec(part)],
        hint: [pct % 10 === 0 ? `Find 10% first (divide by 10), then multiply.` : `${pct}% is the fraction ${asFrac.toString()}. Find that fraction of ${whole}.`],
        explanation:
          pct % 10 === 0
            ? [[`10% of ${whole} = ${decimalText(tenPct)}`], [`${pct}% = ${pct / 10} × 10%, so ${pct / 10} × ${decimalText(tenPct)} = ${decimalText(part)}`]]
            : [[`${pct}% = `, toExpr(asFrac, 'fraction')], [`${whole} ÷ ${asFrac.d} × ${asFrac.n} = ${decimalText(part)}`]],
      };
    }
    return {
      prompt: [`${decimalText(part)} is ${pct}% of what number?`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(whole) },
      answerText: [String(whole)],
      hint: [`${pct}% is ${asFrac.toString()} of the whole. If ${asFrac.n === 1 ? `1 part is ${decimalText(part)}` : `${asFrac.n} parts make ${decimalText(part)}`}, how much are all ${asFrac.d} parts?`],
      explanation: [
        [`${pct}% = `, toExpr(asFrac, 'fraction'), `, so the whole is split into ${asFrac.d} equal parts.`],
        [`One part: ${decimalText(part)} ÷ ${asFrac.n} = ${decimalText(part.div(F(asFrac.n)))}`],
        [`All ${asFrac.d} parts: ${decimalText(part.div(F(asFrac.n)))} × ${asFrac.d} = ${whole}`],
      ],
    };
  },
};
