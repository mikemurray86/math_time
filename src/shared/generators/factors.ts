import type { Expr } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

const int = (v: number): Expr => ({ t: 'int', v });
const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const isPrime = (n: number) => n > 1 && factorsOf(n).length === 2;

type Kind = 'primeComposite' | 'factor' | 'multiple';

export interface FactorParams {
  [k: string]: unknown;
  kinds: Kind[];
  max: number;
}

export const factorsMultiples: GeneratorDef<FactorParams> = {
  id: 'factorsMultiples',
  name: 'Factors, multiples & primes',
  skill: 'Factors & multiples',
  description: 'Prime or composite, pick a factor, or pick a multiple.',
  defaults: { kinds: ['primeComposite', 'factor', 'multiple'], max: 100 },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'primeComposite', label: 'Prime or composite?' },
        { value: 'factor', label: 'Which is a factor?' },
        { value: 'multiple', label: 'Which is a multiple?' },
      ],
    },
    { key: 'max', label: 'Largest number', type: 'int', min: 20, max: 100 },
  ],
  presets: [
    { id: 'all-100', label: 'All types, numbers to 100', params: { kinds: ['primeComposite', 'factor', 'multiple'], max: 100 } },
    { id: 'prime-50', label: 'Prime or composite, to 50', params: { kinds: ['primeComposite'], max: 50 } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['factor'] as Kind[]));

    if (kind === 'primeComposite') {
      const n = rng.bool(0.45) ? rng.pick(Array.from({ length: p.max - 1 }, (_, i) => i + 2).filter(isPrime)) : rng.int(4, p.max);
      const prime = isPrime(n);
      const fs = factorsOf(n);
      return {
        prompt: ['Is ', int(n), ' prime or composite?'],
        input: { kind: 'choice', options: [{ id: 'prime', label: 'Prime' }, { id: 'composite', label: 'Composite' }] },
        answer: { kind: 'choice', id: prime ? 'prime' : 'composite' },
        answerText: [prime ? 'Prime' : 'Composite'],
        hint: ['A prime number has exactly two factors: 1 and itself. A composite number has more.'],
        explanation: [[`The factors of ${n} are ${fs.join(', ')}.`], [prime ? `Only 1 and ${n}, so ${n} is prime.` : `That’s more than two factors, so ${n} is composite.`]],
      };
    }

    // One right answer among four choices.
    let n: number;
    let correct: number;
    let wrong: number[];
    if (kind === 'factor') {
      do n = rng.int(12, p.max);
      while (factorsOf(n).length < 4);
      correct = rng.pick(factorsOf(n).filter((d) => d > 1 && d < n));
      const pool = Array.from({ length: Math.min(n - 1, 15) }, (_, i) => i + 2).filter((d) => n % d !== 0);
      wrong = rng.shuffle(pool).slice(0, 3);
    } else {
      n = rng.int(3, 12);
      correct = n * rng.int(2, Math.max(2, Math.floor(p.max / n)));
      const pool = Array.from({ length: 40 }, (_, i) => correct - 20 + i).filter((v) => v > 1 && v % n !== 0);
      wrong = rng.shuffle(pool).slice(0, 3);
    }
    const options = rng.shuffle([correct, ...wrong]).map((v) => ({ id: String(v), label: String(v) }));
    return {
      prompt: [kind === 'factor' ? 'Which number is a factor of ' : 'Which number is a multiple of ', int(n), '?'],
      input: { kind: 'choice', options },
      answer: { kind: 'choice', id: String(correct) },
      answerText: [int(correct)],
      hint: kind === 'factor' ? [`A factor divides ${n} evenly, with nothing left over.`] : [`A multiple of ${n} is in the ${n} times table: ${n}, ${2 * n}, ${3 * n}…`],
      explanation:
        kind === 'factor'
          ? [[`The factors of ${n} are ${factorsOf(n).join(', ')}.`], [`${correct} × ${n / correct} = ${n}, so ${correct} is a factor.`]]
          : [[`${n} × ${correct / n} = ${correct}, so ${correct} is a multiple of ${n}.`]],
    };
  },
};
