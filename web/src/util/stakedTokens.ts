import { TokenData } from './tokens';
import { FixedNumber } from 'ethers';

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
