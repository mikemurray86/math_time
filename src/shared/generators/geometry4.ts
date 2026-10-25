import type { Expr } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

const int = (v: number): Expr => ({ t: 'int', v });
const UNITS = ['cm', 'm', 'in', 'ft'];

type Ask = 'area' | 'perimeter' | 'missing';

export interface AreaPerimeterParams {
  [k: string]: unknown;
  asks: Ask[];
  maxSide: number;
}

export const areaPerimeter: GeneratorDef<AreaPerimeterParams> = {
  id: 'areaPerimeter',
  name: 'Area & perimeter',
  skill: 'Measurement',
  description: 'Find the area or perimeter of a rectangle, or a missing side from the area.',
  defaults: { asks: ['area', 'perimeter', 'missing'], maxSide: 12 },
  fields: [
    {
      key: 'asks',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'area', label: 'Area' },
        { value: 'perimeter', label: 'Perimeter' },
        { value: 'missing', label: 'Missing side (given the area)' },
      ],
    },
    { key: 'maxSide', label: 'Longest side', type: 'int', min: 6, max: 30 },
  ],
  presets: [
    { id: 'mixed-12', label: 'Area, perimeter & missing side (sides to 12)', params: { asks: ['area', 'perimeter', 'missing'], maxSide: 12 } },
    { id: 'area-perim-25', label: 'Area & perimeter (sides to 25)', params: { asks: ['area', 'perimeter'], maxSide: 25 } },
  ],
  generate(p, rng) {
    const ask = rng.pick(p.asks.length ? p.asks : (['area'] as Ask[]));
    const unit = rng.pick(UNITS);
    const w = rng.int(3, p.maxSide);
    let h = rng.int(2, p.maxSide);
    if (h === w) h = h > 2 ? h - 1 : h + 1;
    const area = w * h;
    const perim = 2 * (w + h);

    if (ask === 'missing') {
      return {
        prompt: [`The rectangle has an area of `, int(area), ` square ${unit}. One side is ${w} ${unit}. How long is the missing side?`],
        input: { kind: 'number', rect: { w, h, wLabel: `${w} ${unit}`, hLabel: '?' } },
        answer: { kind: 'number', value: String(h) },
        answerText: [`${h} ${unit}`],
        hint: ['Area = length × width. What times the side you know makes the area?'],
        explanation: [[`Area = ${w} × ? = ${area}`], [`${area} ÷ ${w} = ${h}`], [`The missing side is ${h} ${unit}.`]],
      };
    }
    if (ask === 'perimeter') {
      return {
        prompt: [`What is the perimeter of the rectangle?`],
        input: { kind: 'number', rect: { w, h, wLabel: `${w} ${unit}`, hLabel: `${h} ${unit}` } },
        answer: { kind: 'number', value: String(perim) },
        answerText: [int(perim), ` ${unit}`],
        hint: ['Perimeter is the distance all the way around: add all four sides.'],
        explanation: [[`${w} + ${h} + ${w} + ${h} = ${perim}`], [`Or: 2 × (${w} + ${h}) = ${perim}`], [`The perimeter is ${perim} ${unit}.`]],
      };
    }
    return {
      prompt: [`What is the area of the rectangle?`],
      input: { kind: 'number', rect: { w, h, wLabel: `${w} ${unit}`, hLabel: `${h} ${unit}` } },
      answer: { kind: 'number', value: String(area) },
      answerText: [int(area), ` square ${unit}`],
      hint: ['Area is how many squares cover it: multiply length × width.'],
      explanation: [[`Area = ${w} × ${h} = ${area}`], [`The area is ${area} square ${unit}.`]],
    };
  },
};
