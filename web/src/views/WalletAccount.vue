<template>
  <div v-if="state.connected">
    <h2>{{ state.address }}</h2>
    <div class="row">
      <div class="col">
        <SliderPanel :tokenData="tokenData" />
      </div>
    </div>
  </div>
  <div v-else>Loading...</div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { fetchTokens } from '@/util/tokenlist';
import { getTokenBalance, TokenData } from '@/util/tokens';
import { web3Service } from '@/web3/web3Service';
import { asyncComputed } from '@vueuse/core';
import { ChainId, TokenFactoryPublic } from 'simple-uniswap-sdk';
import { defineComponent, ref, Ref, watchEffect } from 'vue';
import { BigNumber, utils } from 'ethers';

export default defineComponent({
  setup(props) {
    const tokenList = asyncComputed(() => fetchTokens(), []);
    const tokenData: Ref<TokenData[]> = ref([]);

    // TODO: native ETH is not shown now (only WETH)

    watchEffect(async () => {
      const account = web3Service.status().address;
      const tokens = tokenList.value;
      const balances = tokens.map((token) => {
        if (account) {
          return getTokenBalance(token.address, account);
        } else {
          return Promise.resolve(BigNumber.from('0'));
        }
      });
      // Look up all balances and create TokenData
      let index = -1;
      tokenData.value = (
        await Promise.all(
          tokens.map(async (tokenInfo) => {
            index++;
            return {
              id: tokenInfo.address,
              name: tokenInfo.name,
              decimals: tokenInfo.decimals,
              ownedAmount: parseFloat(utils.formatUnits(await balances[index], tokenInfo.decimals)),
              value: 0.0000001,
              logoUri: tokenInfo.logoURI,
            };
          })
        )
      ).sort((a, b) => b.value * b.ownedAmount - a.value * a.ownedAmount);
    });
    const state = web3Service.status();
    return { state, tokenData };
  },
  components: { SliderPanel },
});
</script>

<style lang="scss" scoped>
.logo-img {
  width: 2rem;
  height: 2rem;
}
</style>
