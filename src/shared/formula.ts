// Tiny formula language for parent-written question templates: exact Fraction math, never eval.
//   numbers, names, + - * / ^, ( ), abs min max gcd lcm floor round whole,
//   and for rules: < <= > >= == != and or not
import { Fraction, F } from './fraction.ts';

export type Value = Fraction | boolean;

export type Node =
  | { k: 'num'; v: Fraction }
  | { k: 'name'; name: string }
  | { k: 'neg'; e: Node }
  | { k: 'not'; e: Node }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'call'; fn: string; args: Node[] };

/** A mistake in what the parent typed. Shown to them as-is (statusCode makes it a 400). */
export class FormulaError extends Error {
  readonly statusCode = 400;
}

/** The numbers didn't work out this time (divide by zero, too big). The template tries new numbers. */
export class DrawError extends Error {}

const FUNCS: Record<string, [min: number, max: number]> = {
  abs: [1, 1], floor: [1, 1], round: [1, 1], whole: [1, 1], gcd: [2, 2], lcm: [2, 2], min: [1, 8], max: [1, 8],
};
export const RESERVED = new Set([...Object.keys(FUNCS), 'and', 'or', 'not']);

type Tok = { t: 'num' | 'name' | 'op'; s: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    let m: RegExpMatchArray | null;
    if (/^\s/.test(rest)) i++;
    else if ((m = rest.match(/^\d+(\.\d+)?/))) {
      out.push({ t: 'num', s: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      out.push({ t: 'name', s: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^(<=|>=|==|!=|[-+*/^(),<>=])/))) {
      out.push({ t: 'op', s: m[0] === '=' ? '==' : m[0] });
      i += m[0].length;
    } else throw new FormulaError(`“${rest[0]}” can’t be used in a formula`);
  }
  return out;
}

export function parseFormula(src: string): Node {
  const toks = tokenize(src);
  if (!toks.length) throw new FormulaError('A formula is empty');
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (...ops: string[]) => peek()?.t === 'op' && ops.includes(peek().s);
  const isWord = (w: string) => peek()?.t === 'name' && peek().s === w;
  const expect = (op: string) => {
    if (!isOp(op)) throw new FormulaError(`Missing “${op}” in ${src}`);
    pos++;
  };

  const or = (): Node => {
    let l = and();
    while (isWord('or')) {
      pos++;
      l = { k: 'bin', op: 'or', l, r: and() };
    }
    return l;
  };
  const and = (): Node => {
    let l = not();
    while (isWord('and')) {
      pos++;
      l = { k: 'bin', op: 'and', l, r: not() };
    }
    return l;
  };
  const not = (): Node => {
    if (isWord('not')) {
      pos++;
      return { k: 'not', e: not() };
    }
    return compare();
  };
  const compare = (): Node => {
    const l = sum();
    if (isOp('<', '<=', '>', '>=', '==', '!=')) {
      const op = toks[pos++].s;
      return { k: 'bin', op, l, r: sum() };
    }
    return l;
  };
  const sum = (): Node => {
    let l = product();
    while (isOp('+', '-')) {
      const op = toks[pos++].s;
      l = { k: 'bin', op, l, r: product() };
    }
    return l;
  };
  const product = (): Node => {
    let l = unary();
    while (isOp('*', '/')) {
      const op = toks[pos++].s;
      l = { k: 'bin', op, l, r: unary() };
    }
    return l;
  };
  const unary = (): Node => {
    if (isOp('-')) {
      pos++;
      return { k: 'neg', e: unary() };
    }
    if (isOp('+')) pos++;
    return power();
  };
  const power = (): Node => {
    const base = primary();
    if (isOp('^')) {
      pos++;
      return { k: 'bin', op: '^', l: base, r: unary() };
    }
    return base;
  };
  const primary = (): Node => {
    const t = peek();
    if (!t) throw new FormulaError(`${src} ends too early`);
    if (t.t === 'num') {
      pos++;
      return { k: 'num', v: Fraction.parse(t.s) ?? F(0) };
    }
    if (t.t === 'name') {
      pos++;
      if (FUNCS[t.s]) {
        expect('(');
        const args = [or()];
        while (isOp(',')) {
          pos++;
          args.push(or());
        }
        expect(')');
        const [min, max] = FUNCS[t.s];
        if (args.length < min || args.length > max) throw new FormulaError(`${t.s}() needs ${min === max ? min : `${min} to ${max}`} number${max > 1 ? 's' : ''}`);
        return { k: 'call', fn: t.s, args };
      }
      if (RESERVED.has(t.s)) throw new FormulaError(`“${t.s}” is in the wrong place in ${src}`);
      return { k: 'name', name: t.s };
    }
    if (t.s === '(') {
      pos++;
      const e = or();
      expect(')');
      return e;
    }
    throw new FormulaError(`“${t.s}” is in the wrong place in ${src}`);
  };

  const node = or();
  if (pos < toks.length) throw new FormulaError(`“${toks[pos].s}” is in the wrong place in ${src}`);
  return node;
}

/** Every name a formula uses. */
export function namesIn(n: Node, out = new Set<string>()): Set<string> {
  if (n.k === 'name') out.add(n.name);
  else if (n.k === 'neg' || n.k === 'not') namesIn(n.e, out);
  else if (n.k === 'bin') {
    namesIn(n.l, out);
    namesIn(n.r, out);
  } else if (n.k === 'call') n.args.forEach((a) => namesIn(a, out));
  return out;
}

const num = (v: Value): Fraction => {
  if (typeof v === 'boolean') throw new FormulaError('A yes/no rule (like a > b) is used where a number belongs');
  return v;
};
const bool = (v: Value): boolean => {
  if (typeof v !== 'boolean') throw new FormulaError('A number is used where a yes/no rule (like a > b) belongs');
  return v;
};
const int = (v: Fraction, fn: string): number => {
  if (!v.isInt()) throw new DrawError(`${fn}() needs whole numbers`);
  return Math.abs(v.n);
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function evaluate(n: Node, env: Record<string, Fraction>): Value {
  try {
    return evalNode(n, env);
  } catch (e) {
    if (e instanceof FormulaError || e instanceof DrawError) throw e;
    throw new DrawError((e as Error).message); // Fraction overflow or divide by zero
  }
}

function evalNode(n: Node, env: Record<string, Fraction>): Value {
  switch (n.k) {
    case 'num':
      return n.v;
    case 'name': {
      const v = env[n.name];
      if (!v) throw new FormulaError(`“${n.name}” isn’t defined`);
      return v;
    }
    case 'neg':
      return num(evalNode(n.e, env)).neg();
    case 'not':
      return !bool(evalNode(n.e, env));
    case 'call': {
      const args = n.args.map((a) => num(evalNode(a, env)));
      const [a, b] = args;
      switch (n.fn) {
        case 'abs':
          return a.abs();
        case 'floor':
          return F(Math.floor(a.n / a.d));
        case 'round':
          return F(Math.floor((2 * a.n + a.d) / (2 * a.d))); // halves round up
        case 'whole':
          return a.isInt();
        case 'gcd':
          return F(gcd(int(a, 'gcd'), int(b, 'gcd')));
        case 'lcm': {
          const [x, y] = [int(a, 'lcm'), int(b, 'lcm')];
          return F(x && y ? (x / gcd(x, y)) * y : 0);
        }
        case 'min':
          return args.reduce((m, v) => (v.cmp(m) < 0 ? v : m));
        default:
          return args.reduce((m, v) => (v.cmp(m) > 0 ? v : m));
      }
    }
    case 'bin': {
      if (n.op === 'and') return bool(evalNode(n.l, env)) && bool(evalNode(n.r, env));
      if (n.op === 'or') return bool(evalNode(n.l, env)) || bool(evalNode(n.r, env));
      const l = num(evalNode(n.l, env));
      const r = num(evalNode(n.r, env));
      switch (n.op) {
        case '+':
          return l.add(r);
        case '-':
          return l.sub(r);
        case '*':
          return l.mul(r);
        case '/':
          if (r.n === 0) throw new DrawError('divide by zero');
          return l.div(r);
        case '^': {
          if (!r.isInt() || Math.abs(r.n) > 12) throw new DrawError('powers must be whole numbers up to 12');
          let out = F(1);
          for (let i = 0; i < Math.abs(r.n); i++) out = out.mul(l);
          if (r.n < 0) {
            if (out.n === 0) throw new DrawError('divide by zero');
            out = F(1).div(out);
          }
          return out;
        }
        case '<':
          return l.cmp(r) < 0;
        case '<=':
          return l.cmp(r) <= 0;
        case '>':
          return l.cmp(r) > 0;
        case '>=':
          return l.cmp(r) >= 0;
        case '==':
          return l.eq(r);
        default:
          return !l.eq(r);
      }
    }
  }
}
