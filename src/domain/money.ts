/** USDC amounts in base units (6 decimals). All arithmetic stays in bigint. */
export type Micro = bigint;

export const USDC_DECIMALS = 6;
const ONE = 1_000_000n;

export function usdc(value: number | string): Micro {
  const [whole, frac = ''] = String(value).split('.');
  const fracPadded = (frac + '000000').slice(0, USDC_DECIMALS);
  const sign = whole.startsWith('-') ? -1n : 1n;
  const w = BigInt(whole.replace('-', '') || '0');
  return sign * (w * ONE + BigInt(fracPadded));
}

export function formatUSDC(amount: Micro, opts: { compact?: boolean; symbol?: boolean } = {}): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const whole = abs / ONE;
  const frac = abs % ONE;
  let fracStr = frac.toString().padStart(USDC_DECIMALS, '0');
  if (opts.compact ?? true) {
    fracStr = fracStr.replace(/0+$/, '');
    if (fracStr.length < 2) fracStr = fracStr.padEnd(2, '0');
  }
  const wholeStr = whole.toLocaleString('en-US');
  const body = `${wholeStr}.${fracStr}`;
  return `${neg ? '-' : ''}${body}${opts.symbol === false ? '' : ' USDC'}`;
}

/** Pro-rata split of `total` across `weights`; remainder goes to the first index. Sums exactly to total. */
export function splitProRata(total: Micro, weights: number[]): Micro[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0n);
  const shares = weights.map(w => (total * BigInt(w)) / BigInt(sum));
  const assigned = shares.reduce((a, b) => a + b, 0n);
  shares[0] += total - assigned;
  return shares;
}

export function maxMicro(a: Micro, b: Micro): Micro {
  return a > b ? a : b;
}
