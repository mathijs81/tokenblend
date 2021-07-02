import { getSdk, Sdk, Token } from '@/data/uniswap_subgraph';
import { PlannedOrder } from '@/orderplan/orderplan';
import { fixedToBigNumber, reduceDecimals } from '@/util/numbers';
import { BigNumber, FixedNumber, utils } from 'ethers';
import { GraphQLClient } from 'graphql-request';
import {
  TradeDirection,
  UniswapPair,
  UniswapPairFactory,
  UniswapPairSettings,
  UniswapVersion,
} from 'simple-uniswap-sdk';
import { enzymeService } from './enzymeService';
import { PredictedOutput } from './paraswapService';
import { web3Service } from './web3Service';

export interface TransactionResult {
  message: string;
  success: boolean;
}

interface UniswapPlanning {
  fromAmount: BigNumber;
  minimummToAmount: BigNumber;
  estimatedToAmount: BigNumber;
  path: string[];
  pair: UniswapPairFactory;
}
function isTransactionResult(arg: UniswapPlanning | TransactionResult): arg is TransactionResult {
  return 'success' in arg;
}

class UniswapService {
  public async getPredictedOutput(order: PlannedOrder): Promise<PredictedOutput> {
    const plan = await this.planUniswap(order, [UniswapVersion.v2, UniswapVersion.v3]);
    if (isTransactionResult(plan)) {
      throw new Error(plan.message);
    } else {
      return { predictedOutput: plan.estimatedToAmount };
    }
  }

  private async planUniswap(
    plannedOrder: PlannedOrder,
    versions: UniswapVersion[]
  ): Promise<UniswapPlanning | TransactionResult> {
    const address = web3Service.status().address;
    if (address === undefined) {
      return { message: 'web3 not initialized yet', success: false };
    }

    // Find best route
    const uniswapPair = new UniswapPair({
      fromTokenContractAddress: plannedOrder.fromToken.id,
      toTokenContractAddress: plannedOrder.toToken.id,
      ethereumAddress: address,
      ethereumProvider: web3Service.getExternalProvider(),
      settings: new UniswapPairSettings({
        // if not supplied it will use `0.005` which is 0.5%
        // please pass it in as a full number decimal so 0.7%
        // would be 0.007
        slippage: 0.005,
        // if not supplied it will use 20 a deadline minutes
        deadlineMinutes: 20,
        // if not supplied it will try to use multihops
        // if this is true it will require swaps to direct
        // pairs
        disableMultihops: false,
        // for example if you only wanted to turn on quotes for v3 and not v3
        // you can only support the v3 enum same works if you only want v2 quotes
        // if you do not supply anything it query both v2 and v3
        uniswapVersions: versions,
        useWETHAsERC20Route: true,
      }),
    });
    const factory = await uniswapPair.createFactory();
    const formattedInput = reduceDecimals(plannedOrder.sendAmount, plannedOrder.fromToken.decimals);
    const currentBalance = await factory.getFromTokenBalance();
    console.log(currentBalance);
    if (
      fixedToBigNumber(formattedInput, plannedOrder.fromToken.decimals).gt(
        utils.parseUnits(currentBalance, plannedOrder.fromToken.decimals)
      )
    ) {
      return { message: 'Trying to sell more than the portfolio has!', success: false };
    }

    const result = await factory.findBestRoute(formattedInput.toString(), TradeDirection.input);
    console.log(result.bestRouteQuote);
    const fromBn = utils.parseUnits(formattedInput.toString(), plannedOrder.fromToken.decimals);

    const outputFixed = FixedNumber.fromString(result.bestRouteQuote.expectedConvertQuote);
    // Allow a bit less tokens to come out of the swap, otherwise it fails too often
    const minOutput = reduceDecimals(
      outputFixed.mulUnsafe(FixedNumber.from('0.99')),
      plannedOrder.toToken.decimals
    );
    const toBn = fixedToBigNumber(minOutput, plannedOrder.toToken.decimals);

    return {
      fromAmount: fromBn,
      minimummToAmount: toBn,
      estimatedToAmount: fixedToBigNumber(outputFixed, plannedOrder.toToken.decimals),
      path: result.bestRouteQuote.routePathArray,
      pair: factory,
    };
  }

  public async execute(plannedOrder: PlannedOrder): Promise<TransactionResult> {
    const plan = await this.planUniswap(plannedOrder, [UniswapVersion.v2, UniswapVersion.v3]);
    if (isTransactionResult(plan)) {
      return plan;
    }
    // This doesn't do anything with the plan generated before, can be made more efficient.
    const tradeContext = await plan.pair.trade(
      reduceDecimals(plannedOrder.sendAmount, plannedOrder.fromToken.decimals).toString(),
      TradeDirection.input
    );
    try {
      if (tradeContext.approvalTransaction) {
        const approvedTx = await web3Service
          .getSigner()
          .sendTransaction(tradeContext.approvalTransaction);
        const approvedReceipt = await approvedTx.wait();
        console.log(approvedReceipt);
      }
      const tx = await web3Service.getSigner().sendTransaction(tradeContext.transaction);
      const receipt = await tx.wait();
      console.log(receipt);
    } finally {
      tradeContext.destroy();
    }
    return {
      message: 'Success!',
      success: true,
    };
  }

  public async executeForEnzyme(plannedOrder: PlannedOrder): Promise<TransactionResult> {
    // TODO: also support v3 for enzyme
    const plan = await this.planUniswap(plannedOrder, [UniswapVersion.v2]);
    if (isTransactionResult(plan)) {
      return plan;
    }
    return enzymeService.executeUniswapV2Trade(plan.path, plan.minimummToAmount, plan.fromAmount);
  }
}

// --- stuff for thegraph uniswap ---

const endpoint = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
function gql(endpoint: string): Sdk {
  return getSdk(new GraphQLClient(endpoint));
}

type TokenPriceData = Pick<Token, 'id' | 'symbol' | 'name' | 'derivedETH'>;
export async function getTokenPrices(addresses: string[]): Promise<Record<string, TokenPriceData>> {
  // thegraph only returns results for lowercased addresses.
  const queryResult = await gql(endpoint).tokenPrice({
    addressList: addresses.map((addr) => addr.toLowerCase()),
  });
  const asMap = queryResult.tokens.reduce((map: Record<string, TokenPriceData>, token) => {
    map[token.id] = token;
    return map;
  }, {});
  // Make sure that the caller can retrieve items with the same cast IDs as he called us with
  const result: Record<string, TokenPriceData> = {};
  addresses.forEach((addr) => {
    result[addr] = asMap[addr.toLowerCase()];
  });
  return result;
}

const uniswapService = new UniswapService();

export { uniswapService };
