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

// ---- greatest common factor and least common multiple -------------------

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

type GcfKind = 'gcf' | 'lcm' | 'distributive';

export interface GcfLcmParams {
  [k: string]: unknown;
  kinds: GcfKind[];
}

export const gcfLcm: GeneratorDef<GcfLcmParams> = {
  id: 'gcfLcm',
  name: 'GCF & LCM',
  skill: 'Factors & multiples',
  description: 'Greatest common factor of two numbers to 100, least common multiple of two numbers to 12, and factoring out the GCF (36 + 8 = 4 × (9 + 2)).',
  defaults: { kinds: ['gcf', 'lcm', 'distributive'] },
  fields: [
    {
      key: 'kinds',
      label: 'Question types',
      type: 'multi',
      options: [
        { value: 'gcf', label: 'Greatest common factor (GCF of 24 and 36)' },
        { value: 'lcm', label: 'Least common multiple (LCM of 6 and 8)' },
        { value: 'distributive', label: 'Factor out the GCF (36 + 8 = 4 × (9 + 2))' },
      ],
    },
  ],
  presets: [
    { id: 'all', label: 'GCF, LCM & factoring out the GCF', params: { kinds: ['gcf', 'lcm', 'distributive'] } },
    { id: 'gcf-lcm', label: 'GCF & LCM', params: { kinds: ['gcf', 'lcm'] } },
  ],
  generate(p, rng) {
    const kind = rng.pick(p.kinds.length ? p.kinds : (['gcf'] as GcfKind[]));

    if (kind === 'lcm') {
      let [a, b] = [rng.int(2, 12), rng.int(2, 12)];
      if (a === b) b = b === 12 ? 11 : b + 1;
      const l = (a * b) / gcd(a, b);
      const multiples = (n: number) => Array.from({ length: Math.floor(l / n) }, (_, i) => n * (i + 1)).join(', ');
      return {
        prompt: [`What is the least common multiple (LCM) of ${a} and ${b}?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(l) },
        answerText: [int(l)],
        hint: [`List the multiples of ${Math.max(a, b)} until you reach one that ${Math.min(a, b)} also goes into.`],
        explanation: [[`Multiples of ${a}: ${multiples(a)}`], [`Multiples of ${b}: ${multiples(b)}`], [`The first one in both lists is ${l}.`]],
      };
    }

    // two numbers with an interesting common factor
    const g = rng.int(2, kind === 'distributive' ? 9 : 12);
    let [x, y] = [rng.int(1, Math.floor(100 / g)), rng.int(1, Math.floor(100 / g))];
    while (x === y || gcd(x, y) !== 1) [x, y] = [rng.int(1, Math.floor(100 / g)), rng.int(1, Math.floor(100 / g))];
    const [a, b] = [g * x, g * y];

    if (kind === 'gcf') {
      return {
        prompt: [`What is the greatest common factor (GCF) of ${a} and ${b}?`],
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(g) },
        answerText: [int(g)],
        hint: ['List the factors of each number and find the biggest one they share.'],
        explanation: [[`Factors of ${a}: ${factorsOf(a).join(', ')}`], [`Factors of ${b}: ${factorsOf(b).join(', ')}`], [`The greatest one in both lists is ${g}.`]],
      };
    }
    return {
      prompt: [`Use the GCF to rewrite  ${a} + ${b}  as  GCF × (__ + __).`],
      input: { kind: 'multi', fields: ['GCF', `${a} ÷ GCF`, `${b} ÷ GCF`] },
      answer: { kind: 'multi', values: [String(g), String(x), String(y)] },
      answerText: [`${a} + ${b} = ${g} × (${x} + ${y})`],
      hint: [`Find the greatest common factor of ${a} and ${b}, then divide each number by it.`],
      explanation: [[`The GCF of ${a} and ${b} is ${g}.`], [`${a} ÷ ${g} = ${x} and ${b} ÷ ${g} = ${y}`], [`${a} + ${b} = ${g} × (${x} + ${y})`]],
    };
  },
};
