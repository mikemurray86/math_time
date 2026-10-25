import { describe, expect, it } from 'vitest';
import { DrawError, FormulaError, evaluate, namesIn, parseFormula } from '../src/shared/formula.ts';
import { F, type Fraction } from '../src/shared/fraction.ts';

const calc = (src: string, env: Record<string, Fraction> = {}) => {
  const v = evaluate(parseFormula(src), env);
  return typeof v === 'boolean' ? v : v.toString();
};

describe('formula', () => {
  it('does exact arithmetic with the usual order of operations', () => {
    expect(calc('1/3 + 1/6')).toBe('1/2');
    expect(calc('2 + 3 * 4')).toBe('14');
    expect(calc('(2 + 3) * 4')).toBe('20');
    expect(calc('-2^2')).toBe('-4');
    expect(calc('2^-2')).toBe('1/4');
    expect(calc('0.1 + 0.2')).toBe('3/10');
    expect(calc('10 - 4 - 3')).toBe('3');
    expect(calc('a × b ÷ 2', { a: F(3), b: F(4) })).toBe('6');
  });

  it('has functions', () => {
    expect(calc('abs(-7/2)')).toBe('7/2');
    expect(calc('floor(17 / 5)')).toBe('3');
    expect(calc('floor(-1/2)')).toBe('-1');
    expect(calc('round(5/2)')).toBe('3');
    expect(calc('gcd(12, 18)')).toBe('6');
    expect(calc('lcm(4, 6)')).toBe('12');
    expect(calc('min(3, 1/2, 2)')).toBe('1/2');
    expect(calc('max(3, 1/2, 2)')).toBe('3');
    expect(calc('whole(12 / 4)')).toBe(true);
  });

  it('compares and combines rules', () => {
    expect(calc('a > b and not whole(a / b)', { a: F(7), b: F(2) })).toBe(true);
    expect(calc('a = b or a <= 1', { a: F(2), b: F(3) })).toBe(false);
    expect(calc('a != b', { a: F(2), b: F(3) })).toBe(true);
  });

  it('lists the names it uses', () => {
    expect([...namesIn(parseFormula('a * (b + max(c, 2))'))]).toEqual(['a', 'b', 'c']);
  });

  it('explains mistakes in what was typed', () => {
    expect(() => parseFormula('(a + b')).toThrow(FormulaError);
    expect(() => parseFormula('a +')).toThrow(/ends too early/);
    expect(() => parseFormula('a $ b')).toThrow(/“\$”/);
    expect(() => parseFormula('')).toThrow(/empty/);
    expect(() => parseFormula('gcd(4)')).toThrow(/needs 2 numbers/);
    expect(() => calc('c + 1')).toThrow(/“c” isn’t defined/);
    expect(() => calc('(1 > 0) + 1')).toThrow(FormulaError);
  });

  it('treats bad numbers as a draw to retry, not a mistake', () => {
    expect(() => calc('1 / (2 - 2)')).toThrow(DrawError);
    expect(() => calc('gcd(1/2, 3)')).toThrow(DrawError);
  });
});
