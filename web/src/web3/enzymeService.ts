import { getFunds } from '@/data/enzymegraph';
import { reactive, watch, readonly } from 'vue';
import { web3Service } from './web3Service';

export interface Fund {
  id: string;
  name: string;
}

export interface EnzymeStatus {
  funds: readonly Fund[];
  selectedFund: Fund | null;
}

class EnzymeService {
  private state: EnzymeStatus = reactive({
    funds: [],
    selectedFund: null,
  }) as EnzymeStatus;
  private copy = readonly(this.state);

  public status(): EnzymeStatus {
    return this.copy;
  }

  constructor() {
    watch(
      () => [web3Service.status().address, web3Service.status().network],
      () => {
        const addr = web3Service.status().address;
        console.log(`Reinitializing enzyme vaults with ${addr}`);
        if (addr) {
          getFunds(web3Service.isProd(), addr).then((funds) => {
            console.log(`Result from enzyme`, funds);
            this.state.funds = funds.funds.map((fund) => ({ id: fund.id, name: fund.name }));
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
}

const enzymeService = new EnzymeService();

export { enzymeService };
