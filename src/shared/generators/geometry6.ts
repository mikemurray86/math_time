import { F, type Fraction } from '../fraction.ts';
import { decimalText, exprText, toExpr, type Expr } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

const UNITS = ['cm', 'm', 'in', 'ft'];
const show = (v: Fraction): Expr => toExpr(v, 'mixed');
/** Halves read as decimals (2.5); anything else as a mixed number (8 3/4). */
const say = (v: Fraction) => (v.d === 2 ? decimalText(v) : exprText(show(v)));

// ---- volume of rectangular prisms -----------------------------------------

type VolumeAsk = 'volume' | 'missing';

export interface VolumeParams {
  [k: string]: unknown;
  asks: VolumeAsk[];
  fractionalEdges: boolean;
}

export const volume: GeneratorDef<VolumeParams> = {
  id: 'volume',
  name: 'Volume of a box',
  skill: 'Geometry',
  description: 'Volume of a rectangular prism (V = l × w × h), or a missing edge from the volume. Edges can include halves.',
  defaults: { asks: ['volume', 'missing'], fractionalEdges: false },
  fields: [
    {
      key: 'asks',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'volume', label: 'Find the volume' },
        { value: 'missing', label: 'Missing edge (given the volume)' },
      ],
    },
    { key: 'fractionalEdges', label: 'Edges with halves (2½ ft)', type: 'bool' },
  ],
  presets: [
    { id: 'whole', label: 'Volume & missing edge, whole numbers', params: { asks: ['volume', 'missing'], fractionalEdges: false } },
    { id: 'halves', label: 'Volume with fractional edges', params: { asks: ['volume'], fractionalEdges: true } },
  ],
  generate(p, rng) {
    const ask = rng.pick(p.asks.length ? p.asks : (['volume'] as VolumeAsk[]));
    const unit = rng.pick(UNITS);
    const edge = () => (p.fractionalEdges && rng.bool(0.6) ? F(rng.int(1, 9) * 2 + 1, 2) : F(rng.int(2, 12)));
    const [l, w, h] = [edge(), edge(), F(rng.int(2, 10))];
    const v = l.mul(w).mul(h);
    if (ask === 'missing' && !p.fractionalEdges) {
      return {
        prompt: [`A box has a volume of `, show(v), ` cubic ${unit}. It is ${say(l)} ${unit} long and ${say(w)} ${unit} wide. How tall is it?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: h.toString() },
        answerText: [`${say(h)} ${unit}`],
        hint: ['Volume = length × width × height. Find the area of the bottom first, then divide.'],
        explanation: [[`Bottom: ${say(l)} × ${say(w)} = ${say(l.mul(w))} square ${unit}`], [`${say(v)} ÷ ${say(l.mul(w))} = ${say(h)}`], [`The box is ${say(h)} ${unit} tall.`]],
      };
    }
    return {
      prompt: [`A box is ${say(l)} ${unit} long, ${say(w)} ${unit} wide and ${say(h)} ${unit} tall. What is its volume in cubic ${unit}?`],
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString() },
      answerText: [show(v), ` cubic ${unit}`],
      hint: ['Volume = length × width × height.'],
      explanation: [[`${say(l)} × ${say(w)} = ${say(l.mul(w))}`], [`${say(l.mul(w))} × ${say(h)} = `, show(v)], ['The volume is ', show(v), ` cubic ${unit}.`]],
    };
  },
};

// ---- area of triangles and other polygons ---------------------------------

type Shape = 'triangle' | 'parallelogram' | 'trapezoid';

export interface PolygonAreaParams {
  [k: string]: unknown;
  shapes: Shape[];
  maxSide: number;
}

export const polygonArea: GeneratorDef<PolygonAreaParams> = {
  id: 'polygonArea',
  name: 'Area of triangles & polygons',
  skill: 'Geometry',
  description: 'Area of triangles, parallelograms and trapezoids from the base(s) and height.',
  defaults: { shapes: ['triangle', 'parallelogram', 'trapezoid'], maxSide: 20 },
  fields: [
    {
      key: 'shapes',
      label: 'Shapes',
      type: 'multi',
      options: [
        { value: 'triangle', label: 'Triangles (½ × b × h)' },
        { value: 'parallelogram', label: 'Parallelograms (b × h)' },
        { value: 'trapezoid', label: 'Trapezoids (½ × (a + b) × h)' },
      ],
    },
    { key: 'maxSide', label: 'Longest base or height', type: 'int', min: 8, max: 30 },
  ],
  presets: [
    { id: 'all', label: 'Triangles, parallelograms & trapezoids', params: { shapes: ['triangle', 'parallelogram', 'trapezoid'], maxSide: 20 } },
    { id: 'triangles', label: 'Triangles only', params: { shapes: ['triangle'], maxSide: 20 } },
  ],
  generate(p, rng) {
    const shape = rng.pick(p.shapes.length ? p.shapes : (['triangle'] as Shape[]));
    const unit = rng.pick(UNITS);
    const b = rng.int(3, p.maxSide);
    const h = rng.int(2, p.maxSide);
    const ask = (what: string) => [`A ${shape} has ${what}. What is its area in square ${unit}?`];

    if (shape === 'parallelogram') {
      return {
        prompt: ask(`a base of ${b} ${unit} and a height of ${h} ${unit}`),
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(b * h) },
        answerText: [`${b * h} square ${unit}`],
        hint: ['A parallelogram can be cut and slid into a rectangle. Area = base × height.'],
        explanation: [[`Area = base × height = ${b} × ${h} = ${b * h}`], [`The area is ${b * h} square ${unit}.`]],
      };
    }
    if (shape === 'triangle') {
      const v = F(b * h, 2);
      return {
        prompt: ask(`a base of ${b} ${unit} and a height of ${h} ${unit}`),
        input: { kind: 'number' },
        answer: { kind: 'number', value: v.toString() },
        answerText: [`${say(v)} square ${unit}`],
        hint: ['A triangle is half of a parallelogram with the same base and height. Area = ½ × base × height.'],
        explanation: [[`base × height = ${b} × ${h} = ${b * h}`], [`Half of that: ${b * h} ÷ 2 = ${say(v)}`], [`The area is ${say(v)} square ${unit}.`]],
      };
    }
    let a = rng.int(2, p.maxSide);
    if (a === b) a = a > 2 ? a - 1 : a + 1;
    const v = F((a + b) * h, 2);
    return {
      prompt: ask(`parallel sides of ${a} ${unit} and ${b} ${unit}, and a height of ${h} ${unit}`),
      input: { kind: 'number' },
      answer: { kind: 'number', value: v.toString() },
      answerText: [`${say(v)} square ${unit}`],
      hint: ['Add the two parallel sides, multiply by the height, then take half. Area = ½ × (a + b) × h.'],
      explanation: [[`Add the parallel sides: ${a} + ${b} = ${a + b}`], [`Multiply by the height: ${a + b} × ${h} = ${(a + b) * h}`], [`Half of that: ${(a + b) * h} ÷ 2 = ${say(v)}`], [`The area is ${say(v)} square ${unit}.`]],
    };
  },
};
