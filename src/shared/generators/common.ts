import { Fraction, F } from '../fraction.ts';
import { toExpr, type Expr, type NumStyle } from '../expr.ts';
import type { Rng } from '../rng.ts';
import type { ParamField } from '../types.ts';

// ---- coordinates -------------------------------------------------------

export type CoordType = 'integer' | 'half' | 'quarter' | 'third' | 'tenth';

export const STEPS: Record<CoordType, number> = { integer: 1, half: 2, quarter: 4, third: 3, tenth: 10 };

export const coordStep = (t: CoordType): Fraction => F(1, STEPS[t]);

export interface CoordOpts {
  sign?: 1 | -1;
  nonZero?: boolean;
  nonInteger?: boolean;
  /** Avoid the grid edge so labels stay readable. */
  margin?: boolean;
}

/** A random value on the coordinate grid's step within [-range, range]. */
export function randomCoord(rng: Rng, type: CoordType, range: number, opts: CoordOpts = {}): Fraction {
  const m = STEPS[type];
  const max = range * m - (opts.margin ? 1 : 0);
  for (;;) {
    let k = rng.int(-max, max);
    if (opts.sign && Math.sign(k) !== opts.sign) k = -k;
    if ((opts.nonZero || opts.sign) && k === 0) continue;
    if (opts.nonInteger && m > 1 && k % m === 0) continue;
    return F(k, m);
  }
}

export const coordFields: ParamField[] = [
  { key: 'range', label: 'Grid size (± from 0)', type: 'select', options: [2, 3, 5, 10].map((v) => ({ value: v, label: `±${v}` })) },
  {
    key: 'coordType',
    label: 'Coordinate values',
    type: 'select',
    options: [
      { value: 'integer', label: 'Whole numbers' },
      { value: 'half', label: 'Halves (½)' },
      { value: 'quarter', label: 'Quarters (¼)' },
      { value: 'third', label: 'Thirds (⅓)' },
      { value: 'tenth', label: 'Tenths (0.1)' },
    ],
  },
  {
    key: 'style',
    label: 'Write non-whole values as',
    type: 'select',
    options: [
      { value: 'mixed', label: 'Mixed numbers (2½)' },
      { value: 'fraction', label: 'Fractions (5/2)' },
      { value: 'decimal', label: 'Decimals (2.5)' },
    ],
  },
];

// ---- number forms for ordering / comparing ----------------------------

export type NumberForm = 'integer' | 'fraction' | 'improper' | 'mixed' | 'decimal' | 'abs';

export const numberFormOptions: { value: NumberForm; label: string }[] = [
  { value: 'integer', label: 'Integers (−4, 7)' },
  { value: 'fraction', label: 'Proper fractions (3/4)' },
  { value: 'improper', label: 'Improper fractions (7/3)' },
  { value: 'mixed', label: 'Mixed numbers (2⅓)' },
  { value: 'decimal', label: 'Decimals (−1.5)' },
  { value: 'abs', label: 'Absolute values (|−3|)' },
];

const coprimeNumerator = (rng: Rng, lo: number, hi: number, d: number): number | null => {
  for (let tries = 0; tries < 50; tries++) {
    const n = rng.int(lo, hi);
    if (n % d !== 0 && F(n, d).d === d) return n;
  }
  return null;
};

/** One displayable number of the given form whose value lies in [lo, hi]. */
export function makeNumber(rng: Rng, form: NumberForm, lo: number, hi: number, maxDen: number): Expr {
  const maxAbs = Math.max(Math.abs(lo), Math.abs(hi));
  const inWindow = (e: Expr) => {
    const v = valueOfSimple(e);
    return v.cmp(F(lo)) >= 0 && v.cmp(F(hi)) <= 0;
  };
  for (let tries = 0; tries < 500; tries++) {
    let e: Expr | null = null;
    const neg = rng.bool();
    switch (form) {
      case 'integer':
        e = { t: 'int', v: rng.int(lo, hi) };
        break;
      case 'fraction': {
        const d = rng.int(2, maxDen);
        const n = coprimeNumerator(rng, 1, d - 1, d);
        if (n) e = { t: 'frac', neg, n, d };
        break;
      }
      case 'improper':
      case 'mixed': {
        const d = rng.int(2, maxDen);
        const n = coprimeNumerator(rng, d + 1, Math.max(d + 1, maxAbs * d), d);
        if (n) e = toExpr(F(neg ? -n : n, d), form === 'mixed' ? 'mixed' : 'fraction');
        break;
      }
      case 'decimal': {
        const den = rng.bool(0.75) ? 10 : 4;
        const k = rng.int(lo * den, hi * den);
        if (k % den !== 0) e = toExpr(F(k, den), 'decimal');
        break;
      }
      case 'abs': {
        const inner = makeNumber(rng, rng.pick(['integer', 'integer', 'fraction', 'decimal'] as const), -maxAbs, maxAbs, maxDen);
        const abs: Expr = { t: 'abs', e: inner };
        e = rng.bool(0.3) ? { t: 'neg', e: abs } : abs;
        break;
      }
    }
    if (e && inWindow(e)) return e;
  }
  // Windows are always wide enough in practice; fall back to an integer.
  return { t: 'int', v: rng.int(lo, hi) };
}

function valueOfSimple(e: Expr): Fraction {
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
      return valueOfSimple(e.e).abs();
    case 'neg':
      return valueOfSimple(e.e).neg();
    case 'op':
      throw new Error('not simple');
  }
}

/** How a value reads as a decimal in explanations. */
export function decimalExpr(v: Fraction): Expr | string {
  const e = toExpr(v, 'decimal');
  return e.t === 'frac' || e.t === 'mixed' ? `about ${v.toNumber().toFixed(2).replace('-', '−')}` : e;
}

export const letters = 'ABCDEFGHIJ';
