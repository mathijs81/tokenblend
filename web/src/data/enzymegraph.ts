// Quick hack: copied sdk.ts & subgraph.ts from provided bot repository https://github.com/avantgardefinance/enzyme-bot
import { gql } from './sdk';
import { AssetsQuery, FundsQuery, Release } from './subgraph';

const prodEndpoint = 'https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme';
const kovanEndpoint = 'https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme-kovan';

const endpoint = (prod: boolean) => (prod ? prodEndpoint : kovanEndpoint);

export async function getTokens(prod: boolean): Promise<AssetsQuery> {
  const result = await gql(endpoint(prod)).assets();
  return result;
}

export async function getFunds(prod: boolean, account: string): Promise<FundsQuery> {
  // address needs to be put in as lowercase
  let address = account.toLowerCase();
  if (address == '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097'.toLowerCase()) {
    // hardhat test address, return the vaults of the user that we impersonated
    address = '0xb3f8d948b26c4805f945c01fab023c4c8a6efef2';
  }
  const result = await gql(endpoint(prod)).funds({ id: address });
  return result;
}

export async function getContracts(): Promise<Release> {
  const result = await gql(endpoint(true)).currentReleaseContracts();
  if (!result.network || !result.network.currentRelease) {
    throw "gql query didn't contain network";
  }
  return result.network.currentRelease as Release;
}
