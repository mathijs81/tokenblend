<template>
  <div>
    <h3>Asset distribution</h3>
    {{ distributionText }}
    <button class="btn btn-primary float-end" @click="plan" v-if="orderVisible">Execute</button>
    <div>
      <SliderPanel :tokenData="tokens" v-model="distribution" />
    </div>
    <OrderPlanDialog v-model:visible="displayPlan" :orderPlan="orderPlan" :isEnzyme="true" />
  </div>
</template>

<script lang="ts">
import OrderPlanDialog from '@/components/OrderPlanDialog.vue';
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { defaultOrderPlanner, PlannedOrder } from '@/orderplan/orderplan';
import { calcSliderChangeResult } from '@/util/sliderUtil';
import { calcPercentageMap, TokenData } from '@/util/tokens';
import { enzymeService, Fund } from '@/web3/enzymeService';
import { Provider, web3Service } from '@/web3/web3Service';
import { StandardToken, VaultLib } from '@enzymefinance/protocol';
import { asyncComputed } from '@vueuse/core';
import { BigNumber, FixedNumber } from 'ethers';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';

async function trackAssets(
  address: string,
  provider: Provider
): Promise<Record<string, BigNumber>> {
  const lib = new VaultLib(address, web3Service.getProvider());
  const holdings = await lib.getTrackedAssets();
  const tokenMap: Record<string, BigNumber> = {};
  await Promise.all(
    holdings.map((token) => {
      const tokenContract = new StandardToken(token, provider);
      return tokenContract.balanceOf
        .args(address)
        .call()
        .then((value) => (tokenMap[token.toLowerCase()] = value));
    })
  );
  return tokenMap;
}

export default defineComponent({
  name: 'EnzymeSliders',
  setup() {
    // TODO: if we keep using this, add a filtering textbox to quickly filter on substring of names as
    // there are very many tokens listed.
    const partialTokens: Ref<TokenData[]> = asyncComputed(async () => {
      const tokenRequestResult = await getTokens(web3Service.isMainnet());
      const asTokenData: TokenData[] = tokenRequestResult.assets
        // not sure why, the bot example code also filters for this
        .filter((asset) => !asset.derivativeType)
        .map((asset) => ({
          id: asset.id.toLowerCase(),
          name: asset.name,
          symbol: asset.symbol,
          value: parseFloat(asset.price?.price ?? '-1'),
          ownedAmount: FixedNumber.from('0'),
          decimals: asset.decimals,
        }));
      return asTokenData;
    });

    const tokens: Ref<TokenData[]> = ref([]);
    const distribution: Ref<Record<string, number>> = ref({});
    const startingDistribution: Ref<Record<string, number>> = ref({});

    const funds = computed(() => enzymeService.getFunds());
    const selectFund = (fund: Fund) => enzymeService.selectFund(fund);

    watchEffect(async () => {
      const fund = enzymeService.status().selectedFund;
      const tokenList = partialTokens.value;
      if (tokenList) {
        if (fund) {
          const assetMap = await trackAssets(fund.id, web3Service.getProvider());
          const daiValue = tokenList.find(token => token.symbol == "DAI")?.value ?? 1.0;
          tokens.value = tokenList
            .map((token) => {
              let value = token.value / daiValue;
              if (value < 0) {
                // TODO: look up value on uniswap
                value = 1.0;
              }
              let owned = token.ownedAmount;
              const ownedBigNumber = assetMap[token.id];
              if (ownedBigNumber) {
                owned = FixedNumber.fromValue(ownedBigNumber, token.decimals);
              }
              return {
                ...token,
                ownedAmount: owned,
                value: value,
              };
            })
            .sort(
              (a, b) =>
                b.value * b.ownedAmount.toUnsafeFloat() - a.value * a.ownedAmount.toUnsafeFloat()
            );
          distribution.value = calcPercentageMap(tokens.value);
          startingDistribution.value = Object.assign({}, distribution.value);
        } else {
          tokens.value = tokenList;
        }
      }
    });

    const orderVisible = ref(false);
    const distributionText = ref('');
    watchEffect(() => {
      const result = calcSliderChangeResult(distribution.value, startingDistribution.value);
      orderVisible.value = result.hasChanges;
      distributionText.value = result.message;
    });

    const displayPlan = ref(false);
    const orderPlan: Ref<PlannedOrder[]> = ref([]);

    const plan = () => {
      orderPlan.value = defaultOrderPlanner.createPlan(tokens.value, distribution.value);
      displayPlan.value = true;
    };
    return {
      tokens,
      distribution,
      funds,
      state: web3Service.status(),
      selectFund,
      enzymeState: enzymeService.status(),
      distributionText,
      plan,
      displayPlan,
      orderPlan,
      orderVisible,
    };
  },
  components: { SliderPanel, OrderPlanDialog },
});
</script>

<style lang="scss" scoped>
.selected {
  color: #333;
  text-decoration: none;
}
</style>
