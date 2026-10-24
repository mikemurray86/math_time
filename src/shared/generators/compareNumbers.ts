import { exprValue, toExpr, type Expr } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import { decimalExpr, makeNumber, numberFormOptions, type NumberForm } from './common.ts';

export interface CompareParams {
  [k: string]: unknown;
  forms: NumberForm[];
  range: number;
  maxDen: number;
  allowEqual: boolean;
}

export const compareNumbers: GeneratorDef<CompareParams> = {
  id: 'compareNumbers',
  name: 'Compare two numbers',
  skill: 'Ordering numbers',
  description: 'Choose <, > or = between two numbers written in different ways.',
  defaults: { forms: ['integer', 'improper', 'decimal', 'abs'], range: 5, maxDen: 8, allowEqual: true },
  fields: [
    { key: 'forms', label: 'Kinds of numbers', type: 'multi', options: numberFormOptions },
    { key: 'range', label: 'Largest size (±)', type: 'int', min: 2, max: 20 },
    { key: 'maxDen', label: 'Largest denominator', type: 'int', min: 2, max: 12 },
    { key: 'allowEqual', label: 'Sometimes make them equal', type: 'bool' },
  ],
  presets: [
    { id: 'mixed-forms', label: 'Mixed forms incl. absolute value', params: { forms: ['integer', 'improper', 'decimal', 'abs'], range: 5, maxDen: 8, allowEqual: true } },
    { id: 'fractions', label: 'Fractions vs decimals', params: { forms: ['fraction', 'improper', 'mixed', 'decimal'], range: 3, maxDen: 8, allowEqual: true } },
  ],
  generate(p, rng) {
    const forms = p.forms.length ? p.forms : (['integer'] as NumberForm[]);
    const left = makeNumber(rng, rng.pick(forms), -p.range, p.range, p.maxDen);
    let right: Expr;
    const lv = exprValue(left);
    if (p.allowEqual && rng.bool(0.2)) {
      // Same value, different look: 3/2 vs 1.5, |−2| vs 2, etc.
      if (lv.isInt()) {
        right = lv.sign() >= 0
          ? { t: 'abs', e: { t: 'int', v: -lv.n } } // 3 = |−3|
          : { t: 'neg', e: { t: 'abs', e: { t: 'int', v: lv.n } } }; // −3 = −|−3|
      } else {
        const looks = (['fraction', 'mixed', 'decimal'] as const)
          .map((s) => toExpr(lv, s))
          .filter((e) => JSON.stringify(e) !== JSON.stringify(left));
        right = looks.length ? rng.pick(looks) : { t: 'abs', e: toExpr(lv.neg()) };
      }
    } else {
      do right = makeNumber(rng, rng.pick(forms), -p.range, p.range, p.maxDen);
      while (exprValue(right).eq(lv));
    }
    const rv = exprValue(right);
    const c = lv.cmp(rv);
    const id = c < 0 ? 'lt' : c > 0 ? 'gt' : 'eq';
    const sym = { lt: '<', gt: '>', eq: '=' }[id];
    return {
      prompt: ['Which sign makes this true?'],
      input: {
        kind: 'choice',
        left,
        right,
        options: [
          { id: 'lt', label: '<' },
          { id: 'eq', label: '=' },
          { id: 'gt', label: '>' },
        ],
      },
      answer: { kind: 'choice', id },
      answerText: [left, `  ${sym}  `, right],
      hint: ['Turn both into decimals. On a number line, the number farther right is greater.'],
      explanation: [
        [left, '  =  ', decimalExpr(lv)],
        [right, '  =  ', decimalExpr(rv)],
        ['So ', left, `  ${sym}  `, right],
      ],
    };
  },
};
