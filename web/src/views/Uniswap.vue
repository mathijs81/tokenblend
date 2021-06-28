<template>
  <div class="home">
    <h3>uniswap</h3>
    {{ state.address }}: {{ state.balance }} ETH

    <template v-if="best">
      <h2>Route</h2>
      <p>{{ best.expectedConvertQuote }}</p>
      <p>{{ best.routeText }}</p>
      <p>uniswap {{ best.uniswapVersion }}</p>

      <button class="ms-2 btn btn-primary" @click="trade">Trade</button>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { web3Service } from '@/web3/web3Service';
import { getDefaultProvider } from '@ethersproject/providers';

import { asyncComputed } from '@vueuse/core';
import {
  UniswapPair,
  ChainId,
  UniswapVersion,
  UniswapPairSettings,
  TradeDirection,
} from 'simple-uniswap-sdk';

export default defineComponent({
  name: 'Uniswap',
  setup() {
    const localhostProvider = getDefaultProvider('http://localhost:8545');

    const result = asyncComputed(async () => {
      const status = web3Service.status();
      if (status.initializing || !status.address) {
        return null;
      }
      const uniswapPair = new UniswapPair({
        // the contract address of the token you want to convert FROM
        fromTokenContractAddress: '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b', // FUNFAIR
        // the contract address of the token you want to convert TO
        toTokenContractAddress: '0x1985365e9f78359a9B6AD760e32412f4a445E862', // AUGUR
        // the ethereum address of the user using this part of the dApp
        ethereumAddress: status.address,
        chainId: ChainId.MAINNET,
        // you can pass in the provider url as well if you want
        // providerUrl: YOUR_PROVIDER_URL,
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
          uniswapVersions: [UniswapVersion.v2, UniswapVersion.v3],
        }),
      });
      const factory = await uniswapPair.createFactory();
      console.log(factory);
      const result = await factory.findBestRoute('20', TradeDirection.input);
      console.log(result);
      return result;
    });

    return {
      result,
      best: computed(() => result?.value?.bestRouteQuote),
      state: web3Service.status(),
    };
  },
  methods: {
    trade() {
      console.log('trade ' + web3Service.status().balance);
    },
  },
});
</script>
