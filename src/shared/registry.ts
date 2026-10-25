import { Rng } from './rng.ts';
import type { GeneratorDef, Params, PublicQuestion, Question } from './types.ts';
import { orderNumbers } from './generators/orderNumbers.ts';
import { compareNumbers } from './generators/compareNumbers.ts';
import { plotPoint, readPoint } from './generators/coordinates.ts';
import { distanceSameLine } from './generators/distanceSameLine.ts';
import { absoluteValue } from './generators/absoluteValue.ts';
import { divideWhole, multiplyWhole, placeValue } from './generators/wholeNumbers.ts';
import { decimalFractions, fractionOps } from './generators/fractions4.ts';
import { areaPerimeter } from './generators/geometry4.ts';
import { factorsMultiples } from './generators/factors.ts';

// To add a new kind of problem: write a generator in ./generators and list it here.
export const GENERATORS: Record<string, GeneratorDef<any>> = Object.fromEntries(
  [
    orderNumbers, compareNumbers, plotPoint, readPoint, distanceSameLine, absoluteValue,
    multiplyWhole, divideWhole, placeValue, fractionOps, decimalFractions, areaPerimeter, factorsMultiples,
  ].map((g) => [g.id, g]),
);

/** Fill in defaults and clamp anything out of range (params come from the parent UI). */
export function sanitizeParams(gen: GeneratorDef<any>, raw: unknown): Params {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Params;
  const out: Params = {};
  for (const f of gen.fields) {
    const v = src[f.key];
    const dflt = gen.defaults[f.key];
    switch (f.type) {
      case 'int': {
        const n = Number(v);
        out[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, Math.round(n))) : dflt;
        break;
      }
      case 'select':
        out[f.key] = f.options.some((o) => o.value === v) ? v : dflt;
        break;
      case 'multi': {
        const arr = Array.isArray(v) ? v.filter((x) => f.options.some((o) => o.value === x)) : [];
        out[f.key] = arr.length ? [...new Set(arr)] : dflt;
        break;
      }
      case 'bool':
        out[f.key] = typeof v === 'boolean' ? v : dflt;
        break;
    }
  }
  return out;
}

export function buildQuestion(generatorId: string, params: unknown, seed: number): Question {
  const gen = GENERATORS[generatorId];
  if (!gen) throw new Error(`unknown generator ${generatorId}`);
  return gen.generate(sanitizeParams(gen, params), new Rng(seed));
}

export const toPublic = (q: Question): PublicQuestion => ({ prompt: q.prompt, input: q.input });

/** Generator metadata for the parent's question-bank editor. */
export const generatorCatalog = () =>
  Object.values(GENERATORS).map(({ id, name, skill, description, defaults, fields, presets }) => ({
    id, name, skill, description, defaults, fields, presets,
  }));
