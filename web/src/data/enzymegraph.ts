// Quick hack: copied sdk.ts & subgraph.ts from provided bot repository https://github.com/avantgardefinance/enzyme-bot
import { gql } from './sdk';

const endpoint = 'https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme';

export async function getTokens() {
  const result = await gql(endpoint).assets();
  return result;
}
