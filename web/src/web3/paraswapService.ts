import { PlannedOrder } from '@/orderplan/orderplan';
import { fixedToBigNumber } from '@/util/numbers';
import { BigNumber } from 'ethers';
import { OptimalRatesWithPartnerFees, ParaSwap, UNLIMITED_ALLOWANCE } from 'paraswap';
import { TransactionResult } from './uniswapService';
import { web3Service } from './web3Service';

const paraSwap = new ParaSwap();

export interface PredictedOutput {
  predictedOutput: BigNumber;
}

interface ParaSwapPlan {
  priceRoute: OptimalRatesWithPartnerFees;
}

export type ParaSwapPredictedOutput = PredictedOutput & ParaSwapPlan;

class ParaswapService {
  public async getPredictedOutput(order: PlannedOrder): Promise<ParaSwapPredictedOutput> {
    paraSwap.setWeb3Provider(web3Service.getExternalProvider());
    const priceRoute = await paraSwap.getRate(
      order.fromToken.id,
      order.toToken.id,
      fixedToBigNumber(order.sendAmount, order.fromToken.decimals).toString()
    );
    console.log(priceRoute);
    if ('message' in priceRoute) {
      throw new Error(priceRoute.message);
    } else {
      return {
        predictedOutput: BigNumber.from(priceRoute.destAmount),
        priceRoute: priceRoute,
      };
    }
  }

  public async execute(
    order: PlannedOrder,
    plan: ParaSwapPredictedOutput
  ): Promise<TransactionResult> {
    const address = web3Service.status().address;
    if (!address) {
      throw new Error('web3 address not initialized');
    }
    paraSwap.setWeb3Provider(web3Service.getExternalProvider());

    // Check if we have the allowance
    const allowance = await paraSwap.getAllowance(address, order.fromToken.id);
    if ('message' in allowance) {
      throw new Error('error getting allowance for token: ' + allowance.message);
    }
    const allowanceBn = BigNumber.from(allowance.allowance);
    const sendBn = fixedToBigNumber(order.sendAmount, order.fromToken.decimals);
    if (allowanceBn.lt(sendBn)) {
      const allowanceResult = await paraSwap.approveToken(
        UNLIMITED_ALLOWANCE,
        address,
        order.fromToken.id
      );
      console.log(`allowance result: ${allowanceResult}`);
    }

    const tx = await paraSwap.buildTx(
      order.fromToken.id,
      order.toToken.id,
      sendBn.toString(),
      plan.predictedOutput.toString(),
      plan.priceRoute,
      address,
      'trading-bot'
    );
    if ('message' in tx) {
      throw new Error('error building tx: ' + tx.message);
    }
    const sentTx = await web3Service.getSigner().sendTransaction(tx);
    const receipt = await sentTx.wait();
    console.log(receipt);

    return {
      message: 'Success',
      success: true,
    };
  }
}

const paraswapService = new ParaswapService();

export { paraswapService };
