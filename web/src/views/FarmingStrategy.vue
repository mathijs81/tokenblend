<template>
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
  <div>
    <h3> Curve farming status on Enzyme </h3>
  </div>

  <div>
    <p> Your farming positions on Curve</p>
    <table>
    <tr>
      <th>Pool</th>
      <th>Owned</th>
      <th>Rewards</th>
      <th>Cost of claim and deposit</th>
      <th>Suggested Action</th>
    </tr>
    <tr v-for="item in tokens" :key="item.id" >
      <th scope="row">{{ item.name }}</th>
      <td> {{ item.ownedAmount }} </td>
      <td> 0.3 crv </td>
      <td> 0.03 eth </td>
      <td> - </td>
    </tr>
    </table>
  </div>

  <div>
    <p> Gas Price: {{gasPrice}} gwei</p>
  </div>

</template>

<script lang="ts">

/* eslint-disable vue/no-unused-components */
import FarmingStrategy from '@/components/Farming.vue'; // @ is an alias to /src
import { web3Service, Provider } from '@/web3/web3Service';
import { BigNumber, FixedNumber } from 'ethers';
import { StandardToken, VaultLib } from '@enzymefinance/protocol';
import { computed, defineComponent, Ref, ref, watchEffect } from 'vue';
import { calcPercentageMap, TokenData } from '@/util/tokens';
import {getGasPrice} from '@/util/getGasPrice';
import { getTokens } from '@/data/enzymegraph';
import { asyncComputed } from '@vueuse/core';
import { enzymeService, Fund } from '@/web3/enzymeService';

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
  name: 'FarmingStrategy',

  setup() {
      const partialTokens: Ref<TokenData[]> = asyncComputed(async () => {
      const tokenRequestResult = await getTokens(web3Service.isMainnet());
      const namesOnly: TokenData[] = tokenRequestResult.assets
        // not sure why, the bot example code also filters for this
        .filter((asset) => asset.derivativeType && asset.name.includes("Curve.fi"))
        .map((asset) => ({
          id: asset.id.toLowerCase(),
          name: asset.name,
          value: asset.price?.price ?? -1,
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
    const extraText = ref('');

    watchEffect(async () => {
      const fund = enzymeService.status().selectedFund;
      const tokenList = partialTokens.value;

      if (tokenList) {
        if (fund) {
          const assetMap = await trackAssets(fund.id, web3Service.getProvider());

          tokens.value = tokenList.map((token) => {
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
              value: value
            };
          });
          distribution.value = calcPercentageMap(tokens.value);
          startingDistribution.value = Object.assign({}, distribution.value);
        } else {
          tokens.value = tokenList;
        }
      }
    });
    /*
    watchEffect(async() => {
      const gasPrice = await getGasPrice(30);
      return{gasPrice}
    })*/
    const gasPrice = asyncComputed(() => getGasPrice(10));

    const distributionText = computed(() => {
      let msg = '';
      Object.entries(distribution.value).forEach((entry) => {
        const original = startingDistribution.value[entry[0]] ?? 0.0;
        if (entry[1] != original) {
          msg += `${entry[0]}: change ${entry[1] - original}\n`;
        }
      });
      return msg;
    });

    return {
      tokens,
      distribution,
      funds,
      state: web3Service.status(),
      selectFund,
      enzymeState: enzymeService.status(),
      distributionText,
      gasPrice
    };

  },

  components: {FarmingStrategy}

});
</script>