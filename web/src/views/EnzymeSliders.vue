<template>
  <div>
    <div v-if="state.connected">
      <div v-if="funds.length > 0">
        <h3>Your funds</h3>
        <div v-for="fund in funds" v-bind:key="fund.id">
          <a
            href="#"
            @click="selectFund(fund)"
            :class="fund.id === enzymeState.selectedFund?.id ? 'selected' : ''"
          >
            <b>{{ fund.name }}</b> - <small>{{ fund.id }}</small>
          </a>
        </div>
      </div>
      <div v-else>{{ state.address }} has no enzyme funds</div>
    </div>
    <div>{{ extraText }}</div>
    <h3>All Enzyme assets</h3>
    <div>
      <SliderPanel :tokenNames="tokens" />
    </div>
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { computed, defineComponent, ref, watchEffect } from 'vue';
import { asyncComputed } from '@vueuse/core';
import { web3Service, Provider } from '@/web3/web3Service';
import { enzymeService, Fund } from '@/web3/enzymeService';
import { StandardToken, VaultLib } from '@enzymefinance/protocol';
import { BigNumber } from 'ethers';

async function trackAssets(address: string, provider: Provider): Promise<string> {
  const lib = new VaultLib(address, web3Service.getProvider());
  const holdings = await lib.getTrackedAssets();
  const tokenMap: Record<string, BigNumber> = {};
  await Promise.all(
    holdings.map((token) => {
      const tokenContract = new StandardToken(token, provider);
      return tokenContract.balanceOf
        .args(address)
        .call()
        .then((value) => (tokenMap[token] = value));
    })
  );

  return JSON.stringify(tokenMap);
}

export default defineComponent({
  name: 'EnzymeSliders',
  setup() {
    // TODO: if we keep using this, add a filtering textbox to quickly filter on substring of names as
    // there are very many tokens listed.
    const tokens = asyncComputed(async () => {
      const tokenRequestResult = await getTokens(web3Service.isProd());
      const namesOnly = tokenRequestResult.assets
        // not sure why, the bot example code also filters for this
        .filter((asset) => !asset.derivativeType)
        .map((asset) => asset.name);
      return namesOnly;
    });
    const funds = computed(() => enzymeService.getFunds());
    const selectFund = (fund: Fund) => enzymeService.selectFund(fund);
    const extraText = ref('');

    watchEffect(() => {
      const fund = enzymeService.status().selectedFund;
      if (fund) {
        trackAssets(fund.id, web3Service.getProvider()).then((msg) => (extraText.value = msg));
      }
    });

    return {
      tokens,
      funds,
      state: web3Service.status(),
      selectFund,
      enzymeState: enzymeService.status(),
      extraText,
    };
  },
  components: { SliderPanel },
});
</script>

<style lang="scss" scoped>
.selected {
  color: #333;
  text-decoration: none;
}
</style>
