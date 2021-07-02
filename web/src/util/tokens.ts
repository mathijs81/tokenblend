import { web3Service } from '@/web3/web3Service';
import { BigNumber, Contract, FixedNumber } from 'ethers';

export interface TokenData {
  id: string;
  name: string;
  symbol?: string;
  decimals: number;
  ownedAmount: FixedNumber;
  value: number;
  logoUri?: string;
}

export function calcPercentageMap(tokenData: TokenData[]): Record<string, number> {
  const percentageMap: Record<string, number> = {};
  let totalValue = 0.0;
  for (const token of tokenData) {
    totalValue += token.ownedAmount.toUnsafeFloat() * token.value;
  }
  if (totalValue > 0) {
    for (const token of tokenData) {
      if (token.ownedAmount.toUnsafeFloat() > 0) {
        const valuePart = (token.ownedAmount.toUnsafeFloat() * token.value) / totalValue;
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
