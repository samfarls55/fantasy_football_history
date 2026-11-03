/** Add the decimal source representations without intermediate binary rounding. */
export function sumPoints(values: number[]): number {
  const decimals = values.map(value => {
    const [mantissa, exponent = '0'] = value.toString().split('e');
    const [whole, fraction = ''] = mantissa.split('.');
    return { units: BigInt(whole + fraction), scale: fraction.length - Number(exponent) };
  });
  const scale = Math.max(0, ...decimals.map(value => value.scale));
  const total = decimals.reduce((sum, value) => sum + value.units * 10n ** BigInt(scale - value.scale), 0n);
  return Number(total) / 10 ** scale;
}
