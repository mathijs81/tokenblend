import { PlannedOrder } from '@/orderplan/orderplan';
import { fixedToBigNumber } from '@/util/numbers';
import { BigNumber } from 'ethers';
import { ParaSwap } from 'paraswap';
import { web3Service } from './web3Service';

const paraSwap = new ParaSwap();

class ParaswapService {
  public async getPredictedOutput(order: PlannedOrder): Promise<BigNumber> {
    paraSwap.setWeb3Provider(web3Service.getProvider());
    const priceRoute = await paraSwap.getRate(
      order.fromToken.id,
      order.toToken.id,
      fixedToBigNumber(order.sendAmount, order.fromToken.decimals).toString()
    );
    console.log(priceRoute);
    if ('message' in priceRoute) {
      throw new Error(priceRoute.message);
    } else {
      return BigNumber.from(priceRoute.destAmount);
    }
  }
}

const paraswapService = new ParaswapService();

export { paraswapService };
