<template>
  <div v-if="state.connected">
    <h2>{{ state.address }}</h2>
    <div class="row">
      <div>
        {{ distributionText }}
        <button class="btn btn-primary float-end" @click="execute" v-if="orderVisible">
          Execute
        </button>
      </div>
      <div class="col">
        <SliderPanel :tokenData="tokenData" v-model="distribution" :withStaking="true" />
      </div>
    </div>
    <OrderPlanDialog v-model:visible="orderDialogVisible" :orderPlan="orderPlan" />
  </div>
  <div v-else>Loading...</div>
</template>

<script lang="ts">
import OrderPlanDialog from '@/components/OrderPlanDialog.vue';
import SliderPanel from '@/components/SliderPanel.vue';
import { defaultOrderPlanner, PlannedOrder } from '@/orderplan/orderplan';
import { calcSliderChangeResult } from '@/util/sliderUtil';
import { fetchTokens } from '@/util/tokenlist';
import { calcPercentageMap, getTokenBalance, TokenData } from '@/util/tokens';
import { getTokenPrices } from '@/web3/uniswapService';
import { idleService } from '@/web3/idleService';
import { web3Service } from '@/web3/web3Service';
import { asyncComputed } from '@vueuse/core';
import { BigNumber, FixedNumber } from 'ethers';
import { defineComponent, ref, Ref, watchEffect } from 'vue';
import { reduceTokens, wrapDeposits } from '@/util/stakedTokens';

export default defineComponent({
  setup() {
    const tokenList = asyncComputed(() => fetchTokens(), []);
    const tokenData: Ref<TokenData[]> = ref([]);
    const distribution: Ref<Record<string, number>> = ref({});
    const startingDistribution: Ref<Record<string, number>> = ref({});
    const idleTokenList = asyncComputed(() => idleService.getTokenData());

    // TODO: native ETH is not shown now (only WETH)

    watchEffect(async () => {
      const account = web3Service.status().address;
      const tokens = tokenList.value;
      const idleTokens = idleTokenList.value;
      // Look up all balances and create TokenData
      const balances = tokens.map((token) => {
        if (account) {
          return getTokenBalance(token.address, account);
        } else {
          return Promise.resolve(BigNumber.from('0'));
        }
      });
      const usdAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI stablecoin
      const tokenPriceMap = getTokenPrices(tokens.map((token) => token.address));
      const tokenPrices = await tokenPriceMap;
      const multiplier = 1.0 / (tokenPrices[usdAddress]?.derivedETH ?? 1.0);

      let index = -1;
      let basicTokens = await Promise.all(
        tokens.map(async (tokenInfo) => {
          index++;
          let value =
            parseFloat(tokenPrices[tokenInfo.address]?.derivedETH ?? '0.0001') * multiplier;
          if (value == 0.0) {
            value = 0.0001 * multiplier;
          }
          return {
            id: tokenInfo.address,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            ownedAmount: FixedNumber.fromValue(await balances[index], tokenInfo.decimals),
            value: value,
            logoUri: tokenInfo.logoURI,
          } as TokenData;
        })
      );
      if (basicTokens.length > 0 && idleTokens) {
        basicTokens.push(...idleTokens);
        basicTokens = reduceTokens(basicTokens);
      }
      tokenData.value = basicTokens.sort(
        (a, b) => b.value * b.ownedAmount.toUnsafeFloat() - a.value * a.ownedAmount.toUnsafeFloat()
      );
      distribution.value = calcPercentageMap(tokenData.value);
      startingDistribution.value = Object.assign({}, distribution.value);
    });

    const orderVisible = ref(false);
    const distributionText = ref('');
    watchEffect(() => {
      const result = calcSliderChangeResult(distribution.value, startingDistribution.value);
      orderVisible.value = result.hasChanges;
      distributionText.value = result.message;
    });
    const orderDialogVisible = ref(false);
    const orderPlan: Ref<PlannedOrder[]> = ref([]);
    const execute = () => {
      console.log(tokenData.value);
      console.log('stakedUnderlyingValue' in tokenData.value[0]);
      const plan = defaultOrderPlanner.createPlan(tokenData.value, distribution.value);
      const withStakingPlan = wrapDeposits(tokenData.value, plan, idleService.supportedSymbols());
      orderPlan.value = withStakingPlan;
      orderDialogVisible.value = true;
    };

    const state = web3Service.status();
    return {
      state,
      tokenData,
      distribution,
      orderVisible,
      distributionText,
      execute,
      orderDialogVisible,
      orderPlan,
    };
  },
  components: { SliderPanel, OrderPlanDialog },
  methods: {},
});
</script>

<style lang="scss" scoped>
.logo-img {
  width: 2rem;
  height: 2rem;
}
</style>
