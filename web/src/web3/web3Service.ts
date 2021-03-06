import { ExternalProvider } from '@ethersproject/providers';
import detectEthereumProvider from '@metamask/detect-provider';
import { reactive, readonly } from '@vue/reactivity';
import { ethers, utils, Signer } from 'ethers';

export type Provider = ethers.providers.Web3Provider;

async function getProvider(): Promise<ExternalProvider> {
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
    if (err.message && err.message.includes('rejected')) {
      throw err;
    }
    // Try ethereum.enable as fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (provider as unknown as any).enable();
    } catch (err) {
      console.log("enable also didn't work", err);
      throw err;
    }
  }
  return provider;
}

export interface Web3Status {
  initializing: boolean;
  connected?: boolean;
  providerPresent: boolean;
  lastErrorMessage?: string;
  network?: string;
  chainId?: number;
  address?: string;
  balance?: string;
}

class Web3Service {
  private externalProvider?: ExternalProvider;
  private provider?: Provider;
  private signer?: Signer;
  private state: Web3Status = reactive({
    initializing: true,
    providerPresent: false,
  }) as Web3Status;
  private copy = readonly(this.state);
  private intervalHandler?: number;

  public getProvider(): Provider {
    if (!this.provider) {
      throw 'Provider not initialized';
    }
    return this.provider;
  }
  public getExternalProvider(): ExternalProvider {
    if (!this.externalProvider) {
      throw 'Provider not initialized';
    }
    return this.externalProvider;
  }

  public getSigner(): Signer {
    if (!this.signer) {
      throw 'Signer not initialized';
    }
    return this.signer;
  }

  public status(): Web3Status {
    return this.copy;
  }

  public isMainnet(): boolean {
    return this.state.network !== 'kovan';
  }

  private async updateData() {
    if (this.provider !== undefined) {
      this.state.providerPresent = true;
      try {
        await this.provider.getBlock('latest');
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
      const accounts = await this.provider.listAccounts();
      this.state.connected = accounts.length > 0;
      if (accounts.length > 0) {
        this.state.address = accounts[0];
        this.state.balance = utils.formatEther(await this.provider.getBalance(accounts[0]));
      }
    } else {
      this.state.providerPresent = false;
      console.log('no web3');
    }
  }

  public init(errorCallback?: (message: string) => void) {
    if (!this.state.connected) {
      this.state.initializing = true;
    }
    this.state.lastErrorMessage = undefined;
    return getProvider()
      .then(async (externalProvider) => {
        this.externalProvider = externalProvider;
        const provider = new ethers.providers.Web3Provider(externalProvider);
        this.provider = provider;
        this.signer = await this.provider.getSigner();
        if (this.intervalHandler === undefined) {
          this.intervalHandler = window.setInterval(() => this.updateData(), 2000);
        }
        await this.updateData();
      })
      .catch((error) => {
        console.log(error);
        this.state.lastErrorMessage = error.message;
        if (errorCallback) {
          errorCallback(error.message);
        }
      })
      .finally(() => (this.state.initializing = false));
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function extractErrorMessage(error: any): string {
  let message = error;
  if (error['message']) {
    message = error['message'];
  }
  if (message === 'Internal JSON-RPC error.') {
    // Try to get more useful message from metamask object
    const alternativeMessage = error.data?.message;
    if (alternativeMessage) {
      message = alternativeMessage;
    }
  }
  return message;
}

const web3Service = new Web3Service();

export { web3Service };
