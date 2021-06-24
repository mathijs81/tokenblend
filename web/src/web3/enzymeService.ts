import { getFunds } from '@/data/enzymegraph';
import { reactive, watch } from 'vue';
import { web3Service } from './web3Service';

export interface Fund {
  id: string;
  name: string;
}

export interface EnzymeStatus {
  funds: Fund[];
}

class EnzymeService {
  private state: EnzymeStatus = reactive({
    funds: [],
  }) as EnzymeStatus;

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
          });
        }
      }
    );
  }

  public getFunds(): Fund[] {
    return [...this.state.funds];
  }
}

const enzymeService = new EnzymeService();

export { enzymeService };
