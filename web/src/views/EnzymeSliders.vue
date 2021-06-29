<template>
  <div>
    <h3>Asset distribution</h3>
    {{ distributionText }}
    <button class="btn btn-primary float-end" @click="plan" v-if="orderVisible">Execute</button>
    <div>
      <SliderPanel :tokenData="tokens" v-model="distribution" />
    </div>
    <Dialog header="Order plan" v-model:visible="displayPlan">
      <div
        v-for="order in orderPlan"
        v-bind:key="order.sendAmount + order.fromToken.name"
        class="row"
      >
        <div class="col-9">
          {{ order.sendAmount.toString() }} {{ order.fromToken.name }} =>
          {{ order.toToken.name }}
        </div>
        <div class="col-3">
          <button class="btn btn-primary" @click="execute(order)">Execute</button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script lang="ts">
import SliderPanel from '@/components/SliderPanel.vue';
import { getTokens } from '@/data/enzymegraph';
import { defaultOrderPlanner, PlannedOrder } from '@/orderplan/orderplan';
import { calcPercentageMap, TokenData } from '@/util/tokens';
import { enzymeService, Fund } from '@/web3/enzymeService';
import { uniswapService } from '@/web3/uniswapService';
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
      const namesOnly: TokenData[] = tokenRequestResult.assets
        // // not sure why, the bot example code also filters for this
        // .filter((asset) => !asset.derivativeType)
        .map((asset) => ({
          id: asset.id.toLowerCase(),
          name: asset.name,
          value: parseFloat(asset.price?.price ?? '-1'),
          ownedAmount: 0.0,
          decimals: asset.decimals,
        }));
      return namesOnly;
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

          tokens.value = tokenList
            .map((token) => {
              let value = token.value;
              if (value < 0) {
                // TODO: look up value on uniswap
                value = 1.0;
              }
              let owned = 0.0;
              const ownedBigNumber = assetMap[token.id];
              if (ownedBigNumber) {
                owned = FixedNumber.fromValue(ownedBigNumber, token.decimals).toUnsafeFloat();
              }
              return {
                ...token,
                ownedAmount: owned,
                value: value,
              };
            })
            .sort((a, b) => b.value * b.ownedAmount - a.value * a.ownedAmount);
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
      let valueChange = 0.0;
      let tokensChanged = 0;
      let tokensTotal = 0;
      Object.entries(distribution.value).forEach((entry) => {
        const original = startingDistribution.value[entry[0]] ?? 0.0;
        if (entry[1] > 0 || original > 0) {
          valueChange += Math.abs(entry[1] - original);
          tokensTotal++;
          if (entry[1] != original) {
            tokensChanged++;
          }
        }
      });
      orderVisible.value = tokensChanged > 0;
      distributionText.value = `${tokensChanged} / ${tokensTotal} changed, ${valueChange.toFixed(
        1
      )} % total portfolio adjustment.`;
    });

    const displayPlan = ref(false);
    const orderPlan: Ref<PlannedOrder[]> = ref([]);

    const plan = () => {
      orderPlan.value = defaultOrderPlanner.createPlan(tokens.value, distribution.value);
      displayPlan.value = true;
    };

    const execute = async (order: PlannedOrder) => {
      try {
        const result = await uniswapService.executeForEnzyme(order);
        if (result.success) {
          alert(`Success! ${result.message}`);
        } else {
          alert(`Failure. ${result.message}`);
        }
      } catch (error) {
        let message = error;
        if (error['message']) {
          message = error['message'];
        }
        alert(`There was a problem: ${message}`);
      }
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
      execute,
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
