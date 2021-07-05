import { TokenData } from './tokens';
import { FixedNumber } from 'ethers';
import { OrderType, PlannedOrder } from '@/orderplan/orderplan';
import { fixedNum } from './numbers';

export interface StakedToken extends TokenData {
  stakedUnderlyingValue: FixedNumber;
  description: string;
  hasStaked: boolean;
}

export function reduceTokens(allTokens: TokenData[]): StakedToken[] {
  // Find all tokens with the same symbol
  const tokensBySymbol: Record<string, TokenData[]> = {};
  for (const token of allTokens) {
    const tokenArray = tokensBySymbol[token.symbol];
    if (!tokenArray) {
      tokensBySymbol[token.symbol] = [token];
    } else {
      tokenArray.push(token);
    }
  }
  console.log(allTokens, tokensBySymbol);

  // Reduce all symbols to one item
  const result: StakedToken[] = [];
  for (const [symbol, tokenArray] of Object.entries(tokensBySymbol)) {
    if (tokenArray.length === 0) {
      console.log('Empty array for ' + symbol);
      continue;
    }
    // Find the non-staked token version
    const nonStakedIndex = tokenArray.findIndex((token) => !('stakedUnderlyingValue' in token));
    if (nonStakedIndex === -1) {
      throw new Error(`${symbol} only has staked tokens? ${tokenArray}`);
    }
    const nonStakedItem: TokenData = tokenArray.splice(nonStakedIndex, 1)[0];
    const newToken: StakedToken = {
      ...nonStakedItem,
      stakedUnderlyingValue: FixedNumber.from(0.0),
      description: `${nonStakedItem.ownedAmount} ${symbol}`,
      hasStaked: false,
    };
    // Add up the stakedTokens
    for (const _stakedToken of tokenArray) {
      if (!('stakedUnderlyingValue' in _stakedToken)) {
        throw new Error(`${symbol} has multiple unstaked tokens in list?`);
      }
      const stakedToken = _stakedToken as StakedToken;
      newToken.ownedAmount = newToken.ownedAmount.addUnsafe(stakedToken.stakedUnderlyingValue);
      newToken.stakedUnderlyingValue = newToken.stakedUnderlyingValue.addUnsafe(
        stakedToken.stakedUnderlyingValue
      );
      newToken.description += '\n' + stakedToken.description;
      newToken.hasStaked = true;
    }
    result.push(newToken);
  }
  return result;
}

/**
 * Check if orderplan can be executed or that we first need to redeem some tokens.
 *
 * Also deposit tokens that can be deposited at the end.
 */
export function wrapDeposits(
  tokenList: TokenData[],
  orderplan: PlannedOrder[],
  availableSymbols: Set<string>
): PlannedOrder[] {
  const result = [...orderplan];
  const originalTokens = new Map<string, TokenData>();
  const tokenStatus = new Map<string, TokenData>();
  tokenList.forEach((token) => {
    tokenStatus.set(token.id, { ...token });
    originalTokens.set(token.id, token);
  });

  const redeemAmounts = new Map<string, FixedNumber>();

  for (const order of orderplan) {
    const destAmount = order.sendAmount
      .mulUnsafe(fixedNum(order.fromToken.value))
      .divUnsafe(fixedNum(order.toToken.value));
    const from = tokenStatus.get(order.fromToken.id);
    const to = tokenStatus.get(order.toToken.id);
    if (!from || !to) {
      throw new Error(`Token not found? ${order}.`);
    }
    from.ownedAmount = from.ownedAmount.subUnsafe(order.sendAmount);
    to.ownedAmount = to.ownedAmount.addUnsafe(destAmount);
    if ('stakedUnderlyingValue' in from) {
      const stakedToken = from as StakedToken;
      const freeAmount = stakedToken.ownedAmount.subUnsafe(stakedToken.stakedUnderlyingValue);
      console.log(order.fromToken, freeAmount.toString());
      if (freeAmount.isNegative()) {
        const currentlyRedeemed = redeemAmounts.get(stakedToken.id);
        if (!currentlyRedeemed) {
          redeemAmounts.set(stakedToken.id, freeAmount.mulUnsafe(fixedNum(-1)));
        } else {
          redeemAmounts.set(
            stakedToken.id,
            currentlyRedeemed.addUnsafe(freeAmount.mulUnsafe(fixedNum(-1)))
          );
        }
      }
    }
  }
  console.log(redeemAmounts);

  redeemAmounts.forEach((redeemAmount, id) => {
    const token = originalTokens.get(id);
    if (!token) {
      throw new Error('Token not found ${id}');
    }
    if (availableSymbols.has(token.symbol)) {
      result.unshift({
        fromToken: token,
        toToken: token,
        sendAmount: redeemAmount,
        ordertype: OrderType.REDEEM,
      });
    }
  });

  tokenStatus.forEach((tokenStatus, id) => {
    if ('stakedUnderlyingValue' in tokenStatus && availableSymbols.has(tokenStatus.symbol)) {
      const stakedToken = tokenStatus as StakedToken;
      const freeAmount = stakedToken.ownedAmount.subUnsafe(stakedToken.stakedUnderlyingValue);
      const originalToken = originalTokens.get(id);
      if (!originalToken) {
        throw new Error('Token not found ${id}');
      }
      // Only deposit $10 or more
      if (freeAmount.toUnsafeFloat() * tokenStatus.value > 10) {
        result.push({
          fromToken: originalToken,
          toToken: originalToken,
          sendAmount: freeAmount,
          ordertype: OrderType.DEPOSIT,
        });
      }
    }
  });
  return result;
}
