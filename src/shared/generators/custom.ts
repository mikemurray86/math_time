// "Your own question": a parent-written template, e.g. from a recent test.
// The whole template lives in the bank entry's params, so every quiz keeps the exact version it used.
import { Fraction, F } from '../fraction.ts';
import { isTerminating, toExpr, type NumStyle, type Rich } from '../expr.ts';
import { DrawError, FormulaError, RESERVED, evaluate, namesIn, parseFormula, type Node } from '../formula.ts';
import { Rng } from '../rng.ts';
import type { GeneratorDef, Question } from '../types.ts';

export type VarDef =
  | { name: string; type: 'whole'; min: number; max: number; step: number }
  | { name: string; type: 'decimal'; min: number; max: number; places: number }
  | { name: string; type: 'fraction'; min: number; max: number; dens: number[]; style: 'fraction' | 'mixed' }
  | { name: string; type: 'calc'; formula: string }
  | { name: string; type: 'words'; options: string[] };

export interface AnswerDef {
  label: string;
  formula: string;
  suffix: string;
}

export interface CustomParams {
  [k: string]: unknown;
  text: string;
  vars: VarDef[];
  where: string[];
  answers: AnswerDef[];
  form: 'any' | 'fraction' | 'decimal';
  hint: string;
  steps: string[];
}

const MAX_TRIES = 200; // draws per question before giving up
const DEFAULT_HINT = 'Read the question again. What is it asking you to find?';

// ---- compiling: parse every formula and placeholder, and check what each one may use ----

type Piece = string | { src: string; node: Node };
interface Compiled {
  vars: (VarDef & { node?: Node })[];
  where: Node[];
  answers: Node[];
  text: Piece[];
  hint: Piece[];
  steps: Piece[][];
}

const answerNames = (n: number) => ['answer', ...Array.from({ length: n }, (_, i) => `answer${i + 1}`)];

function parseIn(src: string, place: string, allowed: Set<string>, words: Set<string> = new Set()): Node {
  try {
    const node = parseFormula(src);
    for (const name of namesIn(node)) {
      if (words.has(name) && node.k === 'name') continue; // a word placeholder, like {name}
      if (words.has(name)) throw new FormulaError(`“${name}” is a list of words, so it can’t be used in math`);
      if (/^answer\d?$/.test(name) && !allowed.has(name)) throw new FormulaError(`“${name}” can only be used in the steps`);
      if (!allowed.has(name)) throw new FormulaError(`“${name}” isn’t defined${place.startsWith('Number') ? ' above it' : ''}`);
    }
    return node;
  } catch (e) {
    if (e instanceof FormulaError) throw new FormulaError(`${place}: ${e.message}`);
    throw e;
  }
}

function pieces(tpl: string, place: string, allowed: Set<string>, words: Set<string>): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of tpl.matchAll(/\{([^{}]*)\}/g)) {
    out.push(tpl.slice(last, m.index));
    out.push({ src: m[1], node: parseIn(m[1], place, allowed, words) });
    last = m.index! + m[0].length;
  }
  out.push(tpl.slice(last));
  if (out.some((p) => typeof p === 'string' && /[{}]/.test(p))) throw new FormulaError(`${place}: a { is missing its } (or the other way around)`);
  return out.filter((p) => p !== '');
}

function compile(p: CustomParams): Compiled {
  const numeric = new Set<string>();
  const words = new Set<string>();
  const vars = p.vars.map((v) => {
    if (v.type === 'words') {
      words.add(v.name);
      return v;
    }
    const node = v.type === 'calc' ? parseIn(v.formula, `Number “${v.name}”`, numeric, words) : undefined;
    numeric.add(v.name);
    return { ...v, node };
  });
  const both = new Set([...numeric, ...words]);
  const withAnswers = new Set([...both, ...answerNames(p.answers.length)]);
  return {
    vars,
    where: p.where.map((w, i) => parseIn(w, `Rule ${i + 1}`, numeric, words)),
    answers: p.answers.map((a, i) => parseIn(a.formula, p.answers.length > 1 ? `Answer ${i + 1}` : 'Answer', numeric, words)),
    text: pieces(p.text, 'Question', both, words),
    hint: pieces(p.hint, 'Hint', both, words),
    steps: p.steps.map((s, i) => pieces(s, `Step ${i + 1}`, withAnswers, words)),
  };
}

