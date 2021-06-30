import { getSdk, Sdk, Token } from '@/data/uniswap_subgraph';
import { PlannedOrder } from '@/orderplan/orderplan';
import { reduceDecimals } from '@/util/numbers';
import { FixedNumber, utils } from 'ethers';
import { GraphQLClient } from 'graphql-request';
import {
  ChainId,
  TradeDirection,
  UniswapPair,
  UniswapPairSettings,
  UniswapVersion,
} from 'simple-uniswap-sdk';
import { enzymeService } from './enzymeService';
import { web3Service } from './web3Service';

export interface TransactionResult {
  message: string;
  success: boolean;
}

class UniswapService {
  public execute(plannedOrder: PlannedOrder) {
    // nothing (yet)
    console.log(plannedOrder);
  }

  public async executeForEnzyme(plannedOrder: PlannedOrder): Promise<TransactionResult> {
    let chainId = ChainId.MAINNET;
    if (!web3Service.isMainnet()) {
      chainId = ChainId.KOVAN;
    }
    const address = web3Service.status().address;
    if (address === undefined) {
      return { message: 'web3 not initialized yet', success: false };
    }

    // Find best route
    const uniswapPair = new UniswapPair({
      fromTokenContractAddress: plannedOrder.fromToken.id,
      toTokenContractAddress: plannedOrder.toToken.id,
      // the ethereum address of the user using this part of the dApp
      ethereumAddress: address,
      chainId: chainId,
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
        uniswapVersions: [UniswapVersion.v2], // TODO: also support v3 for enzyme , UniswapVersion.v3],
      }),
    });
    const factory = await uniswapPair.createFactory();
    const formattedInput = reduceDecimals(plannedOrder.sendAmount, plannedOrder.fromToken.decimals);
    const result = await factory.findBestRoute(formattedInput.toString(), TradeDirection.input);
    console.log(result.bestRouteQuote.expectedConvertQuote);
    const fromBn = utils.parseUnits(formattedInput.toString(), plannedOrder.fromToken.decimals);

    // Allow a bit less tokens to come out of the swap, otherwise it fails too often
    const targetOutput = FixedNumber.fromString(
      result.bestRouteQuote.expectedConvertQuote
    ).mulUnsafe(FixedNumber.from('0.99'));
    const toBn = utils.parseUnits(
      reduceDecimals(targetOutput, plannedOrder.toToken.decimals).toString(),
      plannedOrder.toToken.decimals
    );

    console.log(result, fromBn, toBn);

    return enzymeService.executeUniswapV2Trade(result.bestRouteQuote.routePathArray, toBn, fromBn);
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
