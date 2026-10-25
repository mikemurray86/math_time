// Displayable math: numbers keep the form they were written in (improper
// fraction, mixed number, decimal, |x|) even though they compare by value.
import { Fraction, F } from './fraction.ts';

export type Expr =
  | { t: 'int'; v: number }
  | { t: 'frac'; neg: boolean; n: number; d: number }
  | { t: 'mixed'; neg: boolean; w: number; n: number; d: number }
  | { t: 'dec'; text: string; v: string }
  | { t: 'abs'; e: Expr }
  | { t: 'neg'; e: Expr }
  | { t: 'op'; op: '+' | '-' | '×' | '÷'; l: Expr; r: Expr };

/** A line of text with math mixed in. */
export type Rich = Array<string | Expr>;

/** How non-integer values are written. */
export type NumStyle = 'fraction' | 'mixed' | 'decimal';

export function isTerminating(f: Fraction): boolean {
  let d = f.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

export function decimalText(f: Fraction): string {
  let k = 0;
  while (k < 8 && (10 ** k) % f.d !== 0) k++;
  if ((10 ** k) % f.d !== 0) return f.toNumber().toFixed(2);
  const scaled = Math.abs(f.n) * ((10 ** k) / f.d);
  let digits = String(scaled).padStart(k + 1, '0');
  if (k > 0) digits = `${digits.slice(0, -k)}.${digits.slice(-k)}`;
  return (f.n < 0 ? '-' : '') + digits;
}

export function toExpr(f: Fraction, style: NumStyle = 'mixed'): Expr {
  if (f.isInt()) return { t: 'int', v: f.n };
  if (style === 'decimal' && isTerminating(f)) {
    return { t: 'dec', text: decimalText(f), v: f.toString() };
  }
  const neg = f.n < 0;
  const n = Math.abs(f.n);
  if (style === 'mixed' && n > f.d) {
    return { t: 'mixed', neg, w: Math.floor(n / f.d), n: n % f.d, d: f.d };
  }
  return { t: 'frac', neg, n, d: f.d };
}

export function exprValue(e: Expr): Fraction {
  switch (e.t) {
    case 'int':
      return F(e.v);
    case 'frac':
      return F(e.neg ? -e.n : e.n, e.d);
    case 'mixed':
      return F((e.neg ? -1 : 1) * (e.w * e.d + e.n), e.d);
    case 'dec':
      return Fraction.parse(e.v)!;
    case 'abs':
      return exprValue(e.e).abs();
    case 'neg':
      return exprValue(e.e).neg();
    case 'op': {
      const [l, r] = [exprValue(e.l), exprValue(e.r)];
      return e.op === '+' ? l.add(r) : e.op === '-' ? l.sub(r) : e.op === '×' ? l.mul(r) : l.div(r);
    }
  }
}

const MINUS = '−';

/** 47382 → "47,382" (four-digit numbers stay plain, as in school: 4382). */
export const groupDigits = (n: number) => (Math.abs(n) >= 10000 ? Math.abs(n).toLocaleString('en-US') : String(Math.abs(n)));

/** Plain-text rendering, used for aria labels and logs. */
export function exprText(e: Expr): string {
  switch (e.t) {
    case 'int':
      return (e.v < 0 ? MINUS : '') + groupDigits(e.v);
    case 'frac':
      return `${e.neg ? MINUS : ''}${e.n}/${e.d}`;
    case 'mixed':
      return `${e.neg ? MINUS : ''}${e.w} ${e.n}/${e.d}`;
    case 'dec':
      return e.text.replace('-', MINUS);
    case 'abs':
      return `|${exprText(e.e)}|`;
    case 'neg':
      return `${MINUS}${exprText(e.e)}`;
    case 'op': {
      const r = exprText(e.r);
      return `${exprText(e.l)} ${e.op === '-' ? MINUS : e.op} ${isNegativeLiteral(e.r) ? `(${r})` : r}`;
    }
  }
}

export function isNegativeLiteral(e: Expr): boolean {
  return (e.t === 'int' && e.v < 0) || ((e.t === 'frac' || e.t === 'mixed') && e.neg) || (e.t === 'dec' && e.text.startsWith('-')) || e.t === 'neg';
}

export function richText(r: Rich): string {
  return r.map((p) => (typeof p === 'string' ? p : exprText(p))).join('');
}

export function pointRich(label: string, x: Fraction, y: Fraction, style: NumStyle): Rich {
  return [`${label}(`, toExpr(x, style), ', ', toExpr(y, style), ')'];
}
