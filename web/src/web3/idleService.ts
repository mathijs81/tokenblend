import { bigNumberToFixed, fixedToBigNumber, formatMaxDigits } from '@/util/numbers';
import { StakedToken } from '@/util/stakedTokens';
import { getTokenAllowance, getTokenBalance, tokenApprove, TokenData } from '@/util/tokens';
import { BigNumber, Contract, FixedNumber, utils } from 'ethers';
import idleTokenAbi from './IdleToken.json';
import { TransactionResult } from './uniswapService';
import { web3Service } from './web3Service';

const idleAddresses = {
  DAI: '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4',
  USDC: '0x5274891bEC421B39D23760c04A6755eCB444797C',
  USDT: '0xF34842d05A1c888Ca02769A633DF37177415C2f8',
  WBTC: '0x8C81121B15197fA0eEaEE1DC75533419DcfD3151',
  WETH: '0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80',
};
const symbols = new Set<string>(Object.keys(idleAddresses));

// Staking through idle.finance
class IdleService {
  private getContract(symbol: string, withSigner: boolean): Contract {
    const address = idleAddresses[symbol as keyof typeof idleAddresses];
    // TODO: cache contract creation?
    return new Contract(
      address,
      idleTokenAbi,
      withSigner ? web3Service.getSigner() : web3Service.getProvider()
    );
  }

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
        const ownedBn = balanceMap[index];
        const owned = bigNumberToFixed(ownedBn, decimals);
        let value = FixedNumber.from(0.0);
        if (ownedBn.gt(BigNumber.from(0))) {
          const contract = this.getContract(symbol, false);
          const tokenPrice: BigNumber = await contract.tokenPrice();
          value = bigNumberToFixed(tokenPrice, decimals);
          console.log(owned.toString(), value.toString());
        }
        const stakedValue = owned.mulUnsafe(value);
        return {
          id: address,
          name: symbol,
          symbol: symbol,
          decimals: decimals,
          ownedAmount: owned,
          value: value.toUnsafeFloat(),
          stakedUnderlyingValue: stakedValue,
          description: `${formatMaxDigits(
            stakedValue.toUnsafeFloat(),
            3
          )} deposited ${symbol} on idle.finance`,
          hasStaked: true,
        };
      })
    );
  }

  public supportedSymbols(): Set<string> {
    return symbols;
  }

  public async depositToken(
    token: TokenData,
    accountAddress: string,
    amount: FixedNumber
  ): Promise<TransactionResult> {
    const symbol = token.symbol;
    if (!(symbol in idleAddresses)) {
      throw new Error(`${symbol} not present in idle-supported symbols`);
    }
    const contractAddress = idleAddresses[symbol as keyof typeof idleAddresses];
    const contract = this.getContract(symbol, true);
    const amountBn = fixedToBigNumber(amount, token.decimals);

    // Check if allowance is high enough
    const allowance = await getTokenAllowance(token.id, accountAddress, contractAddress);
    if (amountBn.gt(allowance)) {
      // TODO: something smarter / better than unlimited approval
      const unlimitedAllowance = BigNumber.from(2).pow(256).sub(1);
      const ok = await tokenApprove(token.id, contractAddress, unlimitedAllowance);
      console.log('token approve: ' + ok);
    }
    console.log(amountBn, amountBn.toString());
    const result = await contract.mintIdleToken(amountBn, true, accountAddress);
    console.log(result);
    const receipt = await result.wait();
    console.log(receipt);

    return {
      message: 'Success',
      success: true,
    };
  }
  public async redeemToken(
    token: TokenData,
    accountAddress: string,
    amount: FixedNumber
  ): Promise<TransactionResult> {
    const symbol = token.symbol;
    if (!(symbol in idleAddresses)) {
      throw new Error(`${symbol} not present in idle-supported symbols`);
    }
    const contract = this.getContract(symbol, true);

    // Calculate how much we need to redeem using tokenPriceWithFee
    const priceWithFee: BigNumber = await contract.tokenPriceWithFee(accountAddress);
    let redeemAmount = fixedToBigNumber(amount.divUnsafe(bigNumberToFixed(priceWithFee, 18)), 18);

    const balance: BigNumber = await contract.balanceOf(accountAddress);
    if (redeemAmount.gt(balance)) {
      // If there's more than 10% difference, throw, otherwise just adjust to maximum
      if (redeemAmount.sub(balance).gt(redeemAmount.div(10))) {
        throw new Error(
          `Tried to redeem ${redeemAmount.toString()} (from ${amount.toString()} original), but balance is ${balance.toString()}`
        );
      }
      console.log('Trying to redeem more than balance, adjusting to redeem max balance');
      redeemAmount = balance;
    }

    const result = await contract.redeemIdleToken(redeemAmount);
    console.log(result);
    const receipt = await result.wait();
    console.log(receipt);

    return {
      message: 'Success',
      success: true,
    };
  }
}

const idleService = new IdleService();

export { idleService };
