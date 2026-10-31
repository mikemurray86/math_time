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
import { factorsMultiples, gcfLcm } from './generators/factors.ts';
import { decimalOps } from './generators/decimals5.ts';
import { fractionCalc } from './generators/fractions5.ts';
import { equations, orderOfOps } from './generators/expressions.ts';
import { polygonArea, volume } from './generators/geometry6.ts';
import { percent, ratios } from './generators/ratios6.ts';
import { statistics } from './generators/statistics6.ts';
import { angles, circles, probability, proportions, rationalOps, simplifyExpressions, twoStepEquations } from './generators/grade7.ts';
import { custom } from './generators/custom.ts';

// To add a new kind of problem: write a generator in ./generators and list it here.
export const GENERATORS: Record<string, GeneratorDef<any>> = Object.fromEntries(
  [
    orderNumbers, compareNumbers, plotPoint, readPoint, distanceSameLine, absoluteValue,
    multiplyWhole, divideWhole, placeValue, fractionOps, decimalFractions, areaPerimeter, factorsMultiples,
    decimalOps, fractionCalc, orderOfOps, equations, volume, polygonArea, ratios, percent, gcfLcm, statistics,
    rationalOps, proportions, twoStepEquations, simplifyExpressions, circles, angles, probability, custom,
  ].map((g) => [g.id, g]),
);

/** Fill in defaults and clamp anything out of range (params come from the parent UI). */
export function sanitizeParams(gen: GeneratorDef<any>, raw: unknown): Params {
  if (gen.sanitize) return gen.sanitize(raw);
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

/** Sanitize, then run the generator's slower checks: for params a parent is previewing or saving. */
export function checkParams(gen: GeneratorDef<any>, raw: unknown): Params {
  const params = sanitizeParams(gen, raw);
  gen.validate?.(params);
  return params;
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
