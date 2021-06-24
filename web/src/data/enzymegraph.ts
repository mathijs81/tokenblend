// Quick hack: copied sdk.ts & subgraph.ts from provided bot repository https://github.com/avantgardefinance/enzyme-bot
import { gql } from './sdk';

const prodEndpoint = 'https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme';
const kovanEndpoint = 'https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme-kovan';

const endpoint = (prod: boolean) => (prod ? prodEndpoint : kovanEndpoint);

export async function getTokens(prod: boolean) {
  const result = await gql(endpoint(prod)).assets();
  return result;
}

export async function getFunds(prod: boolean, account: string) {
  // address needs to be put in as lowercase
  const result = await gql(endpoint(prod)).funds({ id: account.toLowerCase() });
  return result;
}
