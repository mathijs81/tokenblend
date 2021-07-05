// Utilities to work with FixedNumber, because it seems hard to do it directly.
import { utils, FixedNumber, BigNumber } from 'ethers';

export function fixedNum(n: number): FixedNumber {
  // This is the best way I could find, passing in number directly seems to always gives "underflow" error
  return FixedNumber.from(reduceDecimalString(n.toString(), 18));
}

function reduceDecimalString(value: string, decimals: number): string {
  const parts = value.split('.');
  if (parts.length === 1 || parts[1].length <= decimals) {
    return value;
  }
  return parts[0] + '.' + parts[1].substr(0, decimals);
}

/**
 * Make sure amount is lower than balance, as long as it's maximum tolerance x higher.
 * We frequently try to e.g. sell all tokens and this amount may be dependent on an earlier trade
 * that may have executed at a less favorable rate than expected.
 * This will then cause trades to fail because the requested amount is a tiny bit too high, this fixes that.
 *
 * The tolerance is there to not just reduce some crazy high amount back to balance, but that we still
 * get an error then, because probably there's some bug or other problem happening.
 */
export function toleranceMin(amount: BigNumber, balance: BigNumber, tolerance = 0.1): BigNumber {
  if (amount.lte(balance)) {
    return amount;
  }
  // Check if amount is within tolerance
  const toleranceAmount = fixedToBigNumber(
    bigNumberToFixed(balance, 18).mulUnsafe(fixedNum(1 + tolerance)),
    18
  );
  if (amount.gt(toleranceAmount)) {
    throw new Error(`Amount ${amount.toString()} much bigger than balance ${balance.toString()}`);
  }
  console.log(
    `Downwards adjusting number from ${bigNumberToFixed(amount, 18)} to ${bigNumberToFixed(
      balance,
      18
    )}`
  );
  return balance;
}

export function compareFixed(a: FixedNumber, b: FixedNumber): number {
  const bn1 = fixedToBigNumber(a, 18);
  const bn2 = fixedToBigNumber(b, 18);
  return compareBignumber(bn1, bn2);
}

export function compareBignumber(bn1: BigNumber, bn2: BigNumber): number {
  if (bn1.gt(bn2)) {
    return 1;
  } else if (bn1.eq(bn2)) {
    return 0;
  } else {
    return -1;
  }
}

export function reduceDecimals(n: FixedNumber, decimals: number): FixedNumber {
  const stringRep = n.toString();
  return FixedNumber.fromString(reduceDecimalString(stringRep, decimals), decimals);
}

export function fixedToBigNumber(n: FixedNumber, decimals: number): BigNumber {
  return utils.parseUnits(n.toString(), decimals);
}
export function bigNumberToFixed(n: BigNumber, decimals: number): FixedNumber {
  return FixedNumber.from(utils.formatUnits(n, decimals), decimals);
}

export function formatMaxDigits(n: number, digits = 2): string {
  if (n === undefined) {
    return '---';
  }
  return reduceDecimalString(n.toString(), digits);
}

export const numberMixin = {
  methods: {
    formatMaxDigits(n: number, digits = 2): string {
      return formatMaxDigits(n, digits);
    },
    formatDollars(n: number, maxDigits = 2): string {
      return '$ ' + formatMaxDigits(n, maxDigits);
    },
    formatDollarPrice(n: number): string {
      if (n === undefined) {
        return '---';
      }
      if (n >= 10) {
        return this.formatDollars(n);
      } else if (n >= 1) {
        return this.formatDollars(n, 3);
      } else if (n < 1e-8) {
        return '<< 0.001';
      } else {
        let k = 1,
          digits = 0;
        while (k > n) {
          k /= 10;
          digits++;
        }
        return '$ ' + formatMaxDigits(n, digits + 2);
      }
    },
  },
};
