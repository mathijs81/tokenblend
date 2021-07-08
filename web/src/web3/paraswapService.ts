import { PlannedOrder } from '@/orderplan/orderplan';
import { fixedToBigNumber } from '@/util/numbers';
import { BigNumber, ethers } from 'ethers';
import { OptimalRatesWithPartnerFees, ParaSwap, UNLIMITED_ALLOWANCE, Transaction } from 'paraswap';
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
  private referrer = 'TokenBlend';

  public async getPredictedOutput(order: PlannedOrder): Promise<ParaSwapPredictedOutput> {
    paraSwap.setWeb3Provider(web3Service.getExternalProvider());
    const priceRoute = await paraSwap.getRate(
      order.fromToken.id,
      order.toToken.id,
      fixedToBigNumber(order.sendAmount, order.fromToken.decimals).toString(),
      undefined,
      {
        referrer: this.referrer,
      }
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
      if (allowanceResult) {
        // This is a transaction id, wait for it to complete.
        const tx = await web3Service.getProvider().getTransaction(allowanceResult);
        const receipt = await tx.wait();
        console.log('allowance tx receipt', receipt);
      }
    }

    const tx = await paraSwap.buildTx(
      order.fromToken.id,
      order.toToken.id,
      sendBn.toString(),
      plan.predictedOutput.toString(),
      plan.priceRoute,
      address,
      this.referrer,
      undefined,
      undefined,
      order.fromToken.decimals,
      order.toToken.decimals
    );
    if ('message' in tx) {
      throw new Error('error building tx: ' + tx.message);
    }

    console.log('paraswap transaction', tx);
    const ethersTx = this.convertWeb3ToEthers(tx);

    console.log('Converted to ethers', ethersTx);
    const sentTx = await web3Service.getSigner().sendTransaction(ethersTx);
    const receipt = await sentTx.wait();
    console.log(receipt);

    return {
      message: 'Success',
      success: true,
    };
  }

  private convertWeb3ToEthers(
    tx: Transaction & { gas?: string; gasPrice?: string }
  ): ethers.providers.TransactionRequest {
    let gasLimit: BigNumber | undefined = undefined;
    let gasPrice: BigNumber | undefined = undefined;
    if ('gas' in tx) {
      gasLimit = BigNumber.from(tx['gas']);
    }
    if ('gasPrice' in tx) {
      gasPrice = BigNumber.from(tx['gasPrice']);
    }
    return {
      chainId: tx.chainId,
      from: tx.from,
      to: tx.to,
      value: BigNumber.from(tx.value),
      data: tx.data,
      gasPrice,
      gasLimit,
    };
  }
}

const paraswapService = new ParaswapService();

export { paraswapService };
