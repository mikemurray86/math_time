import { describe, expect, it } from 'vitest';
import { Fraction, F } from '../src/shared/fraction.ts';
import { decimalText, exprText, exprValue, toExpr } from '../src/shared/expr.ts';

describe('Fraction', () => {
  it('normalizes sign and reduces', () => {
    expect(F(4, -6).toString()).toBe('-2/3');
    expect(F(0, -5).toString()).toBe('0');
  });

  it.each([
    ['-1.5', '-3/2'], ['-3/2', '-3/2'], ['-1 1/2', '-3/2'], ['−1½', '-3/2'], [' 7 ', '7'],
    ['.25', '1/4'], ['-0.75', '-3/4'], ['6/4', '3/2'], ['+2', '2'], ['- 3', '-3'], ['2 3/4', '11/4'],
  ])('parses %s', (raw, expected) => {
    expect(Fraction.parse(raw)?.toString()).toBe(expected);
  });

  it.each(['', 'abc', '1/0', '1..2', '3/', '1 2', '--1', '1e5'])('rejects %s', (raw) => {
    expect(Fraction.parse(raw)).toBeNull();
  });

  it('compares exactly', () => {
    expect(F(1, 3).add(F(1, 6)).eq(F(1, 2))).toBe(true);
    expect(F(-7, 3).cmp(F(-2))).toBe(-1);
  });
});

describe('expr', () => {
  it('formats in each style', () => {
    expect(exprText(toExpr(F(-7, 2), 'mixed'))).toBe('−3 1/2');
    expect(exprText(toExpr(F(-7, 2), 'fraction'))).toBe('−7/2');
    expect(exprText(toExpr(F(-7, 2), 'decimal'))).toBe('−3.5');
    expect(exprText(toExpr(F(1, 3), 'decimal'))).toBe('1/3'); // non-terminating falls back
    expect(decimalText(F(-1, 20))).toBe('-0.05');
  });

  it('round-trips values', () => {
    for (const f of [F(-9, 4), F(5), F(1, 10), F(-2, 3)]) {
      for (const s of ['mixed', 'fraction', 'decimal'] as const) expect(exprValue(toExpr(f, s)).eq(f)).toBe(true);
    }
  });
});
