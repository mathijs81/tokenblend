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
import { TokenData } from '@/util/tokens';
import { web3Service } from '@/web3/web3Service';
import { asyncComputed } from '@vueuse/core';
import { defineComponent, ref, Ref, watchEffect } from 'vue';

export default defineComponent({
  setup(props) {
    const tokenList = asyncComputed(() => fetchTokens(), []);
    const tokenData: Ref<TokenData[]> = ref([]);

    // TODO: native ETH is not shown now (only WETH)

    watchEffect(() => {
      const account = web3Service.status().address;
      const tokens = tokenList.value;
      // Look up all balances and create TokenData
      tokenData.value = tokens.map((tokenInfo) => {
        // TODO: lookup actual price & owned amounts
        return {
          id: tokenInfo.address,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          ownedAmount: 0.0,
          value: 0.0,
          logoUri: tokenInfo.logoURI,
        };
      });
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