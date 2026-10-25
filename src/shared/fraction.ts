// Exact rational numbers so we never compare floats when grading.

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

const VULGAR: Record<string, string> = {
  '½': ' 1/2', '⅓': ' 1/3', '⅔': ' 2/3', '¼': ' 1/4', '¾': ' 3/4',
  '⅕': ' 1/5', '⅖': ' 2/5', '⅗': ' 3/5', '⅘': ' 4/5', '⅙': ' 1/6', '⅚': ' 5/6',
  '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8',
};

export class Fraction {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) {
      throw new Error(`invalid fraction ${n}/${d}`);
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    this.n = n / g || 0; // avoid -0
    this.d = d / g;
  }

  static of(n: number, d = 1): Fraction {
    return new Fraction(n, d);
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o: Fraction): Fraction {
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }
  abs(): Fraction {
    return new Fraction(Math.abs(this.n), this.d);
  }
  sign(): number {
    return Math.sign(this.n);
  }
  cmp(o: Fraction): number {
    return Math.sign(this.n * o.d - o.n * this.d);
  }
  eq(o: Fraction): boolean {
    return this.n === o.n && this.d === o.d;
  }
  isInt(): boolean {
    return this.d === 1;
  }
  toNumber(): number {
    return this.n / this.d;
  }
  /** Canonical serialized form, e.g. "-3/2" or "4". */
  toString(): string {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }

  /**
   * Parse what a kid might type: "7", "-2.5", "3/4", "-1 1/2", "1½", "−3".
   * Returns null when it isn't a number we understand.
   */
  static parse(raw: unknown): Fraction | null {
    if (typeof raw !== 'string') return null;
    let s = raw.trim().replace(/[−–—]/g, '-');
    for (const [ch, rep] of Object.entries(VULGAR)) s = s.replaceAll(ch, rep);
    s = s.replace(/\s+/g, ' ').replace(/^([+-]) /, '$1').trim();
    while (/\d,\d{3}(?!\d)/.test(s)) s = s.replace(/(\d),(\d{3})(?!\d)/, '$1$2'); // 47,382
    if (s.length === 0 || s.length > 24) return null;
    let m: RegExpMatchArray | null;
    try {
      if ((m = s.match(/^([+-]?)(\d{1,9})$/))) {
        return new Fraction(sgn(m[1]) * Number(m[2]));
      }
      if ((m = s.match(/^([+-]?)(\d{0,9})\.(\d{1,6})$/))) {
        const whole = Number(m[2] || '0');
        const den = 10 ** m[3].length;
        return new Fraction(sgn(m[1]) * (whole * den + Number(m[3])), den);
      }
      if ((m = s.match(/^([+-]?)(\d{1,9})\/(\d{1,9})$/))) {
        if (Number(m[3]) === 0) return null;
        return new Fraction(sgn(m[1]) * Number(m[2]), Number(m[3]));
      }
      if ((m = s.match(/^([+-]?)(\d{1,9}) (\d{1,9})\/(\d{1,9})$/))) {
        const den = Number(m[4]);
        if (den === 0) return null;
        return new Fraction(sgn(m[1]) * (Number(m[2]) * den + Number(m[3])), den);
      }
    } catch {
      return null;
    }
    return null;
  }
}

const sgn = (s: string) => (s === '-' ? -1 : 1);

export const F = Fraction.of;
