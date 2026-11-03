/** Reduced rational arithmetic keeps decimal scores and repeating rates exact until display. */
export class Exact {
  readonly numerator: bigint;
  readonly denominator: bigint;
  constructor(numerator: bigint, denominator = 1n) {
    if (!denominator) throw new Error('Undefined metric denominator');
    const sign = denominator < 0n ? -1n : 1n;
    let a = numerator < 0n ? -numerator : numerator;
    let b = denominator < 0n ? -denominator : denominator;
    while (b) [a, b] = [b, a % b];
    const divisor = a || 1n;
    this.numerator = numerator * sign / divisor;
    this.denominator = denominator * sign / divisor;
  }
  static from(value: number | string | Exact): Exact {
    if (value instanceof Exact) return value;
    const [mantissa, exponent = '0'] = String(value).split('e');
    const [whole, fraction = ''] = mantissa.split('.');
    const scale = fraction.length - Number(exponent);
    const units = BigInt(whole + fraction);
    return scale >= 0 ? new Exact(units, 10n ** BigInt(scale)) : new Exact(units * 10n ** BigInt(-scale));
  }
  add(value: number | string | Exact): Exact { const b = Exact.from(value); return new Exact(this.numerator * b.denominator + b.numerator * this.denominator, this.denominator * b.denominator); }
  subtract(value: number | string | Exact): Exact { const b = Exact.from(value); return new Exact(this.numerator * b.denominator - b.numerator * this.denominator, this.denominator * b.denominator); }
  multiply(value: number | string | Exact): Exact { const b = Exact.from(value); return new Exact(this.numerator * b.numerator, this.denominator * b.denominator); }
  divide(value: number | string | Exact): Exact { const b = Exact.from(value); return new Exact(this.numerator * b.denominator, this.denominator * b.numerator); }
  abs(): Exact { return new Exact(this.numerator < 0n ? -this.numerator : this.numerator, this.denominator); }
  compare(value: number | string | Exact): number { const b = Exact.from(value); const delta = this.numerator * b.denominator - b.numerator * this.denominator; return delta < 0n ? -1 : delta > 0n ? 1 : 0; }
  get key(): string { return `${this.numerator}/${this.denominator}`; }
  toNumber(): number { return Number(this.numerator) / Number(this.denominator); }
}
export function exactSum(values: (number | string | Exact)[]): Exact { return values.reduce<Exact>((sum, value) => sum.add(value), Exact.from(0)); }
/** Compatibility for persisted official totals; derived comparisons retain Exact values. */
export function sumPoints(values: number[]): number { return exactSum(values).toNumber(); }
