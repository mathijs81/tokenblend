import { ExternalProvider } from '@ethersproject/providers';
import detectEthereumProvider from '@metamask/detect-provider';
import { reactive, readonly } from '@vue/reactivity';
import { ethers, utils } from 'ethers';

type Provider = ethers.providers.Web3Provider;

async function getProvider(): Promise<Provider> {
  const ethProvider = (await detectEthereumProvider({
    timeout: 1000,
  })) as ExternalProvider;
  const ethereum = window.ethereum as ExternalProvider | undefined;

  let provider = null;
  if (ethProvider) {
    if (ethProvider !== ethereum) {
      console.error('Do you have multiple wallets installed?');
    }
    console.log('Returning web3 based on metamask detection');
    provider = ethProvider;
  }
  if (ethereum) {
    console.log('Returning web3 based on window.ethereum');
    provider = ethereum;
  }
  if (!provider) {
    throw Error('No ethereum accounts found, install metamask or brave crypto wallet');
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await provider.request!({ method: 'eth_requestAccounts' });
  } catch (err) {
    console.log(err);
    // Try ethereum.enable as fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as unknown as any).enable();
    } catch (err) {
      console.log("enable also didn't work", err);
    }
  }
  return new ethers.providers.Web3Provider(provider);
}

export interface Web3Status {
  initializing: boolean;
  connected?: boolean;
  network?: string;
  chainId?: number;
  address?: string;
  balance?: string;
}

class Web3Service {
  private provider?: Provider;
  private state: Web3Status = reactive({
    initializing: true,
  }) as Web3Status;
  private copy = readonly(this.state);
  private intervalHandler?: number;

  public status(): Web3Status {
    return this.copy;
  }

  public isProd(): boolean {
    return this.state.network !== 'kovan';
  }

  private async updateData() {
    if (this.provider !== undefined) {
      let block;
      try {
        block = await this.provider.getBlock('latest');
        console.log(`updating for block ${block.number}`);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('underlying network changed')) {
            // network changed, reconnect metamask
            this.init();
            return;
          }
        }
        console.log(err);
        return;
      }
      const network = await this.provider.getNetwork();
      this.state.network = network.name;
      this.state.chainId = network.chainId;
      console.log(`connected to ${this.state.network}`);
      const accounts = await this.provider.listAccounts();
      this.state.connected = accounts.length > 0;
      if (accounts.length > 0) {
        this.state.address = accounts[0];
        this.state.balance = utils.formatEther(await this.provider.getBalance(accounts[0]));
      }
    } else {
      console.log('no web3');
    }
  }

  public init(errorCallback?: (message: string) => void) {
    if (!this.state.connected) {
      this.state.initializing = true;
    }
    return getProvider()
      .then(async (provider) => {
        this.provider = provider;
        await this.provider.getSigner();
        if (this.intervalHandler === undefined) {
          this.intervalHandler = window.setInterval(() => this.updateData(), 2000);
        }
        this.updateData();
      })
      .catch((error) => {
        console.log(error);
        if (errorCallback) {
          errorCallback(error.message);
        }
      })
      .finally(() => (this.state.initializing = false));
  }
}

const web3Service = new Web3Service();

export { web3Service };
