import { bigNumberToFixed } from '@/util/numbers';
import { StakedToken } from '@/util/stakedTokens';
import { getTokenBalance } from '@/util/tokens';
import { BigNumber, Contract, FixedNumber, utils } from 'ethers';
import idleTokenAbi from './IdleToken.json';
import { web3Service } from './web3Service';

const idleAddresses = {
  DAI: '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4',
  USDC: '0x5274891bEC421B39D23760c04A6755eCB444797C',
  USDT: '0xF34842d05A1c888Ca02769A633DF37177415C2f8',
  WBTC: '0x8C81121B15197fA0eEaEE1DC75533419DcfD3151',
  WETH: '0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80',
};

// Staking through idle.finance
class IdleService {
  public async getTokenData(): Promise<StakedToken[]> {
    const address = web3Service.status().address;
    if (!address) {
      return [];
    }

    // Enable this to test what things look like with 1 WETH staked:
    const testContract = ''; // '0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80'

    const balanceMap = await Promise.all(
      Object.values(idleAddresses).map((contractAddress) => {
        if (contractAddress == testContract) return Promise.resolve(utils.parseEther('1'));
        else return getTokenBalance(contractAddress, address);
      })
    );
    let index = -1;
    return Promise.all(
      Object.entries(idleAddresses).map(async ([symbol, address]) => {
        const decimals = 18; // 4-Jul-2021: the 5 addresses we use all have 18 as decimals.
        // For future, better to look it up
        index++;
        const owned = bigNumberToFixed(balanceMap[index], decimals);
        let value = FixedNumber.from(0.0);
        if (balanceMap[index].gt(BigNumber.from(0))) {
          const contract = new Contract(address, idleTokenAbi, web3Service.getProvider());
          const tokenPrice: BigNumber = await contract.tokenPrice();
          value = bigNumberToFixed(tokenPrice, decimals);
          console.log(owned, value);
        }
        return {
          id: address,
          name: symbol,
          symbol: symbol,
          decimals: decimals,
          ownedAmount: owned,
          value: value.toUnsafeFloat(),
          stakedUnderlyingValue: owned.mulUnsafe(value),
          description: `${value} Staked ${symbol} on idle.finance`,
        };
      })
    );
  }
}

const idleService = new IdleService();

export { idleService };