// ---- drawing numbers ----

const asNumber = (v: Fraction | boolean, src: string): Fraction => {
  if (typeof v === 'boolean') throw new FormulaError(`{${src}} is a yes/no rule, not a number`);
  return v;
};

/** Pick values for every variable; null when a rule says no. */
function draw(c: Compiled, rng: Rng): { env: Record<string, Fraction>; words: Record<string, string> } | null {
  const env: Record<string, Fraction> = {};
  const words: Record<string, string> = {};
  for (const v of c.vars) {
    switch (v.type) {
      case 'whole':
        env[v.name] = F(v.min + v.step * rng.int(0, Math.floor((v.max - v.min) / v.step)));
        break;
      case 'decimal': {
        const s = 10 ** v.places;
        env[v.name] = F(rng.int(Math.round(v.min * s), Math.round(v.max * s)), s);
        break;
      }
      case 'fraction': {
        const d = rng.pick(v.dens);
        const lo = Math.ceil(v.min * d - 1e-9);
        const hi = Math.floor(v.max * d + 1e-9);
        if (lo > hi) return null;
        let n = rng.int(lo, hi);
        for (let i = 0; i < 6 && n % d === 0 && hi - lo > 0; i++) n = rng.int(lo, hi); // prefer a real fraction
        env[v.name] = F(n, d);
        break;
      }
      case 'calc':
        env[v.name] = asNumber(evaluate(v.node!, env), v.formula);
        break;
      case 'words':
        words[v.name] = rng.pick(v.options);
        break;
    }
  }
  for (const w of c.where) {
    const ok = evaluate(w, env);
    if (typeof ok !== 'boolean') throw new FormulaError('A rule must compare things, like a > b');
    if (!ok) return null;
  }
  return { env, words };
}

/** How computed numbers are written: like the template's own numbers. */
function displayStyle(p: CustomParams): NumStyle {
  if (p.form === 'decimal') return 'decimal';
  const frac = p.vars.find((v) => v.type === 'fraction');
  if (frac?.type === 'fraction') return frac.style;
  if (p.form === 'fraction') return 'fraction';
  return p.vars.some((v) => v.type === 'decimal') ? 'decimal' : 'mixed';
}

function varStyle(v: VarDef | undefined, fallback: NumStyle): NumStyle {
  if (v?.type === 'decimal') return 'decimal';
  if (v?.type === 'fraction') return v.style;
  return fallback;
}

/** One attempt at a question; null when the numbers didn't work out. */
function attempt(p: CustomParams, c: Compiled, rng: Rng): Question | null {
  try {
    const d = draw(c, rng);
    if (!d) return null;
    const values = c.answers.map((n, i) => asNumber(evaluate(n, d.env), p.answers[i].formula));
    if (p.form === 'decimal' && values.some((v) => !isTerminating(v))) return null;

    const style = displayStyle(p);
    const env = { ...d.env };
    answerNames(values.length).forEach((name, i) => (env[name] = values[Math.max(0, i - 1)]));
    const render = (ps: Piece[]): Rich =>
      ps.map((x) => {
        if (typeof x === 'string') return x;
        if (x.node.k === 'name' && x.node.name in d.words) return d.words[x.node.name];
        const own = x.node.k === 'name' ? p.vars.find((v) => v.name === (x.node as { name: string }).name) : undefined;
        return toExpr(asNumber(evaluate(x.node, env), x.src), varStyle(own, style));
      });
    const withSuffix = (v: Fraction, a: AnswerDef): Rich => (a.suffix ? [toExpr(v, style), ` ${a.suffix}`] : [toExpr(v, style)]);
    const answerText: Rich =
      values.length === 1
        ? withSuffix(values[0], p.answers[0])
        : values.flatMap((v, i) => [...(i ? ['; '] : []), `${p.answers[i].label}: `, ...withSuffix(v, p.answers[i])]);

    const single = values.length === 1;
    const form = p.form === 'decimal' || (p.form === 'fraction' && !values[0].isInt()) ? p.form : undefined;
    return {
      prompt: render(c.text),
      input: single ? { kind: 'number' } : { kind: 'multi', fields: p.answers.map((a) => a.label) },
      answer: single
        ? { kind: 'number', value: values[0].toString(), ...(form ? { form } : {}) }
        : { kind: 'multi', values: values.map(String) },
      answerText,
      hint: c.hint.length ? render(c.hint) : [DEFAULT_HINT],
      explanation: c.steps.length ? c.steps.map(render) : [['The answer is ', ...answerText, '.']],
    };
  } catch (e) {
    if (e instanceof DrawError) return null;
    throw e;
  }
}

