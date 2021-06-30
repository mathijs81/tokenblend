import { Contract, BigNumber } from 'ethers';
import { web3Service } from '@/web3/web3Service';
import { ChainId, EthersProvider, TokenFactoryPublic } from 'simple-uniswap-sdk';

export interface TokenData {
  id: string;
  name: string;
  decimals: number;
  ownedAmount: number;
  value: number;
  logoUri?: string;
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

export async function getTokenBalance(
  contractAddress: string,
  address: string
): Promise<BigNumber> {
  const provider = web3Service.getProvider();
  const abi = ['function balanceOf(address owner) view returns (uint256)'];
  const contract = new Contract(contractAddress, abi, provider);
  return contract.balanceOf(address);
}
