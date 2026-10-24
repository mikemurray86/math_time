import type { Fraction } from '../fraction.ts';
import { pointRich, toExpr, type NumStyle, type Rich } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';
import { coordFields, coordStep, randomCoord, type CoordType } from './common.ts';

export interface DistanceParams {
  [k: string]: unknown;
  range: number;
  coordType: CoordType;
  style: NumStyle;
  crossAxis: 'always' | 'never' | 'mixed';
  orientation: 'horizontal' | 'vertical' | 'either';
  showGrid: boolean;
}

export const distanceSameLine: GeneratorDef<DistanceParams> = {
  id: 'distanceSameLine',
  name: 'Distance between two points',
  skill: 'Distance on a grid',
  description: 'Find the distance between two points that share an x- or y-coordinate.',
  defaults: { range: 10, coordType: 'integer', style: 'mixed', crossAxis: 'always', orientation: 'either', showGrid: false },
  fields: [
    ...coordFields,
    {
      key: 'crossAxis',
      label: 'Points on opposite sides of an axis',
      type: 'select',
      options: [
        { value: 'always', label: 'Always (add absolute values)' },
        { value: 'never', label: 'Never (subtract absolute values)' },
        { value: 'mixed', label: 'Mix of both' },
      ],
    },
    {
      key: 'orientation',
      label: 'Line direction',
      type: 'select',
      options: [
        { value: 'horizontal', label: 'Same y (horizontal)' },
        { value: 'vertical', label: 'Same x (vertical)' },
        { value: 'either', label: 'Either' },
      ],
    },
    { key: 'showGrid', label: 'Show the points on a grid', type: 'bool' },
  ],
  presets: [
    { id: 'cross-int', label: 'Crossing an axis, whole numbers (±10)', params: { range: 10, coordType: 'integer', style: 'mixed', crossAxis: 'always', orientation: 'either', showGrid: false } },
    { id: 'mixed-int-grid', label: 'Same side or crossing, with grid (±10)', params: { range: 10, coordType: 'integer', style: 'mixed', crossAxis: 'mixed', orientation: 'either', showGrid: true } },
    { id: 'cross-halves', label: 'Crossing an axis, halves (±5)', params: { range: 5, coordType: 'half', style: 'mixed', crossAxis: 'always', orientation: 'either', showGrid: false } },
    { id: 'decimals', label: 'Decimals, mixed sides (±5)', params: { range: 5, coordType: 'quarter', style: 'decimal', crossAxis: 'mixed', orientation: 'either', showGrid: false } },
  ],
  generate(p, rng) {
    const horizontal = p.orientation === 'either' ? rng.bool() : p.orientation === 'horizontal';
    const cross = p.crossAxis === 'mixed' ? rng.bool() : p.crossAxis === 'always';
    const fractional = p.coordType !== 'integer';

    const shared = randomCoord(rng, p.coordType, p.range, { margin: true, nonZero: true });
    let a: Fraction, b: Fraction;
    do {
      const fracA = fractional && rng.bool();
      const fracB = fractional && (!fracA || rng.bool(0.4));
      const s = rng.bool() ? 1 : -1;
      a = randomCoord(rng, p.coordType, p.range, { sign: s, nonInteger: fracA });
      b = randomCoord(rng, p.coordType, p.range, { sign: cross ? (-s as 1 | -1) : s, nonInteger: fracB });
    } while (a.eq(b));

    const [ax, ay, bx, by] = horizontal ? [a, shared, b, shared] : [shared, a, shared, b];
    const dist = a.sub(b).abs();
    const st: NumStyle = p.style;
    const A = pointRich('A', ax, ay, st);
    const B = pointRich('B', bx, by, st);
    const axisName = horizontal ? 'y-axis' : 'x-axis';
    const coordName = horizontal ? 'x' : 'y';
    const e = (f: Fraction) => toExpr(f, st);
    const [big, small] = a.abs().cmp(b.abs()) >= 0 ? [a, b] : [b, a];

    const explanation: Rich[] = [
      [`Both points have the same ${horizontal ? 'y' : 'x'}-coordinate (`, e(shared), `), so they sit on a ${horizontal ? 'horizontal' : 'vertical'} line.`],
      [`Compare the ${coordName}-coordinates: `, e(a), ' and ', e(b), '.'],
      cross
        ? [`They are on opposite sides of the ${axisName}, so add their distances from it:`]
        : [`They are on the same side of the ${axisName}, so subtract their distances from it:`],
      cross
        ? ['|', e(a), '| + |', e(b), '|  =  ', e(a.abs()), ' + ', e(b.abs()), '  =  ', e(dist)]
        : ['|', e(big), '| − |', e(small), '|  =  ', e(big.abs()), ' − ', e(small.abs()), '  =  ', e(dist)],
      ['The distance is ', e(dist), ' units.'],
    ];

    return {
      prompt: ['What is the distance between ', ...A, ' and ', ...B, '?'],
      input: {
        kind: 'number',
        grid: p.showGrid
          ? {
              range: p.range,
              step: coordStep(p.coordType).toString(),
              style: st,
              points: [
                { label: 'A', x: ax.toString(), y: ay.toString(), tone: 'a' },
                { label: 'B', x: bx.toString(), y: by.toString(), tone: 'b' },
              ],
            }
          : undefined,
      },
      answer: { kind: 'number', value: dist.toString() },
      answerText: [e(dist), ' units'],
      hint: [`Look at the ${coordName}-coordinates. If one is negative and one is positive, the line crosses the ${axisName}, so add the absolute values.`],
      explanation,
    };
  },
};