// ---- cleaning up what the editor sends ----

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown) => (Array.isArray(v) ? v : []);
const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const roundTo = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

function cleanVar(raw: unknown, seen: Set<string>): VarDef {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = str(r.name, 12);
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new FormulaError(`“${name}” can’t be a name. Use letters, like a or apples.`);
  if (RESERVED.has(name) || /^answer\d?$/.test(name)) throw new FormulaError(`“${name}” is a reserved word. Pick another name.`);
  if (seen.has(name)) throw new FormulaError(`There are two numbers named “${name}”`);
  seen.add(name);
  const minMax = (lo: number, hi: number, places: number) => {
    const a = roundTo(clamp(r.min, lo, hi, 1), places);
    const b = roundTo(clamp(r.max, lo, hi, 10), places);
    return a <= b ? [a, b] : [b, a];
  };
  switch (r.type) {
    case 'decimal': {
      const places = Math.round(clamp(r.places, 1, 3, 1));
      const [min, max] = minMax(-1e6, 1e6, places);
      return { name, type: 'decimal', min, max, places };
    }
    case 'fraction': {
      const [min, max] = minMax(-1000, 1000, 6);
      const dens = [...new Set(list(r.dens).map((d) => Math.round(Number(d))).filter((d) => d >= 2 && d <= 100))].slice(0, 10);
      if (!dens.length) throw new FormulaError(`“${name}” needs at least one denominator`);
      return { name, type: 'fraction', min, max, dens, style: r.style === 'fraction' ? 'fraction' : 'mixed' };
    }
    case 'calc':
      return { name, type: 'calc', formula: str(r.formula, 120) };
    case 'words': {
      const options = list(r.options).map((o) => str(o, 30)).filter(Boolean).slice(0, 12);
      if (!options.length) throw new FormulaError(`“${name}” needs at least one word`);
      return { name, type: 'words', options };
    }
    default: {
      const [min, max] = minMax(-1e6, 1e6, 0);
      return { name, type: 'whole', min, max, step: Math.round(clamp(r.step, 1, 1e6, 1)) };
    }
  }
}

function sanitize(raw: unknown): CustomParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const vars = list(r.vars).slice(0, 8).map((v) => cleanVar(v, seen));
  const answers = list(r.answers).slice(0, 4).map((a, i, all): AnswerDef => {
    const x = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
    return { label: str(x.label, 30) || (all.length > 1 ? `Answer ${i + 1}` : ''), formula: str(x.formula, 120), suffix: str(x.suffix, 20) };
  });
  const p: CustomParams = {
    text: str(r.text, 600),
    vars,
    where: list(r.where).map((w) => str(w, 120)).filter(Boolean).slice(0, 6),
    answers: answers.length ? answers : [{ label: '', formula: '', suffix: '' }],
    form: r.form === 'fraction' || r.form === 'decimal' ? r.form : 'any',
    hint: str(r.hint, 300),
    steps: list(r.steps).map((s) => str(s, 200)).filter(Boolean).slice(0, 8),
  };
  if (!p.text) throw new FormulaError('Type the question first');
  compile(p); // throws a message for the parent if anything doesn't parse
  return p;
}

