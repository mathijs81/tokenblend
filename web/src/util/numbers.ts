// Utilities to work with FixedNumber, because it seems hard to do it directly.
import { FixedNumber } from 'ethers';

export function reduceDecimals(n: FixedNumber, decimals: number): FixedNumber {
  const stringRep = n.toString();
  const parts = stringRep.split('.');
  if (parts.length === 1 || parts[1].length <= decimals) {
    return n;
  }

  return FixedNumber.fromString(parts[0] + '.' + parts[1].substr(0, decimals), decimals);
}
