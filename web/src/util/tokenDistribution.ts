import { TokenData } from './tokens';

export interface Distribution {
  name: string;
  map: Record<string, number>;
}
type SymbolMap = { [key: string]: number };

const lending: SymbolMap = {
  AAVE: 10.7,
  MKR: 7,
  COMP: 6.7,
  UNI: 5.6,
  YFI: 3,
  SNX: 1,
};

const dexes: SymbolMap = {
  CRV: 8.3,
  UNI: 5.6,
  BNT: 1.2,
  '1INCH': 0.035,
  GNO: 0.021,
};

function convert(token: TokenData[], name: string, dist: SymbolMap): Distribution {
  const map: Record<string, number> = {};
  let sum = 0.0;
  token.forEach((t) => {
    const v = dist[t.symbol] ?? 0.0;
    sum += v;
    map[t.id] = v;
  });
  Object.keys(map).forEach((k) => {
    map[k] = (map[k] * 100) / sum;
  });
  return { name, map };
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

  return [
    equalWeighted,
    filtered,
    convert(token, 'Lending', lending),
    convert(token, 'Dexes', dexes),
  ];
}
