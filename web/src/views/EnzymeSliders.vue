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
      <SliderPanel :tokens="tokens" />
    </div>
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import { asyncComputed } from '@vueuse/core';
import { web3Service, Provider } from '@/web3/web3Service';
import { enzymeService, Fund } from '@/web3/enzymeService';
import { StandardToken, VaultLib } from '@enzymefinance/protocol';
import { BigNumber } from 'ethers';
import { TokenData } from '@/util/tokens';

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
    const partialTokens: Ref<TokenData[]> = asyncComputed(async () => {
      const tokenRequestResult = await getTokens(web3Service.isProd());
      const namesOnly: TokenData[] = tokenRequestResult.assets
        // not sure why, the bot example code also filters for this
        .filter((asset) => !asset.derivativeType)
        .map((asset) => ({
          id: asset.id,
          name: asset.name,
          value: asset.price?.price ?? -1,
          ownedAmount: Math.random(),
        }));
      return namesOnly;
    });

    const tokens: Ref<TokenData[]> = computed(() => {
      if (partialTokens.value) {
        return partialTokens.value.map((partialToken) => {
          let value = partialToken.value;
          if (value < 0) {
            // TODO: look up value on uniswap
            value = 1.0;
          }
          // TODO: look up actual owned amount
          let owned = Math.random();
          return {
            id: partialToken.id,
            name: partialToken.name,
            ownedAmount: owned,
            value: value,
          };
        });
      } else {
        return [];
      }
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
