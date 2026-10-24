import type { Expr, NumStyle, Rich } from './expr.ts';
import type { Rng } from './rng.ts';

export interface GridPoint {
  label: string;
  x: string; // serialized Fraction
  y: string;
  tone?: 'a' | 'b' | 'mine' | 'retry' | 'correct';
}

export interface GridSpec {
  range: number; // axes run from -range to +range
  step: string; // snap/minor-line spacing as a Fraction string, e.g. "1/4"
  points: GridPoint[];
  style?: NumStyle; // how to write coordinates in the live readout
}

export type InputSpec =
  | { kind: 'order'; direction: 'asc' | 'desc'; items: { id: string; expr: Expr }[] }
  | { kind: 'choice'; left: Expr; right: Expr; options: { id: string; label: string }[] }
  | { kind: 'number'; grid?: GridSpec }
  | { kind: 'pair'; grid: GridSpec }
  | { kind: 'plot'; grid: GridSpec };

export type Answer =
  | { kind: 'order'; ids: string[] }
  | { kind: 'choice'; id: string }
  | { kind: 'number'; value: string }
  | { kind: 'pair'; x: string; y: string };

export type Response =
  | { ids: string[] }
  | { id: string }
  | { value: string }
  | { x: string; y: string };

export interface Question {
  prompt: Rich;
  input: InputSpec;
  answer: Answer;
  answerText: Rich;
  hint: Rich;
  explanation: Rich[];
}

/** What the kid's browser receives: no answer, hint or explanation. */
export interface PublicQuestion {
  prompt: Rich;
  input: InputSpec;
}

export type ParamField =
  | { key: string; label: string; type: 'int'; min: number; max: number }
  | { key: string; label: string; type: 'select'; options: { value: string | number; label: string }[] }
  | { key: string; label: string; type: 'multi'; options: { value: string | number; label: string }[] }
  | { key: string; label: string; type: 'bool' };

export type Params = Record<string, unknown>;

export interface GeneratorDef<P extends Params = Params> {
  id: string;
  name: string;
  skill: string; // short grouping used on the parent dashboard
  description: string;
  defaults: P;
  fields: ParamField[];
  presets: { id: string; label: string; params: P }[];
  generate(params: P, rng: Rng): Question;
}
