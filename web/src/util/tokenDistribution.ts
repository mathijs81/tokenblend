import { TokenData } from './tokens';

export interface Distribution {
  name: string;
  map: Record<string, number>;
}

const lending = {
  AAVE: 10.7,
  MKR: 7,
  COMP: 6.7,
  UNI: 5.6,
  YFI: 3,
  SNX: 1,
} as { [key: string]: number };

const dexes = {
  CRV: 8.3,
  UNI: 5.6,
  BNT: 1.2,
  '1INCH': 0.035,
  GNO: 0.021,
} as { [key: string]: number };

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

  const lendingMap: Record<string, number> = {};
  token.forEach((t) => {
    lendingMap[t.id] = lending[t.symbol] ?? 0.0;
  });
  const dexesMap: Record<string, number> = {};
  token.forEach((t) => {
    dexesMap[t.id] = dexes[t.symbol] ?? 0.0;
  });
  return [
    equalWeighted,
    filtered,
    { name: 'Lending', map: lendingMap },
    { name: 'Dexes', map: dexesMap },
  ];
}
