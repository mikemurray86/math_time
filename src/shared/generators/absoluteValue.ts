import { exprValue, toExpr, type Expr, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import { makeNumber, type NumberForm } from './common.ts';

type Shape = 'single' | 'negated' | 'sum' | 'difference' | 'inside';

export interface AbsParams {
  [k: string]: unknown;
  range: number;
  forms: NumberForm[];
  maxDen: number;
  shapes: Shape[];
}

export const absoluteValue: GeneratorDef<AbsParams> = {
  id: 'absoluteValue',
  name: 'Absolute value',
  skill: 'Absolute value',
  description: 'Evaluate expressions with absolute value bars.',
  defaults: { range: 12, forms: ['integer'], maxDen: 4, shapes: ['negated', 'sum', 'difference', 'inside'] },
  fields: [
    { key: 'range', label: 'Largest size (±)', type: 'int', min: 3, max: 50 },
    {
      key: 'forms',
      label: 'Kinds of numbers',
      type: 'multi',
      options: [
        { value: 'integer', label: 'Integers' },
        { value: 'fraction', label: 'Fractions' },
        { value: 'decimal', label: 'Decimals' },
      ],
    },
    { key: 'maxDen', label: 'Largest denominator', type: 'int', min: 2, max: 10 },
    {
      key: 'shapes',
      label: 'Expression types',
      type: 'multi',
      options: [
        { value: 'single', label: '|a|' },
        { value: 'negated', label: '−|a|' },
        { value: 'sum', label: '|a| + |b|' },
        { value: 'difference', label: '|a| − |b|' },
        { value: 'inside', label: '|a − b|' },
      ],
    },
  ],
  presets: [
    { id: 'int-mix', label: 'Integers, all expression types', params: { range: 12, forms: ['integer'], maxDen: 4, shapes: ['negated', 'sum', 'difference', 'inside'] } },
    { id: 'rational', label: 'Fractions & decimals', params: { range: 6, forms: ['fraction', 'decimal'], maxDen: 4, shapes: ['single', 'negated', 'sum', 'difference'] } },
  ],
  generate(p, rng) {
    const forms = p.forms.length ? p.forms : (['integer'] as NumberForm[]);
    const shape = rng.pick(p.shapes.length ? p.shapes : (['single'] as Shape[]));
    const form = rng.pick(forms);
    const num = (negative?: boolean): Expr => {
      for (;;) {
        const e = makeNumber(rng, form === 'fraction' ? rng.pick(['fraction', 'improper'] as const) : form, -p.range, p.range, p.maxDen);
        const v = exprValue(e);
        if (v.sign() === 0) continue;
        if (negative !== undefined && (v.sign() < 0) !== negative) continue;
        return e;
      }
    };
    const abs = (e: Expr): Expr => ({ t: 'abs', e });

    let expr: Expr;
    switch (shape) {
      case 'single':
        expr = abs(num(rng.bool(0.8)));
        break;
      case 'negated':
        expr = { t: 'neg', e: abs(num(rng.bool(0.7))) };
        break;
      case 'sum':
        expr = { t: 'op', op: '+', l: abs(num(true)), r: abs(num()) };
        break;
      case 'difference':
        expr = { t: 'op', op: '-', l: abs(num()), r: abs(num(true)) };
        break;
      case 'inside':
        expr = abs({ t: 'op', op: '-', l: num(), r: num() });
        break;
    }

    const style = form === 'decimal' ? 'decimal' : 'mixed';
    const value = exprValue(expr);
    const v = (e: Expr) => toExpr(exprValue(e), style);
    const steps: Rich[] = [];
    if (expr.t === 'abs' && expr.e.t === 'op') {
      steps.push(['Work inside the bars first: ', expr.e, '  =  ', v(expr.e)]);
      steps.push(['Then take the absolute value: |', v(expr.e), '|  =  ', toExpr(value, style)]);
    } else if (expr.t === 'op') {
      steps.push(['Find each absolute value: ', expr.l, ' = ', v(expr.l), ',  ', expr.r, ' = ', v(expr.r)]);
      steps.push([v(expr.l), expr.op === '+' ? ' + ' : ' − ', v(expr.r), '  =  ', toExpr(value, style)]);
    } else if (expr.t === 'neg') {
      steps.push(['First the bars: ', expr.e, ' = ', v(expr.e)]);
      steps.push(['The minus sign is outside the bars, so the answer is ', toExpr(value, style)]);
    } else {
      steps.push(['Absolute value is the distance from 0, so ', expr, ' = ', toExpr(value, style)]);
    }

    return {
      prompt: ['Find the value of  ', expr],
      input: { kind: 'number' },
      answer: { kind: 'number', value: value.toString() },
      answerText: [toExpr(value, style)],
      hint: ['Absolute value bars | | turn the number inside into its distance from 0. A minus sign outside the bars stays!'],
      explanation: steps,
    };
  },
};
