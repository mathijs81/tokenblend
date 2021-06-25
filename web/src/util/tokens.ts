export interface TokenData {
  id: string;
  name: string;
  ownedAmount: number;
  value: number;
}

export function calcPercentageMap(tokenData: TokenData[]): Record<string, number> {
  const percentageMap: Record<string, number> = {};
  let totalValue = 0.0;
  for (const token of tokenData) {
    totalValue += token.ownedAmount * token.value;
  }
  if (totalValue > 0) {
    for (const token of tokenData) {
      if (token.ownedAmount > 0) {
        const valuePart = (token.ownedAmount * token.value) / totalValue;
        percentageMap[token.id] = Math.round(valuePart * 100.0 * 10) / 10;
      }
    }
  }
  return percentageMap;
}
