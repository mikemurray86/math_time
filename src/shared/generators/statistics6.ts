import { F } from '../fraction.ts';
import { decimalText } from '../expr.ts';
import type { GeneratorDef } from '../types.ts';

const SETS = [
  { what: 'quiz scores', lo: 60, hi: 100 },
  { what: 'points scored in basketball games', lo: 4, hi: 30 },
  { what: 'minutes spent reading each day', lo: 10, hi: 60 },
  { what: 'heights of plants (in cm)', lo: 5, hi: 40 },
  { what: 'number of goals in soccer games', lo: 0, hi: 8 },
];

type Stat = 'mean' | 'median' | 'mode' | 'range';

export interface StatisticsParams {
  [k: string]: unknown;
  stats: Stat[];
  count: number;
}

export const statistics: GeneratorDef<StatisticsParams> = {
  id: 'statistics',
  name: 'Mean, median, mode & range',
  skill: 'Statistics',
  description: 'Find the mean, median, mode or range of a small data set.',
  defaults: { stats: ['mean', 'median', 'mode', 'range'], count: 7 },
  fields: [
    {
      key: 'stats',
      label: 'Find the',
      type: 'multi',
      options: [
        { value: 'mean', label: 'Mean (average)' },
        { value: 'median', label: 'Median (middle)' },
        { value: 'mode', label: 'Mode (most often)' },
        { value: 'range', label: 'Range (biggest − smallest)' },
      ],
    },
    { key: 'count', label: 'Numbers in the data set', type: 'int', min: 5, max: 10 },
  ],
  presets: [
    { id: 'all', label: 'Mean, median, mode & range', params: { stats: ['mean', 'median', 'mode', 'range'], count: 7 } },
    { id: 'mean-median', label: 'Mean & median, bigger sets', params: { stats: ['mean', 'median'], count: 9 } },
  ],
  generate(p, rng) {
    const stat = rng.pick(p.stats.length ? p.stats : (['mean'] as Stat[]));
    const set = rng.pick(SETS);
    const n = p.count;
    let data: number[];
    for (;;) {
      data = Array.from({ length: n }, () => rng.int(set.lo, set.hi));
      if (stat === 'mode') {
        // exactly one value shows up most often
        const v = rng.pick(data);
        data[rng.int(0, n - 1)] = v;
        data[rng.int(0, n - 1)] = v;
      }
      if (stat === 'mean') {
        // nudge the last value so the mean is a whole number
        const sum = data.reduce((a, b) => a + b, 0);
        const off = sum % n;
        if (data[n - 1] - off >= set.lo) data[n - 1] -= off;
        else data[n - 1] += n - off;
        if (data[n - 1] > set.hi) continue;
      }
      const counts = new Map<number, number>();
      for (const v of data) counts.set(v, (counts.get(v) ?? 0) + 1);
      const top = Math.max(...counts.values());
      if (stat === 'mode' && (top < 2 || [...counts.values()].filter((c) => c === top).length !== 1)) continue;
      if (Math.max(...data) !== Math.min(...data)) break;
    }
    const sorted = [...data].sort((a, b) => a - b);
    const list = data.join(', ');
    const sortedList = sorted.join(', ');
    const label = { mean: 'mean', median: 'median', mode: 'mode', range: 'range' }[stat];
    const prompt = [`Here are some ${set.what}:  ${list}.  What is the ${label}?`];

    if (stat === 'mean') {
      const sum = data.reduce((a, b) => a + b, 0);
      const v = F(sum, n);
      return {
        prompt,
        input: { kind: 'number' },
        answer: { kind: 'number', value: v.toString() },
        answerText: [decimalText(v)],
        hint: ['Add all the numbers, then divide by how many numbers there are.'],
        explanation: [[`Add them: ${data.join(' + ')} = ${sum}`], [`There are ${n} numbers: ${sum} ÷ ${n} = ${decimalText(v)}`]],
      };
    }
    if (stat === 'median') {
      const mid = Math.floor(n / 2);
      const v = n % 2 ? F(sorted[mid]) : F(sorted[mid - 1] + sorted[mid], 2);
      return {
        prompt,
        input: { kind: 'number' },
        answer: { kind: 'number', value: v.toString() },
        answerText: [decimalText(v)],
        hint: ['Put the numbers in order from least to greatest, then find the middle one.'],
        explanation: [
          [`In order: ${sortedList}`],
          n % 2
            ? [`The middle (number ${mid + 1} of ${n}) is ${sorted[mid]}.`]
            : [`There are two middle numbers, ${sorted[mid - 1]} and ${sorted[mid]}. Halfway between them is ${decimalText(v)}.`],
        ],
      };
    }
    if (stat === 'mode') {
      const counts = new Map<number, number>();
      for (const v of data) counts.set(v, (counts.get(v) ?? 0) + 1);
      const [mode, times] = [...counts].sort((a, b) => b[1] - a[1])[0];
      return {
        prompt,
        input: { kind: 'number' },
        answer: { kind: 'number', value: String(mode) },
        answerText: [String(mode)],
        hint: ['Put the numbers in order. Which one shows up the most?'],
        explanation: [[`In order: ${sortedList}`], [`${mode} shows up ${times} times, more than any other number.`]],
      };
    }
    const [lo, hi] = [sorted[0], sorted[n - 1]];
    return {
      prompt,
      input: { kind: 'number' },
      answer: { kind: 'number', value: String(hi - lo) },
      answerText: [String(hi - lo)],
      hint: ['Find the biggest and the smallest number, then subtract.'],
      explanation: [[`Biggest: ${hi}. Smallest: ${lo}.`], [`${hi} − ${lo} = ${hi - lo}`]],
    };
  },
};
