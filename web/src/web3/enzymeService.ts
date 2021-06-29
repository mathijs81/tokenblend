import { getContracts, getFunds } from '@/data/enzymegraph';
import { Release } from '@/data/subgraph';
import {
  callOnIntegrationArgs,
  ComptrollerLib,
  IntegrationManagerActionId,
  takeOrderSelector,
  uniswapV2TakeOrderArgs,
} from '@enzymefinance/protocol';
import { BigNumber } from 'ethers';
import { reactive, readonly, watch } from 'vue';
import { TransactionResult } from './uniswapService';
import { web3Service } from './web3Service';

export interface Fund {
  id: string;
  name: string;
  comptrollerAddress: string;
}

export interface EnzymeStatus {
  funds: readonly Fund[];
  selectedFund: Fund | null;
  contracts: Promise<Release>;
}

class EnzymeService {
  private state: EnzymeStatus = reactive({
    funds: [],
    selectedFund: null,
    contracts: getContracts(),
  }) as EnzymeStatus;
  private copy = readonly(this.state);

  public status(): EnzymeStatus {
    return this.copy as EnzymeStatus;
  }

  constructor() {
    watch(
      () => [web3Service.status().address, web3Service.status().network],
      () => {
        const addr = web3Service.status().address;
        console.log(`Reinitializing enzyme vaults with ${addr}`);
        if (addr) {
          getFunds(web3Service.isMainnet(), addr).then((funds) => {
            console.log(`Result from enzyme`, funds);
            this.state.funds = funds.funds.map((fund) => ({
              id: fund.id,
              name: fund.name,
              comptrollerAddress: fund.accessor.id,
            }));
            this.selectFundIfNeeded();
          });
        }
      }
    );
  }

  private selectFundIfNeeded() {
    if (
      this.state.selectedFund == null ||
      this.state.funds.every((fund) => fund.id !== this.state.selectedFund?.id)
    ) {
      if (this.state.funds.length == 1) {
        this.state.selectedFund = this.state.funds[0];
      } else {
        this.state.selectedFund = null;
      }
    }
  }

  public selectFund(fund: Fund) {
    this.state.selectedFund = fund;
  }

  public getFunds(): Fund[] {
    return [...this.state.funds];
  }

  public async executeUniswapV2Trade(
    route: string[],
    minIncomingAsset: BigNumber,
    minOutgoinAsset: BigNumber
  ): Promise<TransactionResult> {
    const selectedFund = this.state.selectedFund;
    if (!selectedFund) {
      return { message: 'no enzyme fund selected', success: false };
    }
    const contracts = await this.state.contracts;
    const adapterAddress = contracts.uniswapV2Adapter;
    const integrationAddress = contracts.integrationManager;

    const orderArgs = uniswapV2TakeOrderArgs({
      path: route,
      minIncomingAssetAmount: minIncomingAsset,
      outgoingAssetAmount: minOutgoinAsset,
    });
    const callArgs = callOnIntegrationArgs({
      adapter: adapterAddress,
      selector: takeOrderSelector,
      encodedCallArgs: orderArgs,
    });

    const contract = new ComptrollerLib(selectedFund.comptrollerAddress, web3Service.getSigner());
    const transaction = contract.callOnExtension.args(
      integrationAddress,
      IntegrationManagerActionId.CallOnIntegration,
      callArgs
    );
    const receipt = await transaction.send();
    return { message: `Transaction sent with hash ${receipt.transactionHash}`, success: true };
  }
}

const enzymeService = new EnzymeService();

export { enzymeService };
