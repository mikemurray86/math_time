import { Fraction } from '../fraction.ts';
import { pointRich, toExpr, type NumStyle, type Rich } from '../expr.ts';
import type { GeneratorDef, GridSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import { coordFields, coordStep, randomCoord, type CoordType } from './common.ts';

export interface PointParams {
  [k: string]: unknown;
  range: number;
  coordType: CoordType;
  style: NumStyle;
  quadrants: number[];
  bothNonInteger: boolean;
}

const pointFields = [
  ...coordFields,
  {
    key: 'quadrants',
    label: 'Quadrants',
    type: 'multi' as const,
    options: [
      { value: 1, label: 'I (+, +)' },
      { value: 2, label: 'II (−, +)' },
      { value: 3, label: 'III (−, −)' },
      { value: 4, label: 'IV (+, −)' },
    ],
  },
  { key: 'bothNonInteger', label: 'Both coordinates are fractions/decimals', type: 'bool' as const },
];

const QUAD_SIGNS: Record<number, [1 | -1, 1 | -1]> = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] };
const QUAD_NAMES: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

function makePoint(p: PointParams, rng: Rng) {
  const quadrant = rng.pick(p.quadrants.length ? p.quadrants : [1, 2, 3, 4]);
  const [sx, sy] = QUAD_SIGNS[quadrant];
  const fractional = p.coordType !== 'integer';
  // With fractional grids at least one coordinate must be off the whole numbers,
  // otherwise the question is easier than the preset promises.
  const fracX = fractional && (p.bothNonInteger || rng.bool());
  const fracY = fractional && (p.bothNonInteger || !fracX || rng.bool(0.3));
  const x = randomCoord(rng, p.coordType, p.range, { sign: sx, nonInteger: fracX, margin: true });
  const y = randomCoord(rng, p.coordType, p.range, { sign: sy, nonInteger: fracY, margin: true });
  return { x, y, quadrant };
}

const grid = (p: PointParams, points: GridSpec['points'] = []): GridSpec => ({
  range: p.range,
  step: coordStep(p.coordType).toString(),
  points,
  style: p.style,
});

const moveSteps = (x: Fraction, y: Fraction, style: NumStyle): Rich[] => [
  ['Start at the origin (0, 0).'],
  [`Move ${x.sign() < 0 ? 'left' : 'right'} `, toExpr(x.abs(), style), ' along the x-axis.'],
  [`Then move ${y.sign() < 0 ? 'down' : 'up'} `, toExpr(y.abs(), style), ' parallel to the y-axis.'],
];

const presetsFor = (): GeneratorDef<PointParams>['presets'] => [
  { id: 'halves', label: 'Halves, all quadrants (±5)', params: { range: 5, coordType: 'half', style: 'mixed', quadrants: [1, 2, 3, 4], bothNonInteger: false } },
  { id: 'quarters-dec', label: 'Quarters as decimals (±5)', params: { range: 5, coordType: 'quarter', style: 'decimal', quadrants: [1, 2, 3, 4], bothNonInteger: false } },
  { id: 'quarters-frac', label: 'Quarters as fractions, both coords (±3)', params: { range: 3, coordType: 'quarter', style: 'fraction', quadrants: [1, 2, 3, 4], bothNonInteger: true } },
  { id: 'tenths', label: 'Tenths (±2)', params: { range: 2, coordType: 'tenth', style: 'decimal', quadrants: [1, 2, 3, 4], bothNonInteger: false } },
  { id: 'integers', label: 'Whole numbers, all quadrants (±10)', params: { range: 10, coordType: 'integer', style: 'mixed', quadrants: [1, 2, 3, 4], bothNonInteger: false } },
];

const defaults: PointParams = { range: 5, coordType: 'half', style: 'mixed', quadrants: [1, 2, 3, 4], bothNonInteger: false };

export const plotPoint: GeneratorDef<PointParams> = {
  id: 'plotPoint',
  name: 'Plot a point',
  skill: 'Coordinate plane',
  description: 'Tap the grid to place a point, including fraction and decimal coordinates.',
  defaults,
  fields: pointFields,
  presets: presetsFor(),
  generate(p, rng) {
    const { x, y, quadrant } = makePoint(p, rng);
    const pt = pointRich('P', x, y, p.style);
    return {
      prompt: ['Plot the point ', ...pt, ' on the grid.'],
      input: { kind: 'plot', grid: grid(p) },
      answer: { kind: 'pair', x: x.toString(), y: y.toString() },
      answerText: pt,
      hint: ['x tells you left/right, y tells you up/down. Each small square is ', toExpr(coordStep(p.coordType), p.style), ' of a unit.'],
      explanation: [...moveSteps(x, y, p.style), [`That puts P in quadrant ${QUAD_NAMES[quadrant]}.`]],
    };
  },
};

export const readPoint: GeneratorDef<PointParams> = {
  id: 'readPoint',
  name: 'Name the coordinates',
  skill: 'Coordinate plane',
  description: 'Read the (x, y) coordinates of a point shown on the grid.',
  defaults,
  fields: pointFields,
  presets: presetsFor(),
  generate(p, rng) {
    const { x, y } = makePoint(p, rng);
    return {
      prompt: ['What are the coordinates of point A?'],
      input: { kind: 'pair', grid: grid(p, [{ label: 'A', x: x.toString(), y: y.toString(), tone: 'a' }]) },
      answer: { kind: 'pair', x: x.toString(), y: y.toString() },
      answerText: pointRich('A', x, y, p.style),
      hint: ['Count the small squares from the origin. Each one is ', toExpr(coordStep(p.coordType), p.style), '. Left and down are negative.'],
      explanation: [
        [`A is ${x.sign() < 0 ? 'left' : 'right'} `, toExpr(x.abs(), p.style), ` and ${y.sign() < 0 ? 'down' : 'up'} `, toExpr(y.abs(), p.style), ' from the origin.'],
        ['So A is ', ...pointRich('', x, y, p.style), '.'],
      ],
    };
  },
};
