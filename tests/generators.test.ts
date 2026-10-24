import { describe, expect, it } from 'vitest';
import { GENERATORS, buildQuestion, sanitizeParams } from '../src/shared/registry.ts';
import { grade } from '../src/shared/grade.ts';
import { Fraction, F } from '../src/shared/fraction.ts';
import { exprValue, richText } from '../src/shared/expr.ts';
import type { Question } from '../src/shared/types.ts';

const SEEDS = Array.from({ length: 1000 }, (_, i) => i * 7919 + 13);

const correctResponse = (q: Question) => {
  const a = q.answer;
  if (a.kind === 'order') return { ids: a.ids };
  if (a.kind === 'choice') return { id: a.id };
  if (a.kind === 'number') return { value: a.value };
  return { x: a.x, y: a.y };
};

const onStep = (v: string, step: string) => {
  const q = Fraction.parse(v)!.div(Fraction.parse(step)!);
  return q.isInt();
};

describe.each(Object.values(GENERATORS))('$id', (gen) => {
  const presets = [{ id: 'defaults', params: gen.defaults }, ...gen.presets];

  it.each(presets)('preset $id: deterministic, self-consistent, gradeable', ({ params }) => {
    for (const seed of SEEDS) {
      const q = buildQuestion(gen.id, params, seed);
      expect(buildQuestion(gen.id, params, seed)).toEqual(q);
      expect(grade(q.answer, correctResponse(q))).toBe(true);
      expect(richText(q.prompt)).not.toMatch(/undefined|NaN/);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('presets survive sanitizing unchanged', () => {
    for (const p of gen.presets) expect(sanitizeParams(gen, p.params)).toEqual(p.params);
  });
});

describe('orderNumbers constraints', () => {
  it('uses distinct values, every requested form, both signs, and a correct order', () => {
    for (const preset of GENERATORS.orderNumbers.presets) {
      for (const seed of SEEDS) {
        const q = buildQuestion('orderNumbers', preset.params, seed);
        if (q.input.kind !== 'order' || q.answer.kind !== 'order') throw new Error('wrong kind');
        const items = q.input.items;
        expect(items).toHaveLength(preset.params.count as number);
        const vals = items.map((i) => exprValue(i.expr));
        expect(new Set(vals.map(String)).size).toBe(vals.length);
        expect(vals.some((v) => v.sign() < 0) && vals.some((v) => v.sign() > 0)).toBe(true);
        const byId = new Map(items.map((i) => [i.id, exprValue(i.expr)]));
        const ordered = q.answer.ids.map((id) => byId.get(id)!);
        const dir = q.input.direction === 'asc' ? 1 : -1;
        for (let i = 1; i < ordered.length; i++) expect(ordered[i].cmp(ordered[i - 1])).toBe(dir);
        // shown order is never already solved
        expect(items.map((i) => i.id)).not.toEqual(q.answer.ids);
      }
    }
  });

  it('includes each chosen form when count allows', () => {
    const params = { ...GENERATORS.orderNumbers.defaults, forms: ['improper', 'abs', 'decimal'], count: 5 };
    for (const seed of SEEDS.slice(0, 200)) {
      const q = buildQuestion('orderNumbers', params, seed);
      if (q.input.kind !== 'order') throw new Error();
      const kinds = q.input.items.map((i) => (i.expr.t === 'neg' ? 'abs' : i.expr.t));
      expect(kinds).toContain('abs');
      expect(kinds).toContain('dec');
    }
  });
});

describe('coordinate constraints', () => {
  it.each(['plotPoint', 'readPoint'])('%s points sit on the grid step, inside the grid, off whole numbers when fractional', (id) => {
    for (const preset of GENERATORS[id].presets) {
      const p = preset.params as { range: number; coordType: string; bothNonInteger: boolean; quadrants: number[] };
      for (const seed of SEEDS) {
        const q = buildQuestion(id, p, seed);
        if (q.answer.kind !== 'pair' || !('grid' in q.input) || !q.input.grid) throw new Error();
        const { x, y } = q.answer;
        const step = q.input.grid.step;
        expect(onStep(x, step) && onStep(y, step)).toBe(true);
        const fx = Fraction.parse(x)!, fy = Fraction.parse(y)!;
        expect(fx.abs().cmp(F(p.range))).toBeLessThan(0);
        expect(fy.abs().cmp(F(p.range))).toBeLessThan(0);
        if (p.coordType !== 'integer') {
          if (p.bothNonInteger) expect(!fx.isInt() && !fy.isInt()).toBe(true);
          else expect(!fx.isInt() || !fy.isInt()).toBe(true);
        }
      }
    }
  });
});

describe('distanceSameLine constraints', () => {
  it('crosses the axis exactly when the preset says so, and the distance is right', () => {
    for (const crossAxis of ['always', 'never'] as const) {
      for (const coordType of ['integer', 'half', 'quarter'] as const) {
        const params = { ...GENERATORS.distanceSameLine.defaults, crossAxis, coordType, range: 5 };
        for (const seed of SEEDS) {
          const q = buildQuestion('distanceSameLine', params, seed);
          // pull A and B back out of the prompt-independent grid by rebuilding with showGrid
          const g = buildQuestion('distanceSameLine', { ...params, showGrid: true }, seed);
          if (g.input.kind !== 'number' || !g.input.grid || q.answer.kind !== 'number') throw new Error();
          const [A, B] = g.input.grid.points.map((pt) => ({ x: Fraction.parse(pt.x)!, y: Fraction.parse(pt.y)! }));
          const horizontal = A.y.eq(B.y);
          expect(horizontal || A.x.eq(B.x)).toBe(true);
          const [a, b] = horizontal ? [A.x, B.x] : [A.y, B.y];
          expect(a.sign() * b.sign()).toBe(crossAxis === 'always' ? -1 : 1);
          expect(Fraction.parse(q.answer.value)!.eq(a.sub(b).abs())).toBe(true);
          if (coordType !== 'integer') expect(!a.isInt() || !b.isInt()).toBe(true);
        }
      }
    }
  });
});

describe('grade', () => {
  it('accepts equivalent forms and rejects wrong ones', () => {
    expect(grade({ kind: 'number', value: '-3/2' }, { value: '-1.5' })).toBe(true);
    expect(grade({ kind: 'number', value: '-3/2' }, { value: '-1 1/2' })).toBe(true);
    expect(grade({ kind: 'number', value: '-3/2' }, { value: '1.5' })).toBe(false);
    expect(grade({ kind: 'pair', x: '5/2', y: '-1/4' }, { x: '2.5', y: '-0.25' })).toBe(true);
    expect(grade({ kind: 'order', ids: ['a', 'b'] }, { ids: ['b', 'a'] })).toBe(false);
    expect(grade({ kind: 'choice', id: 'lt' }, null)).toBe(false);
  });
});
