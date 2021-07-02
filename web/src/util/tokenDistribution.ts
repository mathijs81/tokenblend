import { TokenData } from './tokens';

export interface Distribution {
  name: string;
  map: Record<string, number>;
}

/*
 TODO: add more interesting distributions eg market cap weighted
 */
export async function getDistributions(token: TokenData[]): Promise<Distribution[]> {
  const map: Record<string, number> = {};
  token.forEach((t) => {
    map[t.id] = 100.0 / token.length;
  });
  const equalWeighted = {
    name: 'All Equal',
    map,
  };

  const filteredMap: Record<string, number> = {};
  token
    .filter((it) => it.symbol == 'WETH' || it.symbol == 'BAT')
    .forEach((t) => {
      filteredMap[t.id] = 50;
    });
  const filtered = {
    name: 'Only ETH and BAT',
    map: filteredMap,
  };

  return [equalWeighted, filtered];
}