/** Try a run of quizzes' worth of questions, so a template that can't work is caught when it's saved, not mid-quiz. */
function validate(p: CustomParams) {
  const c = compile(p);
  let tries = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const rng = new Rng(seed * 7919);
    let q: Question | null = null;
    while (!q && tries < 30 * 10) {
      tries++;
      q = attempt(p, c, rng);
    }
    if (!q) {
      throw new FormulaError(
        p.form === 'decimal'
          ? 'The answer often doesn’t come out as a decimal that ends. Try different numbers or rules.'
          : 'Most numbers don’t fit the rules (or divide by zero). Try wider ranges or fewer rules.',
      );
    }
  }
}

const preset = (id: string, label: string, params: CustomParams) => ({ id, label, params });

const stickers = preset('stickers', 'Word problem: stickers left', {
  text: '{name} has {a} stickers and gives {b} of them to friends. How many stickers does {name} have left?',
  vars: [
    { name: 'name', type: 'words', options: ['Maria', 'Jamal', 'Priya', 'Leo', 'Sofia'] },
    { name: 'a', type: 'whole', min: 20, max: 90, step: 1 },
    { name: 'b', type: 'whole', min: 5, max: 40, step: 1 },
  ],
  where: ['b < a'],
  answers: [{ label: '', formula: 'a - b', suffix: 'stickers' }],
  form: 'any',
  hint: 'Giving some away means taking away. Subtract.',
  steps: ['{a} − {b} = {answer}', '{name} has {answer} stickers left.'],
});

export const custom: GeneratorDef<CustomParams> = {
  id: 'custom',
  name: 'Your own question',
  skill: 'From tests',
  description: 'Type a question (for example, from a recent test) with {placeholders} for the numbers. Every quiz picks new numbers in the ranges you set.',
  defaults: stickers.params,
  fields: [],
  presets: [
    stickers,
    preset('recipe', 'Fractions: recipe times batches', {
      text: 'A recipe uses {cups} cups of flour. How many cups do you need for {batches} batches?',
      vars: [
        { name: 'cups', type: 'fraction', min: 0.25, max: 2.5, dens: [2, 3, 4], style: 'mixed' },
        { name: 'batches', type: 'whole', min: 2, max: 6, step: 1 },
      ],
      where: [],
      answers: [{ label: '', formula: 'cups * batches', suffix: 'cups' }],
      form: 'any',
      hint: 'Every batch needs the same amount, so multiply.',
      steps: ['{cups} × {batches} = {answer}'],
    }),
    preset('missing-side', 'Area: find the missing side', {
      text: 'A rectangle has an area of {area} square feet. Its width is {w} feet. What is its length?',
      vars: [
        { name: 'w', type: 'whole', min: 2, max: 12, step: 1 },
        { name: 'l', type: 'whole', min: 2, max: 15, step: 1 },
        { name: 'area', type: 'calc', formula: 'w * l' },
      ],
      where: ['l != w'],
      answers: [{ label: '', formula: 'area / w', suffix: 'feet' }],
      form: 'any',
      hint: 'Area = length × width. Divide the area by the width.',
      steps: ['{area} ÷ {w} = {answer}', 'The length is {answer} feet.'],
    }),
    preset('teams', 'Two answers: teams and left over', {
      text: '{n} students are split into teams of {size}. How many full teams are there, and how many students are left over?',
      vars: [
        { name: 'n', type: 'whole', min: 20, max: 99, step: 1 },
        { name: 'size', type: 'whole', min: 3, max: 9, step: 1 },
      ],
      where: ['not whole(n / size)'],
      answers: [
        { label: 'Full teams', formula: 'floor(n / size)', suffix: '' },
        { label: 'Left over', formula: 'n - size * floor(n / size)', suffix: '' },
      ],
      form: 'any',
      hint: 'Divide. The quotient is the full teams, and the remainder is who’s left over.',
      steps: ['{n} ÷ {size} = {answer1} R {answer2}', '{answer1} full teams, with {answer2} students left over.'],
    }),
  ],
  sanitize,
  validate,
  generate(p, rng) {
    const c = compile(p);
    for (let i = 0; i < MAX_TRIES; i++) {
      const q = attempt(p, c, rng);
      if (q) return q;
    }
    throw new FormulaError('Couldn’t find numbers that fit this question’s rules. Try wider ranges or fewer rules.');
  },
};
