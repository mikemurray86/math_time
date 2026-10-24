import { Fraction } from './fraction.ts';
import type { Answer } from './types.ts';

const same = (a: unknown, expected: string): boolean => {
  const f = Fraction.parse(a);
  const g = Fraction.parse(expected);
  return !!f && !!g && f.eq(g);
};

/** Any equivalent form counts: 1.5, 3/2 and 1 1/2 are all right. */
export function grade(answer: Answer, response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  switch (answer.kind) {
    case 'order': {
      const ids = r.ids;
      return Array.isArray(ids) && ids.length === answer.ids.length && answer.ids.every((id, i) => ids[i] === id);
    }
    case 'choice':
      return r.id === answer.id;
    case 'number':
      return same(r.value, answer.value);
    case 'pair':
      return same(r.x, answer.x) && same(r.y, answer.y);
  }
}
