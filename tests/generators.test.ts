import { describe, expect, it } from 'vitest';
import { GENERATORS, buildQuestion, sanitizeParams } from '../src/shared/registry.ts';
import { grade } from '../src/shared/grade.ts';
import { Fraction, F } from '../src/shared/fraction.ts';
import { decimalText, exprValue, richText, type Expr } from '../src/shared/expr.ts';
import type { Question } from '../src/shared/types.ts';

const SEEDS = Array.from({ length: 1000 }, (_, i) => i * 7919 + 13);

const correctResponse = (q: Question) => {
  const a = q.answer;
  if (a.kind === 'order') return { ids: a.ids };
  if (a.kind === 'choice') return { id: a.id };
  if (a.kind === 'number') return { value: a.form === 'decimal' ? decimalText(Fraction.parse(a.value)!) : a.value };
  if (a.kind === 'multi') return { values: a.values };
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
        if (preset.params.positiveOnly) expect(vals.every((v) => v.sign() > 0)).toBe(true);
        else expect(vals.some((v) => v.sign() < 0) && vals.some((v) => v.sign() > 0)).toBe(true);
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

// ---- 4th grade ----

const promptInts = (q: Question): number[] => {
  const out: number[] = [];
  const walk = (e: Expr) => {
    if (e.t === 'int') out.push(e.v);
    else if (e.t === 'op') [e.l, e.r].forEach(walk);
  };
  for (const p of q.prompt) if (typeof p !== 'string') walk(p);
  return out;
};

describe('4th grade constraints', () => {
  it('multiplication answers are the product, with the right number of digits', () => {
    for (const { params } of GENERATORS.multiplyWhole.presets) {
      const [da, db] = String(params.shape).split('x').map(Number);
      for (const seed of SEEDS) {
        const q = buildQuestion('multiplyWhole', params, seed);
        const [a, b] = promptInts(q);
        expect(String(a)).toHaveLength(da);
        expect(String(b)).toHaveLength(db);
        expect(q.answer).toEqual({ kind: 'number', value: String(a * b) });
      }
    }
  });

  it('division: quotient × divisor + remainder = dividend, remainder < divisor', () => {
    for (const { params } of GENERATORS.divideWhole.presets) {
      for (const seed of SEEDS) {
        const q = buildQuestion('divideWhole', params, seed);
        const [dividend, d] = promptInts(q);
        expect(String(dividend)).toHaveLength(params.dividendDigits as number);
        const [quot, rem] = q.answer.kind === 'multi' ? q.answer.values.map(Number) : [Number((q.answer as { value: string }).value), 0];
        expect(quot * d + rem).toBe(dividend);
        expect(rem).toBeLessThan(d);
        if (params.remainder === 'always') expect(rem).toBeGreaterThan(0);
        if (params.remainder === 'never') expect(q.answer.kind).toBe('number');
      }
    }
  });

  it('rounding and digit values are right', () => {
    for (const seed of SEEDS) {
      const q = buildQuestion('placeValue', { digits: 5, task: 'mixed' }, seed);
      const [num] = promptInts(q);
      const text = richText(q.prompt);
      const ans = Number((q.answer as { value: string }).value);
      const m = text.match(/nearest (ten thousand|thousand|hundred|ten)\./);
      if (m) {
        const unit = { ten: 10, hundred: 100, thousand: 1000, 'ten thousand': 10000 }[m[1]]!;
        expect(ans).toBe(Math.round(num / unit) * unit);
      } else {
        const digit = text.match(/digit (\d)/)![1];
        expect(String(num).split(digit)).toHaveLength(2); // the digit appears once
        expect(String(ans)[0]).toBe(digit);
      }
    }
  });

  it('decimal/fraction answers must be written in the asked form', () => {
    expect(grade({ kind: 'number', value: '7/10', form: 'fraction' }, { value: '0.7' })).toBe(false);
    expect(grade({ kind: 'number', value: '7/10', form: 'fraction' }, { value: '70/100' })).toBe(true);
    expect(grade({ kind: 'number', value: '307/100', form: 'decimal' }, { value: '3.07' })).toBe(true);
    expect(grade({ kind: 'number', value: '307/100', form: 'decimal' }, { value: '3 7/100' })).toBe(false);
    expect(grade({ kind: 'multi', values: ['12', '3'] }, { values: ['12', '3'] })).toBe(true);
    expect(grade({ kind: 'multi', values: ['12', '3'] }, { values: ['12', '0'] })).toBe(false);
    expect(grade({ kind: 'number', value: '47382' }, { value: '47,382' })).toBe(true);
  });

  it('positive-only comparisons never show negatives', () => {
    const params = GENERATORS.compareNumbers.presets.find((p) => p.id === 'positive-fractions')!.params;
    for (const seed of SEEDS) {
      const q = buildQuestion('compareNumbers', params, seed);
      if (q.input.kind !== 'choice') throw new Error();
      expect(exprValue(q.input.left!).sign()).toBeGreaterThanOrEqual(0);
      expect(exprValue(q.input.right!).sign()).toBeGreaterThanOrEqual(0);
    }
  });

  it('factor and multiple questions have exactly one right choice', () => {
    for (const seed of SEEDS) {
      const q = buildQuestion('factorsMultiples', GENERATORS.factorsMultiples.defaults, seed);
      if (q.input.kind !== 'choice' || q.answer.kind !== 'choice') throw new Error();
      const text = richText(q.prompt);
      const n = promptInts(q)[0];
      const right = q.input.options.filter((o) =>
        text.includes('factor of') ? n % Number(o.id) === 0 : text.includes('multiple of') ? Number(o.id) % n === 0 : o.id === (q.answer as { id: string }).id,
      );
      expect(right.map((o) => o.id)).toEqual([q.answer.id]);
    }
  });
});

describe('custom templates', () => {
  const gen = GENERATORS.custom;
  const presetParams = (id: string) => gen.presets.find((p) => p.id === id)!.params;

  it('follows its rules and works out the answer from the drawn numbers', () => {
    for (const seed of SEEDS) {
      const q = buildQuestion('custom', presetParams('stickers'), seed);
      const [a, b] = richText(q.prompt).match(/\d+/g)!.map(Number);
      expect(b).toBeLessThan(a);
      expect(q.answer).toEqual({ kind: 'number', value: String(a - b) });
    }
  });

  it('asks for several numbers with labeled boxes', () => {
    const q = buildQuestion('custom', presetParams('teams'), 5);
    expect(q.input).toEqual({ kind: 'multi', fields: ['Full teams', 'Left over'] });
    const [n, size] = richText(q.prompt).match(/\d+/g)!.map(Number);
    expect(q.answer).toEqual({ kind: 'multi', values: [String(Math.floor(n / size)), String(n % size)] });
    expect(n % size).not.toBe(0);
  });

  it('writes numbers in the form the template uses', () => {
    const q = buildQuestion('custom', presetParams('recipe'), 3);
    expect(q.prompt.some((p) => typeof p !== 'string' && (p.t === 'mixed' || p.t === 'frac' || p.t === 'int'))).toBe(true);
    const dec = { ...presetParams('recipe'), vars: [{ name: 'cups', type: 'decimal', min: 0.5, max: 3, places: 1 }, { name: 'batches', type: 'whole', min: 2, max: 6, step: 1 }] };
    for (const seed of SEEDS.slice(0, 100)) {
      const p = buildQuestion('custom', dec, seed).prompt;
      expect(p.some((x) => typeof x !== 'string' && (x.t === 'frac' || x.t === 'mixed'))).toBe(false);
    }
  });

  it('only asks for a fraction form when the answer is one', () => {
    const params = { ...presetParams('stickers'), form: 'fraction' };
    expect(buildQuestion('custom', params, 1).answer).not.toHaveProperty('form');
  });

  it('explains template mistakes in plain words', () => {
    const base = presetParams('stickers');
    const bad = (patch: object) => () => gen.validate!(sanitizeParams(gen, { ...base, ...patch }) as never);
    expect(bad({ text: 'How many {apples}?' })).toThrow(/Question: “apples” isn’t defined/);
    expect(bad({ text: 'What is {answer}?' })).toThrow(/only be used in the steps/);
    expect(bad({ text: 'Oops {a' })).toThrow(/missing its }/);
    expect(bad({ answers: [{ label: '', formula: 'a - ', suffix: '' }] })).toThrow(/Answer:/);
    expect(bad({ answers: [{ label: '', formula: 'name + 1', suffix: '' }] })).toThrow(/list of words/);
    expect(bad({ where: ['a > 1000'] })).toThrow(/don’t fit the rules/);
    expect(bad({ vars: [...base.vars as object[], { name: 'a', type: 'whole', min: 1, max: 2 }] })).toThrow(/two numbers named “a”/);
    expect(bad({ vars: [{ name: 'and', type: 'whole', min: 1, max: 2 }] })).toThrow(/reserved/);
    expect(bad({ text: '' })).toThrow(/Type the question/);
    expect(bad({ form: 'decimal', answers: [{ label: '', formula: 'a / 3', suffix: '' }], where: ['not whole(a / 3)'] })).toThrow(/decimal/);
  });

  it('a calc can only use numbers above it', () => {
    const vars = [{ name: 'area', type: 'calc', formula: 'w * 2' }, { name: 'w', type: 'whole', min: 1, max: 5 }];
    expect(() => sanitizeParams(gen, { ...presetParams('missing-side'), vars })).toThrow(/Number “area”: “w” isn’t defined above it/);
  });
});
